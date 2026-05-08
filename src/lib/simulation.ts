import { useAppStore } from '@/store';
import { AgentNodeData } from '@/lib/types';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ── Response templates (simulation mode only) ────────────────────────────────

const ERP_RESPONSES: Record<string, string> = {
  default: 'ERP data retrieved: 3 active supply contracts, 847 MWh available in Q3. Inventory buffers at 94% capacity across Northern Europe nodes.',
  inventory: 'SAP ERP: Current energy inventory — 1,240 MWh stored, 312 MWh committed to contracts. Reorder threshold: 200 MWh.',
  order: 'SAP ERP: 12 open orders found. Priority: Order #ERP-2891 (500 MWh, due 2026-05-12), Order #ERP-2903 (200 MWh, due 2026-05-15).',
};

const CRM_RESPONSES: Record<string, string> = {
  default: 'CRM data retrieved: Account "Energa SA" — Tier 1 customer, 3 active contracts, last interaction 2026-04-28. Renewal window: Q3 2026.',
  account: 'Salesforce CRM: 4 accounts flagged for renewal in Q2 2026. Top priority: Vattenfall AB (€2.4M ARR), E.ON SE (€1.8M ARR).',
  lead: 'Salesforce CRM: 7 new leads this week in the energy sector. Highest score: RWE AG (87/100). Recommended action: schedule discovery call.',
};

const MCP_RESPONSES: Record<string, string> = {
  default: 'Search results: EU energy prices stabilized at €82/MWh (TTF gas spot). Regulatory update: ENTSO-E winter outlook published 2026-05-03.',
  energy: 'Nord Pool day-ahead prices — DE/LU: €79.4/MWh, FR: €81.2/MWh, PL: €88.7/MWh. Renewables at 62% of mix.',
  market: 'Carbon allowance prices at €67.3/t CO2 (EUA futures). Analysts expect €75/t by Q4 2026 on tightening supply.',
};

function getSimulatedResponse(agent: AgentNodeData, query: string): string {
  const lower = query.toLowerCase();
  const name = agent.name.toLowerCase();
  if (name.includes('erp') || name.includes('inventory') || name.includes('distribution') || name.includes('sap')) {
    if (lower.includes('inventory') || lower.includes('stock') || lower.includes('mat')) return ERP_RESPONSES.inventory;
    if (lower.includes('order')) return ERP_RESPONSES.order;
    return ERP_RESPONSES.default;
  }
  if (name.includes('crm') || name.includes('account') || name.includes('customer') || name.includes('salesforce')) {
    if (lower.includes('account') || lower.includes('customer')) return CRM_RESPONSES.account;
    if (lower.includes('lead')) return CRM_RESPONSES.lead;
    return CRM_RESPONSES.default;
  }
  if (name.includes('search') || name.includes('google') || name.includes('mcp') || name.includes('market') || name.includes('web')) {
    if (lower.includes('energy') || lower.includes('price') || lower.includes('tariff')) return MCP_RESPONSES.energy;
    if (lower.includes('market') || lower.includes('carbon')) return MCP_RESPONSES.market;
    return MCP_RESPONSES.default;
  }
  return `${agent.name}: Request processed for "${query.slice(0, 60)}${query.length > 60 ? '...' : ''}".`;
}

function detectTargetAgents(text: string, agents: AgentNodeData[], preferredId?: string): AgentNodeData[] {
  const subAgents = agents.filter((a) => a.type === 'agent' || a.type === 'mcp');

  // If a specific skill was selected by the user, use that node + any other strong matches
  if (preferredId) {
    const preferred = subAgents.find((a) => a.id === preferredId);
    if (preferred) return [preferred];
  }

  const lower = text.toLowerCase();
  const hits = subAgents.filter((agent) => {
    const words = agent.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    return words.some((w) => lower.includes(w));
  });

  return hits.length > 0 ? hits : subAgents.slice(0, Math.min(2, subAgents.length));
}

function synthesize(results: { agentName: string; result: string }[], query: string): string {
  if (results.length === 1) {
    return `Based on the ${results[0].agentName}:\n\n${results[0].result}`;
  }
  const parts = results.map((r) => `**${r.agentName}**\n${r.result}`).join('\n\n');
  return `Data from ${results.length} agents for "${query.slice(0, 60)}${query.length > 60 ? '...' : ''}":\n\n${parts}\n\nAll systems nominal.`;
}

// ── Real broker call ─────────────────────────────────────────────────────────

/**
 * Calls the real A2A broker. Highlights: User → Broker (API call) → skill nodes → Broker → User.
 * @param preferredAgentId  Node ID of the skill the user selected (if any), used to determine which
 *                          sub-agents to highlight in the visual flow.
 */
export async function callRealBroker(
  userMessage: string,
  brokerUrl: string,
  preferredAgentId?: string,
) {
  const store = useAppStore.getState();
  const { agents, addTraceEvent, addMessage, setAgentStatus, setActiveAgent, setProcessing, setCurrentStep, resetAgentStatuses } = store;

  const userAgent = agents.find((a) => a.type === 'user');
  const brokerAgent = agents.find((a) => a.type === 'broker');
  if (!brokerAgent) return;

  setProcessing(true);
  resetAgentStatuses();

  // Step 1 — User submits
  if (userAgent) {
    setCurrentStep('Sending query...');
    setAgentStatus(userAgent.id, 'active');
    setActiveAgent(userAgent.id);
    addTraceEvent({ type: 'routing', agentId: userAgent.id, agentName: userAgent.name, message: 'Query submitted.' });
    await delay(350);
    setAgentStatus(userAgent.id, 'complete');
  }

  // Step 2 — Broker receives + fires real API call concurrently
  setAgentStatus(brokerAgent.id, 'active');
  setActiveAgent(brokerAgent.id);
  setCurrentStep('Broker processing...');
  addTraceEvent({ type: 'api_call', agentId: brokerAgent.id, agentName: brokerAgent.name, message: `POST ${brokerUrl}` });

  let responseText = '';
  let callError = '';

  try {
    const res = await fetch('/api/broker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage, brokerUrl }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    const data = await res.json();
    responseText = data.response;
    if (data.isPiiBlocked) {
      callError = '__pii__';
    }
  } catch (err) {
    callError = err instanceof Error ? err.message : 'Unknown error';
  }

  if (callError) {
    const isPii = callError === '__pii__';
    setAgentStatus(brokerAgent.id, 'error');
    addTraceEvent({ type: 'error', agentId: brokerAgent.id, agentName: brokerAgent.name, message: isPii ? 'Request blocked: PII detected.' : `Error: ${callError}` });
    addMessage({
      role: 'agent',
      content: responseText || (isPii ? 'The request contains information that is not allowed. Please remove sensitive details and try again.' : `Broker call failed: ${callError}`),
      agentId: brokerAgent.id,
      agentName: brokerAgent.name,
      isError: true,
    });
    setCurrentStep('');
    setActiveAgent(null);
    setProcessing(false);
    await delay(2000);
    resetAgentStatuses();
    return;
  }

  // Step 3 — Broker routes to skill agents (visual replay of internal routing)
  setAgentStatus(brokerAgent.id, 'complete');
  const targetAgents = detectTargetAgents(userMessage, agents, preferredAgentId);

  for (const agent of targetAgents) {
    setCurrentStep(`${agent.name} handling...`);
    setAgentStatus(agent.id, 'active');
    setActiveAgent(agent.id);
    addTraceEvent({ type: 'api_call', agentId: agent.id, agentName: agent.name, message: 'Handling request...' });
    await delay(500);
    setAgentStatus(agent.id, 'complete');
    addTraceEvent({ type: 'response', agentId: agent.id, agentName: agent.name, message: 'Response returned to broker.' });
    await delay(150);
  }

  // Step 4 — Broker synthesizes
  setCurrentStep('Synthesizing...');
  setAgentStatus(brokerAgent.id, 'active');
  setActiveAgent(brokerAgent.id);
  addTraceEvent({ type: 'routing', agentId: brokerAgent.id, agentName: brokerAgent.name, message: 'Synthesizing final response...' });
  await delay(350);
  setAgentStatus(brokerAgent.id, 'complete');

  // Step 5 — Response delivered; return path to user
  addMessage({
    role: 'agent',
    content: responseText,
    agentId: brokerAgent.id,
    agentName: brokerAgent.name,
    attribution: targetAgents.map((a) => ({ name: a.name, type: a.type })),
  });
  addTraceEvent({ type: 'response', agentId: brokerAgent.id, agentName: brokerAgent.name, message: 'Response delivered to user.' });

  if (userAgent) {
    setAgentStatus(userAgent.id, 'active');
    setActiveAgent(userAgent.id);
    await delay(450);
    setAgentStatus(userAgent.id, 'complete');
  }

  setCurrentStep('');
  setActiveAgent(null);
  setProcessing(false);
  await delay(2000);
  resetAgentStatuses();
}

// ── Simulation ───────────────────────────────────────────────────────────────

/**
 * Runs the full step-by-step simulation: User → Broker → agents → Broker → User.
 * @param preferredAgentId  Node ID of the skill the user selected (if any).
 */
export async function runSimulation(userMessage: string, preferredAgentId?: string) {
  const store = useAppStore.getState();
  const { agents, simulateLatency, simulateErrors, verbosity, addTraceEvent, addMessage, setAgentStatus, setActiveAgent, setProcessing, setCurrentStep, resetAgentStatuses } = store;

  const userAgent = agents.find((a) => a.type === 'user');
  const brokerAgent = agents.find((a) => a.type === 'broker');
  if (!brokerAgent) return;

  const step = simulateLatency ? 550 : 80;

  const trace = (type: Parameters<typeof addTraceEvent>[0]['type'], agentId: string, agentName: string, message: string, data?: unknown) => {
    if (verbosity === 'low' && type === 'routing') return;
    addTraceEvent({ type, agentId, agentName, message, data });
  };

  setProcessing(true);
  resetAgentStatuses();

  // Step 1 — User submits
  if (userAgent) {
    setCurrentStep('Sending query...');
    setAgentStatus(userAgent.id, 'active');
    setActiveAgent(userAgent.id);
    trace('api_call', userAgent.id, userAgent.name, `Query: "${userMessage.slice(0, 80)}${userMessage.length > 80 ? '...' : ''}"`);
    await delay(step * 0.6);
    setAgentStatus(userAgent.id, 'complete');
  }

  // Step 2 — Broker routes
  await delay(step * 0.3);
  setCurrentStep('Broker routing...');
  setAgentStatus(brokerAgent.id, 'active');
  setActiveAgent(brokerAgent.id);
  trace('routing', brokerAgent.id, brokerAgent.name, 'Analyzing intent and selecting target agents...');
  await delay(step);

  if (simulateErrors && Math.random() < 0.1) {
    trace('error', brokerAgent.id, brokerAgent.name, 'Rate limit encountered — retrying...');
    await delay(step * 0.5);
  }

  const targetAgents = detectTargetAgents(userMessage, agents, preferredAgentId);
  trace('routing', brokerAgent.id, brokerAgent.name, `Routing to: ${targetAgents.map((a) => a.name).join(', ')}`, { targets: targetAgents.map((a) => a.id) });

  // Step 3 — Each agent runs
  const results: { agentName: string; result: string }[] = [];

  for (const agent of targetAgents) {
    setCurrentStep(`${agent.name} running...`);
    setAgentStatus(agent.id, 'active');
    setActiveAgent(agent.id);
    trace('api_call', agent.id, agent.name, 'Processing request...');
    await delay(step * 1.2);

    const result = getSimulatedResponse(agent, userMessage);
    trace('response', agent.id, agent.name, result);
    setAgentStatus(agent.id, 'complete');
    results.push({ agentName: agent.name, result });
    await delay(step * 0.25);
  }

  // Step 4 — Broker synthesizes
  setCurrentStep('Synthesizing...');
  setAgentStatus(brokerAgent.id, 'active');
  setActiveAgent(brokerAgent.id);
  trace('routing', brokerAgent.id, brokerAgent.name, 'All agents responded. Synthesizing final answer...');
  await delay(step * 0.8);
  setAgentStatus(brokerAgent.id, 'complete');

  // Step 5 — Response delivered; return path to user
  const finalResponse = synthesize(results, userMessage);
  addMessage({
    role: 'agent',
    content: finalResponse,
    agentId: brokerAgent.id,
    agentName: brokerAgent.name,
    attribution: targetAgents.map((a) => ({ name: a.name, type: a.type })),
  });
  trace('response', brokerAgent.id, brokerAgent.name, 'Final response delivered to user.');

  if (userAgent) {
    setAgentStatus(userAgent.id, 'active');
    setActiveAgent(userAgent.id);
    await delay(step * 0.7);
    setAgentStatus(userAgent.id, 'complete');
  }

  setCurrentStep('');
  setActiveAgent(null);
  setProcessing(false);
  await delay(2000);
  resetAgentStatuses();
}
