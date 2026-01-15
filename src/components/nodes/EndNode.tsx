import { Handle, Position, NodeProps } from 'reactflow';
import { EndNodeData } from '../../types/flow';
import { StopCircle, X } from 'lucide-react';
import { useReactFlow } from 'reactflow';

export function EndNode({ data, selected, id }: NodeProps<EndNodeData>) {
  const { deleteElements } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div className="relative group">
      <div
        className={`px-4 py-3 rounded-full border-2 bg-red-50 border-red-500 transition-all ${
          selected ? 'ring-2 ring-red-400 ring-offset-2' : ''
        }`}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-red-500 !w-3 !h-3"
        />
        <div className="flex items-center gap-2">
          <StopCircle className="w-5 h-5 text-red-600" />
          <div className="text-red-900">{data.label}</div>
        </div>
      </div>
      <button
        onClick={handleDelete}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
        title="删除节点"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
