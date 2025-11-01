import { Handle, Position, NodeProps } from 'reactflow';
import { GatewayNodeData } from '../../types/flow';
import { GitMerge, X } from 'lucide-react';
import { useReactFlow } from 'reactflow';

export function InclusiveGateway({ data, selected, id }: NodeProps<GatewayNodeData>) {
  const ruleCount = data.rules?.length || 0;
  const { deleteElements } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };
  
  return (
    <div className="relative group">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-purple-500 !w-3 !h-3"
        style={{ top: '50%' }}
      />
      <div
        className={`w-16 h-16 rotate-45 bg-purple-50 border-4 border-purple-500 flex items-center justify-center transition-all ${
          selected ? 'ring-2 ring-purple-400 ring-offset-2' : ''
        }`}
      >
        <div className="-rotate-45 flex flex-col items-center">
          <GitMerge className="w-5 h-5 text-purple-700" />
          <div className="text-xs text-purple-900 mt-0.5">O</div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!bg-purple-500 !w-3 !h-3"
        style={{ top: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!bg-purple-500 !w-3 !h-3"
        style={{ left: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-purple-500 !w-3 !h-3"
        style={{ left: '50%' }}
      />
      <button
        onClick={handleDelete}
        className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 z-10"
        title="删除节点"
      >
        <X className="w-3 h-3" />
      </button>
      <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-center whitespace-nowrap">
        {data.label && (
          <div className="text-xs text-purple-900">{data.label}</div>
        )}
        {ruleCount > 0 && (
          <div className="text-xs text-purple-600 mt-0.5">
            {ruleCount} 个规则
          </div>
        )}
      </div>
    </div>
  );
}
