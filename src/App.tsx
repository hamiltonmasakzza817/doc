import { useCallback, useState, useRef, DragEvent } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  MarkerType,
  EdgeProps,
  getBezierPath,
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { StartNode } from './components/nodes/StartNode';
import { EndNode } from './components/nodes/EndNode';
import { TaskNode } from './components/nodes/TaskNode';
import { ExclusiveGateway } from './components/nodes/ExclusiveGateway';
import { InclusiveGateway } from './components/nodes/InclusiveGateway';
import { Toolbar } from './components/Toolbar';
import { EdgeEditor } from './components/EdgeEditor';
import { PropertyPanel } from './components/PropertyPanel';
import { HelpPanel } from './components/HelpPanel';
import { ruleToFullString } from './utils/ruleUtils';
import { exportToBpmn, downloadBpmn } from './utils/bpmn/exportBpmn';
import {
  NodeType,
  GatewayType,
  EdgeData,
  FlowNodeData,
  ConditionExpression,
  Rule,
  OperatorType,
  DataType,
  CombineOperation,
} from './types/flow';

// 自定义边组件，显示条件
function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<EdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // 获取显示的标签文本
  const getLabel = () => {
    if (data?.rule) {
      return ruleToFullString(data.rule);
    }
    if (data?.condition) {
      return data.condition.description || data.condition.expression;
    }
    if (data?.isDefault) {
      return '默认';
    }
    return null;
  };

  const label = getLabel();
  const hasRule = !!(data?.rule || data?.condition);
  
  // 根据标签长度动态调整宽度
  const labelWidth = label ? Math.max(60, Math.min(200, label.length * 7)) : 60;

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: hasRule ? '#3b82f6' : data?.isDefault ? '#6b7280' : '#b1b1b7',
          strokeWidth: 2,
        }}
      />
      {label && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x={-labelWidth / 2}
            y={-12}
            width={labelWidth}
            height={24}
            fill="white"
            stroke={hasRule ? '#3b82f6' : '#6b7280'}
            strokeWidth={1}
            rx={4}
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            className="text-xs"
            fill={hasRule ? '#1e40af' : '#4b5563'}
            style={{
              maxWidth: labelWidth - 10,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </text>
        </g>
      )}
    </>
  );
}

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  task: TaskNode,
  exclusiveGateway: ExclusiveGateway,
  inclusiveGateway: InclusiveGateway,
};

const edgeTypes = {
  custom: CustomEdge,
};

const initialNodes: Node<FlowNodeData>[] = [
  {
    id: 'node_0',
    type: 'start',
    position: { x: 100, y: 200 },
    data: { type: NodeType.START, label: '开始' },
  },
  {
    id: 'node_1',
    type: 'exclusiveGateway',
    position: { x: 300, y: 180 },
    data: {
      type: NodeType.EXCLUSIVE_GATEWAY,
      label: '金额判断',
      gatewayType: GatewayType.EXCLUSIVE,
    },
  },
  {
    id: 'node_2',
    type: 'task',
    position: { x: 500, y: 100 },
    data: { type: NodeType.TASK, label: '大额审批' },
  },
  {
    id: 'node_3',
    type: 'task',
    position: { x: 500, y: 260 },
    data: { type: NodeType.TASK, label: '小额审批' },
  },
  {
    id: 'node_4',
    type: 'end',
    position: { x: 750, y: 200 },
    data: { type: NodeType.END, label: '结束' },
  },
];

const initialEdges: Edge<EdgeData>[] = [
  {
    id: 'edge_0',
    source: 'node_0',
    target: 'node_1',
    type: 'custom',
    markerEnd: { type: MarkerType.ArrowClosed },
    data: {},
  },
  {
    id: 'edge_1',
    source: 'node_1',
    target: 'node_2',
    type: 'custom',
    markerEnd: { type: MarkerType.ArrowClosed },
    data: {
      rule: {
        id: 'rule_1',
        name: '大额',
        conditions: [
          {
            id: 'cond_1',
            field: 'amount',
            operator: OperatorType.GREATER_THAN,
            value: 10000,
            dataType: DataType.NUMBER,
          },
        ],
        combineOperation: CombineOperation.AND,
        priority: 1,
      },
    },
  },
  {
    id: 'edge_2',
    source: 'node_1',
    target: 'node_3',
    type: 'custom',
    markerEnd: { type: MarkerType.ArrowClosed },
    data: {
      isDefault: true,
    },
  },
  {
    id: 'edge_3',
    source: 'node_2',
    target: 'node_4',
    type: 'custom',
    markerEnd: { type: MarkerType.ArrowClosed },
    data: {},
  },
  {
    id: 'edge_4',
    source: 'node_3',
    target: 'node_4',
    type: 'custom',
    markerEnd: { type: MarkerType.ArrowClosed },
    data: {},
  },
];

let id = 5;
const getId = () => `node_${id++}`;

function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<Edge<EdgeData> | null>(null);
  const [propertyPanelOpen, setPropertyPanelOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node<FlowNodeData> | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        type: 'custom',
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {} as EdgeData,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge<EdgeData>) => {
    setSelectedEdge(edge);
    setEditorOpen(true);
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<FlowNodeData>) => {
    setSelectedNode(node);
    setPropertyPanelOpen(true);
  }, []);

  const handleSaveCondition = useCallback(
    (condition?: ConditionExpression, rule?: Rule, isDefault?: boolean) => {
      if (selectedEdge) {
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === selectedEdge.id
              ? { 
                  ...edge, 
                  data: { 
                    ...edge.data, 
                    condition: condition || undefined,
                    rule: rule || undefined,
                    isDefault: isDefault || undefined,
                  } 
                }
              : edge
          )
        );
      }
      setSelectedEdge(null);
    },
    [selectedEdge, setEdges]
  );

  const handleSaveNodeProperties = useCallback(
    (nodeId: string, data: FlowNodeData) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data } : node
        )
      );
    },
    [setNodes]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      const gatewayType = event.dataTransfer.getData('gatewayType') as GatewayType | undefined;

      if (!type || !reactFlowWrapper.current || !reactFlowInstance) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      let data: FlowNodeData;
      
      switch (type) {
        case NodeType.START:
          data = { type: NodeType.START, label: '开始' };
          break;
        case NodeType.END:
          data = { type: NodeType.END, label: '结束' };
          break;
        case NodeType.TASK:
          data = { type: NodeType.TASK, label: '新任务' };
          break;
        case NodeType.EXCLUSIVE_GATEWAY:
          data = {
            type: NodeType.EXCLUSIVE_GATEWAY,
            label: '排他网关',
            gatewayType: GatewayType.EXCLUSIVE,
          };
          break;
        case NodeType.INCLUSIVE_GATEWAY:
          data = {
            type: NodeType.INCLUSIVE_GATEWAY,
            label: '包容网关',
            gatewayType: GatewayType.INCLUSIVE,
          };
          break;
        default:
          data = { type: NodeType.TASK, label: '新任务' };
      }

      const newNode: Node<FlowNodeData> = {
        id: getId(),
        type,
        position,
        data,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const clearCanvas = useCallback(() => {
    if (confirm('确定要清空画布吗？')) {
      setNodes([]);
      setEdges([]);
    }
  }, [setNodes, setEdges]);

  const exportFlow = useCallback(() => {
    const flow = {
      nodes,
      edges,
      timestamp: new Date().toISOString(),
    };
    const dataStr = JSON.stringify(flow, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `flow_${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [nodes, edges]);

  const importFlow = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const flow = JSON.parse(event.target?.result as string);
            setNodes(flow.nodes || []);
            setEdges(flow.edges || []);
          } catch (error) {
            alert('导入失败，文件格式不正确');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [setNodes, setEdges]);

  const exportBpmn = useCallback(async () => {
    const result = await exportToBpmn(nodes, edges);
    
    if (result.success && result.xml) {
      downloadBpmn(result.xml);
    } else if (result.errors) {
      const errorMessages = result.errors
        .map((err) => `- ${err.message}`)
        .join('\n');
      alert(`BPMN 导出失败:\n\n${errorMessages}`);
    }
  }, [nodes, edges]);

  return (
    <div className="w-full h-screen" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="bg-gray-50"
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'start':
                return '#22c55e';
              case 'end':
                return '#ef4444';
              case 'task':
                return '#3b82f6';
              case 'exclusiveGateway':
                return '#eab308';
              case 'inclusiveGateway':
                return '#a855f7';
              default:
                return '#94a3b8';
            }
          }}
        />
      </ReactFlow>

      <Toolbar
        onClear={clearCanvas}
        onExport={exportFlow}
        onImport={importFlow}
        onExportBpmn={exportBpmn}
      />

      <EdgeEditor
        isOpen={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setSelectedEdge(null);
        }}
        onSave={handleSaveCondition}
        initialCondition={selectedEdge?.data?.condition}
        initialRule={selectedEdge?.data?.rule}
        initialIsDefault={selectedEdge?.data?.isDefault}
      />

      <PropertyPanel
        isOpen={propertyPanelOpen}
        onClose={() => {
          setPropertyPanelOpen(false);
          setSelectedNode(null);
        }}
        node={selectedNode}
        onSave={handleSaveNodeProperties}
      />

      <HelpPanel />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
