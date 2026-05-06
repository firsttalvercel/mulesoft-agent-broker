'use client';

import ReactFlow, {
  Background, Controls, Edge, Node, BackgroundVariant, NodeChange, applyNodeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppStore } from '@/store';
import { AgentNode } from './AgentNode';
import { AgentNodeData } from '@/lib/types';
import { useMemo, useEffect, useState, useCallback } from 'react';

const nodeTypes = { agentNode: AgentNode };

const CANVAS_W = 600;
const NODE_W = 180;
const ROW_GAP_Y = 180;

function computeInitialPositions(agents: AgentNodeData[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const userNode = agents.find((a) => a.type === 'user');
  const brokerNode = agents.find((a) => a.type === 'broker');
  const subAgents = agents.filter((a) => a.type !== 'user' && a.type !== 'broker');

  if (userNode) positions[userNode.id] = { x: CANVAS_W / 2 - NODE_W / 2, y: 0 };
  if (brokerNode) positions[brokerNode.id] = { x: CANVAS_W / 2 - NODE_W / 2, y: ROW_GAP_Y };

  const count = subAgents.length;
  if (count > 0) {
    const gap = 24;
    const totalWidth = count * NODE_W + (count - 1) * gap;
    const startX = CANVAS_W / 2 - totalWidth / 2;
    subAgents.forEach((agent, i) => {
      positions[agent.id] = { x: startX + i * (NODE_W + gap), y: ROW_GAP_Y * 2 };
    });
  }

  return positions;
}

function computeEdges(agents: AgentNodeData[], activeAgentId: string | null): Edge[] {
  const brokerNode = agents.find((a) => a.type === 'broker');
  const userNode = agents.find((a) => a.type === 'user');
  if (!brokerNode) return [];

  const edges: Edge[] = [];

  if (userNode) {
    const isActive = activeAgentId === userNode.id || activeAgentId === brokerNode.id;
    edges.push({
      id: `e-${userNode.id}-${brokerNode.id}`,
      source: userNode.id,
      target: brokerNode.id,
      animated: isActive,
      style: { stroke: isActive ? '#3b82f6' : '#c4b5fd', strokeWidth: isActive ? 2.5 : 2 },
    });
  }

  const subAgents = agents.filter((a) => a.type !== 'user' && a.type !== 'broker');
  for (const agent of subAgents) {
    const isActive = activeAgentId === agent.id || activeAgentId === brokerNode.id;
    edges.push({
      id: `e-${brokerNode.id}-${agent.id}`,
      source: brokerNode.id,
      target: agent.id,
      animated: isActive,
      style: { stroke: isActive ? '#3b82f6' : '#d1d5db', strokeWidth: isActive ? 2.5 : 1.5 },
    });
  }

  return edges;
}

export function AgentGraph() {
  const agents = useAppStore((s) => s.agents);
  const activeAgentId = useAppStore((s) => s.activeAgentId);
  const [visible, setVisible] = useState(false);

  // Compute initial node positions from agent list
  const initialPositions = useMemo(() => computeInitialPositions(agents), [agents]);

  // Mutable node state (positions can change via drag)
  const [nodes, setNodes] = useState<Node[]>(() =>
    agents.map((agent) => ({
      id: agent.id,
      type: 'agentNode',
      position: initialPositions[agent.id] ?? { x: 0, y: 0 },
      data: agent,
    }))
  );

  // Sync agent data (status changes) without resetting positions
  useEffect(() => {
    setNodes((prev) =>
      agents.map((agent) => {
        const existing = prev.find((n) => n.id === agent.id);
        return {
          id: agent.id,
          type: 'agentNode',
          position: existing?.position ?? initialPositions[agent.id] ?? { x: 0, y: 0 },
          data: agent,
        };
      })
    );
  }, [agents, initialPositions]);

  // Re-init positions when agent list changes (different broker loaded)
  useEffect(() => {
    setNodes(
      agents.map((agent) => ({
        id: agent.id,
        type: 'agentNode',
        position: initialPositions[agent.id] ?? { x: 0, y: 0 },
        data: agent,
      }))
    );
  }, [agents.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const edges = useMemo(() => computeEdges(agents, activeAgentId), [agents, activeAgentId]);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="w-full h-full bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm transition-all duration-500"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)' }}
    >
      <ReactFlow
        key={`graph-${agents.length}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#e5e7eb" gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
