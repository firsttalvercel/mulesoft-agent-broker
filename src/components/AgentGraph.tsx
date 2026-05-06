'use client';

import ReactFlow, { Background, Controls, Edge, Node, BackgroundVariant } from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppStore } from '@/store';
import { AgentNode } from './AgentNode';
import { useMemo, useEffect, useState } from 'react';

const nodeTypes = { agentNode: AgentNode };

const POSITIONS: Record<string, { x: number; y: number }> = {
  'gemini': { x: 260, y: 20 },
  'energy-broker': { x: 220, y: 180 },
  'erp-agent': { x: 40, y: 360 },
  'crm-agent': { x: 240, y: 360 },
  'google-mcp': { x: 440, y: 360 },
};

const STATIC_EDGES: Edge[] = [
  { id: 'e-gemini-broker', source: 'gemini', target: 'energy-broker', animated: false, style: { stroke: '#c4b5fd', strokeWidth: 2 } },
  { id: 'e-broker-erp', source: 'energy-broker', target: 'erp-agent', animated: false, style: { stroke: '#d1d5db', strokeWidth: 1.5 } },
  { id: 'e-broker-crm', source: 'energy-broker', target: 'crm-agent', animated: false, style: { stroke: '#d1d5db', strokeWidth: 1.5 } },
  { id: 'e-broker-mcp', source: 'energy-broker', target: 'google-mcp', animated: false, style: { stroke: '#d1d5db', strokeWidth: 1.5 } },
];

export function AgentGraph() {
  const agents = useAppStore((s) => s.agents);
  const activeAgentId = useAppStore((s) => s.activeAgentId);
  const [visible, setVisible] = useState(false);

  // Fade in on mount (after broker loads)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const nodes: Node[] = useMemo(
    () =>
      agents.map((agent) => ({
        id: agent.id,
        type: 'agentNode',
        position: POSITIONS[agent.id] ?? { x: 0, y: 0 },
        data: agent,
        selected: false,
      })),
    [agents]
  );

  const edges: Edge[] = useMemo(
    () =>
      STATIC_EDGES.map((edge) => {
        const isActive = activeAgentId === edge.target || activeAgentId === edge.source;
        return {
          ...edge,
          animated: isActive,
          style: {
            ...edge.style,
            stroke: isActive ? '#3b82f6' : edge.style?.stroke,
            strokeWidth: isActive ? 2.5 : edge.style?.strokeWidth,
          },
        };
      }),
    [activeAgentId]
  );

  return (
    <div
      className="w-full h-full bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm transition-all duration-500"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#e5e7eb" gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
