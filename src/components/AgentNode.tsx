'use client';

import { Handle, Position } from 'reactflow';
import { AgentNodeData } from '@/lib/types';

const TYPE_STYLES: Record<string, string> = {
  llm: 'border-violet-200 bg-violet-50 text-violet-900 shadow-violet-100',
  broker: 'border-blue-200 bg-blue-50 text-blue-900 shadow-blue-100',
  agent: 'border-emerald-200 bg-emerald-50 text-emerald-900 shadow-emerald-100',
  mcp: 'border-amber-200 bg-amber-50 text-amber-900 shadow-amber-100',
};

const STATUS_RING: Record<string, string> = {
  idle: '',
  active: 'ring-2 ring-offset-2 ring-offset-white ring-blue-400 animate-pulse',
  complete: 'ring-2 ring-offset-2 ring-offset-white ring-emerald-400',
  error: 'ring-2 ring-offset-2 ring-offset-white ring-red-400',
};

const TYPE_LABEL: Record<string, string> = {
  llm: 'LLM',
  broker: 'BROKER',
  agent: 'AGENT',
  mcp: 'MCP',
};

const DOT_COLORS: Record<string, string> = {
  llm: 'bg-violet-400',
  broker: 'bg-blue-400',
  agent: 'bg-emerald-400',
  mcp: 'bg-amber-400',
};

export function AgentNode({ data }: { data: AgentNodeData }) {
  const baseStyle = TYPE_STYLES[data.type] ?? 'border-gray-200 bg-white text-gray-900 shadow-gray-100';
  const ringStyle = STATUS_RING[data.status] ?? '';

  return (
    <div className={`relative border rounded-xl px-4 py-3 min-w-[160px] max-w-[200px] shadow-sm ${baseStyle} ${ringStyle} transition-all duration-300`}>
      {data.type !== 'llm' && (
        <Handle type="target" position={Position.Top} className="!bg-gray-300 !border-gray-400 !w-2 !h-2" />
      )}

      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold tracking-widest opacity-50">{TYPE_LABEL[data.type]}</span>
        <StatusDot status={data.status} type={data.type} />
      </div>
      <div className="text-sm font-semibold leading-tight">{data.name}</div>
      <div className="text-[11px] opacity-50 mt-0.5 leading-tight">{data.description}</div>

      {data.type !== 'agent' && data.type !== 'mcp' && (
        <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !border-gray-400 !w-2 !h-2" />
      )}
    </div>
  );
}

function StatusDot({ status, type }: { status: string; type: string }) {
  const baseColor = DOT_COLORS[type] ?? 'bg-gray-400';
  const colors: Record<string, string> = {
    idle: 'bg-gray-300',
    active: `${baseColor} animate-ping`,
    complete: 'bg-emerald-500',
    error: 'bg-red-500',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ml-auto ${colors[status] ?? 'bg-gray-300'}`} />;
}
