import BpmnModdle from 'bpmn-moddle';
import { Node, Edge } from 'reactflow';
import { FlowNodeData, EdgeData, NodeType, Rule, OperatorType } from '../../types/flow';
import { getZeebeDescriptors, zeebeNamespace } from './zeebeDescriptors';

interface ValidationError {
  message: string;
  type: 'error' | 'warning';
}

export interface BpmnExportResult {
  success: boolean;
  xml?: string;
  errors?: ValidationError[];
}

export async function exportToBpmn(
  nodes: Node<FlowNodeData>[],
  edges: Edge<EdgeData>[]
): Promise<BpmnExportResult> {
  const errors: ValidationError[] = [];
  
  const validation = validateFlow(nodes, edges);
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  try {
    const moddle = new BpmnModdle({
      zeebe: getZeebeDescriptors(),
    });

    const processId = `Process_${Date.now()}`;
    const diagramId = `Diagram_${Date.now()}`;
    
    const flowElements: any[] = [];
    const diShapes: any[] = [];
    const diEdges: any[] = [];

    nodes.forEach((node) => {
      const element = createBpmnElement(node, moddle);
      if (element) {
        flowElements.push(element);
        
        const shape = createBpmnShape(node, element.id, moddle);
        if (shape) {
          diShapes.push(shape);
        }
      }
    });

    edges.forEach((edge) => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const element = createSequenceFlow(edge, sourceNode, moddle);
      if (element) {
        flowElements.push(element);
        
        const diEdge = createBpmnEdge(edge, element.id, nodes, moddle);
        if (diEdge) {
          diEdges.push(diEdge);
        }
      }
    });

    const process = moddle.create('bpmn:Process', {
      id: processId,
      isExecutable: true,
      flowElements,
    });

    const plane = moddle.create('bpmndi:BPMNPlane', {
      id: `Plane_${processId}`,
      bpmnElement: process,
      planeElement: [...diShapes, ...diEdges],
    });

    const diagram = moddle.create('bpmndi:BPMNDiagram', {
      id: diagramId,
      plane,
    });

    const definitions = moddle.create('bpmn:Definitions', {
      id: 'Definitions_1',
      targetNamespace: 'http://bpmn.io/schema/bpmn',
      exporter: 'React Flow BPMN Exporter',
      exporterVersion: '1.0.0',
      rootElements: [process],
      diagrams: [diagram],
    });

    const { xml } = await moddle.toXML(definitions, { format: true });

    return {
      success: true,
      xml,
    };
  } catch (error) {
    console.error('BPMN export error:', error);
    return {
      success: false,
      errors: [
        {
          message: `导出失败: ${error instanceof Error ? error.message : '未知错误'}`,
          type: 'error',
        },
      ],
    };
  }
}

function validateFlow(
  nodes: Node<FlowNodeData>[],
  edges: Edge<EdgeData>[]
): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  const startNodes = nodes.filter((n) => n.data.type === NodeType.START);
  if (startNodes.length === 0) {
    errors.push({
      message: '流程必须包含至少一个开始节点',
      type: 'error',
    });
  }

  const endNodes = nodes.filter((n) => n.data.type === NodeType.END);
  if (endNodes.length === 0) {
    errors.push({
      message: '流程必须包含至少一个结束节点',
      type: 'error',
    });
  }

  const gatewayNodes = nodes.filter(
    (n) => n.data.type === NodeType.EXCLUSIVE_GATEWAY || n.data.type === NodeType.INCLUSIVE_GATEWAY
  );

  gatewayNodes.forEach((gateway) => {
    const outgoingEdges = edges.filter((e) => e.source === gateway.id);
    
    if (outgoingEdges.length < 2) {
      errors.push({
        message: `网关节点 "${gateway.data.label}" 必须至少有2条出边`,
        type: 'error',
      });
    }

    if (gateway.data.type === NodeType.EXCLUSIVE_GATEWAY) {
      const defaultEdges = outgoingEdges.filter((e) => e.data?.isDefault);
      const conditionEdges = outgoingEdges.filter((e) => e.data?.rule || e.data?.condition);
      
      if (defaultEdges.length === 0 && conditionEdges.length !== outgoingEdges.length) {
        errors.push({
          message: `排他网关 "${gateway.data.label}" 必须有一条默认分支，或者所有分支都有条件`,
          type: 'warning',
        });
      }
      
      if (defaultEdges.length > 1) {
        errors.push({
          message: `排他网关 "${gateway.data.label}" 只能有一条默认分支`,
          type: 'error',
        });
      }
    }
  });

  edges.forEach((edge) => {
    const sourceExists = nodes.some((n) => n.id === edge.source);
    const targetExists = nodes.some((n) => n.id === edge.target);
    
    if (!sourceExists || !targetExists) {
      errors.push({
        message: `连接线引用了不存在的节点`,
        type: 'error',
      });
    }
  });

  const criticalErrors = errors.filter((e) => e.type === 'error');
  return {
    isValid: criticalErrors.length === 0,
    errors,
  };
}

function createBpmnElement(node: Node<FlowNodeData>, moddle: BpmnModdle): any {
  const nodeId = `node_${node.id}`;
  
  switch (node.data.type) {
    case NodeType.START:
      return moddle.create('bpmn:StartEvent', {
        id: nodeId,
        name: node.data.label,
      });
      
    case NodeType.END:
      return moddle.create('bpmn:EndEvent', {
        id: nodeId,
        name: node.data.label,
      });
      
    case NodeType.TASK: {
      const taskDefinition = moddle.create('zeebe:TaskDefinition', {
        type: node.data.label.toLowerCase().replace(/\s+/g, '-'),
      });
      
      return moddle.create('bpmn:ServiceTask', {
        id: nodeId,
        name: node.data.label,
        extensionElements: moddle.create('bpmn:ExtensionElements', {
          values: [taskDefinition],
        }),
      });
    }
      
    case NodeType.EXCLUSIVE_GATEWAY:
      return moddle.create('bpmn:ExclusiveGateway', {
        id: nodeId,
        name: node.data.label,
      });
      
    case NodeType.INCLUSIVE_GATEWAY:
      return moddle.create('bpmn:InclusiveGateway', {
        id: nodeId,
        name: node.data.label,
      });
      
    default:
      return null;
  }
}

function createSequenceFlow(
  edge: Edge<EdgeData>,
  sourceNode: Node<FlowNodeData> | undefined,
  moddle: BpmnModdle
): any {
  const flowId = `flow_${edge.id}`;
  const sourceId = `node_${edge.source}`;
  const targetId = `node_${edge.target}`;
  
  const sequenceFlow: any = {
    id: flowId,
    sourceRef: { id: sourceId },
    targetRef: { id: targetId },
  };

  if (edge.data?.rule) {
    const expression = ruleToFeelExpression(edge.data.rule);
    sequenceFlow.name = edge.data.rule.name || expression;
    
    const conditionExpression = moddle.create('zeebe:ConditionExpression', {
      expression,
    });
    
    if (!sequenceFlow.extensionElements) {
      sequenceFlow.extensionElements = moddle.create('bpmn:ExtensionElements', {
        values: [],
      });
    }
    sequenceFlow.extensionElements.values.push(conditionExpression);
  } else if (edge.data?.condition?.expression) {
    sequenceFlow.name = edge.data.condition.description || edge.data.condition.expression;
    
    const conditionExpression = moddle.create('zeebe:ConditionExpression', {
      expression: edge.data.condition.expression,
    });
    
    if (!sequenceFlow.extensionElements) {
      sequenceFlow.extensionElements = moddle.create('bpmn:ExtensionElements', {
        values: [],
      });
    }
    sequenceFlow.extensionElements.values.push(conditionExpression);
  }

  if (edge.data?.isDefault && sourceNode) {
    const sourceElement = moddle.create('bpmn:ExclusiveGateway', {
      id: sourceId,
      default: { id: flowId },
    });
    sequenceFlow.name = sequenceFlow.name || '默认';
  }

  return moddle.create('bpmn:SequenceFlow', sequenceFlow);
}

function ruleToFeelExpression(rule: Rule): string {
  if (rule.conditions.length === 0) {
    return 'true';
  }

  const conditionExpressions = rule.conditions.map((condition) => {
    const field = condition.field;
    const value = typeof condition.value === 'string' ? `"${condition.value}"` : condition.value;
    
    switch (condition.operator) {
      case OperatorType.EQUAL:
        return `${field} = ${value}`;
      case OperatorType.NOT_EQUAL:
        return `${field} != ${value}`;
      case OperatorType.GREATER_THAN:
        return `${field} > ${value}`;
      case OperatorType.GREATER_THAN_OR_EQUAL:
        return `${field} >= ${value}`;
      case OperatorType.LESS_THAN:
        return `${field} < ${value}`;
      case OperatorType.LESS_THAN_OR_EQUAL:
        return `${field} <= ${value}`;
      case OperatorType.CONTAINS:
        return `contains(${field}, ${value})`;
      case OperatorType.NOT_CONTAINS:
        return `not(contains(${field}, ${value}))`;
      case OperatorType.STARTS_WITH:
        return `starts with(${field}, ${value})`;
      case OperatorType.ENDS_WITH:
        return `ends with(${field}, ${value})`;
      case OperatorType.IS_EMPTY:
        return `${field} = null`;
      case OperatorType.IS_NOT_EMPTY:
        return `${field} != null`;
      case OperatorType.IS_TRUE:
        return `${field} = true`;
      case OperatorType.IS_FALSE:
        return `${field} = false`;
      default:
        return `${field} = ${value}`;
    }
  });

  const combineOp = rule.combineOperation === 'AND' ? ' and ' : ' or ';
  return conditionExpressions.join(combineOp);
}

function createBpmnShape(node: Node<FlowNodeData>, elementId: string, moddle: BpmnModdle): any {
  const bounds = moddle.create('dc:Bounds', {
    x: node.position.x,
    y: node.position.y,
    width: node.data.type === NodeType.TASK ? 100 : 50,
    height: node.data.type === NodeType.TASK ? 80 : 50,
  });

  return moddle.create('bpmndi:BPMNShape', {
    id: `Shape_${elementId}`,
    bpmnElement: { id: elementId },
    bounds,
  });
}

function createBpmnEdge(
  edge: Edge<EdgeData>,
  elementId: string,
  nodes: Node<FlowNodeData>[],
  moddle: BpmnModdle
): any {
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const sourceX = sourceNode.position.x + 50;
  const sourceY = sourceNode.position.y + 25;
  const targetX = targetNode.position.x;
  const targetY = targetNode.position.y + 25;

  const waypoints = [
    moddle.create('dc:Point', { x: sourceX, y: sourceY }),
    moddle.create('dc:Point', { x: targetX, y: targetY }),
  ];

  return moddle.create('bpmndi:BPMNEdge', {
    id: `Edge_${elementId}`,
    bpmnElement: { id: elementId },
    waypoint: waypoints,
  });
}

export function downloadBpmn(xml: string, filename?: string) {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .slice(0, 15);
  
  const defaultFilename = `workflow-${timestamp}.bpmn`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
