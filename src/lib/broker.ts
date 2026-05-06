import { AgentNodeData, AgentCard, AgentSkill } from './types';

export function brokerNameFromUrl(url: string): string {
  try {
    const { pathname, hostname } = new URL(url);
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      return segments[segments.length - 1]
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    return hostname.split('.')[0]
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  } catch {
    return 'Broker (from URL)';
  }
}

export function guessAgentType(skillName: string): 'agent' | 'mcp' {
  return /search|google|web|mcp|lookup|browse/i.test(skillName) ? 'mcp' : 'agent';
}

export function skillToNodeName(skillName: string): string {
  return skillName
    .replace(/\bskill\b/gi, '')
    .trim()
    .replace(/\s{2,}/g, ' ') + ' Agent';
}

export function buildAgentNodes(brokerName: string, skills: AgentSkill[]): AgentNodeData[] {
  const userNode: AgentNodeData = {
    id: 'user',
    name: 'User',
    status: 'idle',
    type: 'user',
    description: 'Initiates queries to the broker',
  };

  const brokerNode: AgentNodeData = {
    id: 'broker',
    name: brokerName,
    status: 'idle',
    type: 'broker',
    description: 'Orchestrates routing between agents',
  };

  const subAgents: AgentNodeData[] = skills.map((skill, i) => ({
    id: `skill-${skill.id ?? i}`,
    name: skillToNodeName(skill.name),
    status: 'idle',
    type: guessAgentType(skill.name),
    description: skill.description ?? skill.name,
  }));

  return [userNode, brokerNode, ...subAgents];
}

export async function fetchBrokerData(
  brokerUrl: string,
  opts: { bustCache?: boolean } = {},
): Promise<{ agentCard: AgentCard | null; skills: AgentSkill[]; brokerName: string; nodes: AgentNodeData[] }> {
  let agentCard: AgentCard | null = null;

  try {
    const params = new URLSearchParams({ url: brokerUrl });
    if (opts.bustCache) params.set('refresh', '1');
    const res = await fetch(`/api/agent-card?${params}`);
    if (res.ok) {
      agentCard = await res.json();
    }
  } catch {
    // Network error — proceed without card
  }

  const skills: AgentSkill[] = agentCard?.skills ?? [];
  const brokerName = agentCard?.name ?? brokerNameFromUrl(brokerUrl);
  const nodes = buildAgentNodes(brokerName, skills);

  return { agentCard, skills, brokerName, nodes };
}
