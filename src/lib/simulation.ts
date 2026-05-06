import { useAppStore } from '@/store';
import { AgentNodeData } from '@/lib/types';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

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
  default: 'Google Search results: EU energy prices stabilized at €82/MWh (TTF gas spot). Regulatory update: ENTSO-E winter outlook published 2026-05-03.',
  energy: 'Google Search: Nord Pool day-ahead prices — DE/LU zone: €79.4/MWh, FR: €81.2/MWh, PL: €88.7/MWh. Renewables at 62% of mix.',
  market: 'Google Search: Carbon allowance prices at €67.3/t CO2 (EUA futures). Analysts expect €75/t by Q4 2026 on tightening supply.',
};

function getAgentResponse(agent: AgentNodeData, query: string): string {
  const lower = query.toLowerCase();
  const nameLower = agent.name.toLowerCase();
  if (nameLower.includes('erp') || nameLower.includes('inventory') || nameLower.includes('sap')) {
    if (lower.includes('inventory') || lower.includes('stock')) return ERP_RESPONSES.inventory;
    if (lower.includes('order')) return ERP_RESPONSES.order;
    return ERP_RESPONSES.default;
  }
  if (nameLower.includes('crm') || nameLower.includes('account') || nameLower.includes('customer') || nameLower.includes('salesforce')) {
    if (lower.includes('account') || lower.includes('customer')) return CRM_RESPONSES.account;
    if (lower.includes('lead')) return CRM_RESPONSES.lead;
    return CRM_RESPONSES.default;
  }
  if (nameLower.includes('search') || nameLower.includes('market') || nameLower.includes('mcp') || nameLower.includes('google')) {
    if (lower.includes('energy') || lower.includes('price') || lower.includes('tariff')) return MCP_RESPONSES.energy;
    if (lower.includes('market') || lower.includes('carbon')) return MCP_RESPONSES.market;
    return MCP_RESPONSES.default;
  }
  return `${agent.name} processed the request and returned results for: "${query.slice(0, 60)}${query.length > 60 ? '...' : ''}".`;
}

function detectTargetAgents(text: string, agents: AgentNodeData[]): AgentNodeData[] {
  const lower = text.toLowerCase();
  const subAgents = agents.filter((a) => a.type === 'agent' || a.type === 'mcp');

  const hits = subAgents.filter((agent) => {
    const words = agent.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    return words.some((w) => lower.includes(w));
  });

  if (hits.length === 0) return subAgents.slice(0, Math.min(2, subAgents.length));
  return hits;
}

function synthesizeResponse(results: { agentName: string; result: string }[], query: string): string {
  if (results.length === 1) {
    return `Based on the ${results[0].agentName} data:\n\n${results[0].result}`;
  }
  const parts = results.map((r) => `**${r.agentName}**\n${r.result}`).join('\n\n');
  return `I've gathered data from ${results.length} sources for your query about "${query.slice(0, 60)}${query.length > 60 ? '...' : ''}":\n\n${parts}\n\nAll systems nominal — no conflicts detected.`;
}

export async function callRealBroker(userMessage: string, brokerUrl: string) {
  const store = useAppStore.getState();
  const { agents, addTraceEvent, addMessage, setAgentStatus, setActiveAgent, setProcessing, setCurrentStep, resetAgentStatuses } = store;

  const userAgent = agents.find((a) => a.type === 'user');
  const brokerAgent = agents.find((a) => a.type === 'broker');
  if (!brokerAgent) return;

  setProcessing(true);
  resetAgentStatuses();

  if (userAgent) {
    setCurrentStep('Sending query...');
    setAgentStatus(userAgent.id, 'active');
    setActiveAgent(userAgent.id);
    addTraceEvent({ type: 'routing', agentId: userAgent.id, agentName: userAgent.name, message: 'Query submitted.' });
    await delay(300);
    setAgentStatus(userAgent.id, 'complete');
  }

  setAgentStatus(brokerAgent.id, 'active');
  setActiveAgent(brokerAgent.id);
  setCurrentStep('Calling broker...');
  addTraceEvent({ type: 'api_call', agentId: brokerAgent.id, agentName: brokerAgent.name, message: `POST ${brokerUrl}` });

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
    const responseText: string = data.response;

    setAgentStatus(brokerAgent.id, 'complete');
    addTraceEvent({ type: 'response', agentId: brokerAgent.id, agentName: brokerAgent.name, message: 'Response received.' });
    addMessage({ role: 'agent', content: responseText, agentId: brokerAgent.id, agentName: brokerAgent.name });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    setAgentStatus(brokerAgent.id, 'error');
    addTraceEvent({ type: 'error', agentId: brokerAgent.id, agentName: brokerAgent.name, message: `Error: ${msg}` });
    addMessage({ role: 'agent', content: `Broker call failed: ${msg}`, agentId: brokerAgent.id, agentName: brokerAgent.name });
  }

  setCurrentStep('');
  setActiveAgent(null);
  setProcessing(false);
  await delay(2000);
  resetAgentStatuses();
}

export async function runSimulation(userMessage: string) {
  const store = useAppStore.getState();
  const { agents, simulateLatency, simulateErrors, verbosity, addTraceEvent, addMessage, setAgentStatus, setActiveAgent, setProcessing, setCurrentStep, resetAgentStatuses } = store;

  const userAgent = agents.find((a) => a.type === 'user');
  const brokerAgent = agents.find((a) => a.type === 'broker');
  if (!brokerAgent) return;

  const fast = !simulateLatency;
  const step = fast ? 80 : 600;

  const trace = (type: Parameters<typeof addTraceEvent>[0]['type'], agentId: string, agentName: string, message: string, data?: unknown) => {
    if (verbosity === 'low' && type === 'routing') return;
    addTraceEvent({ type, agentId, agentName, message, data });
  };

  setProcessing(true);
  resetAgentStatuses();

  // Step 1: User node
  if (userAgent) {
    setCurrentStep('Sending query...');
    setAgentStatus(userAgent.id, 'active');
    setActiveAgent(userAgent.id);
    trace('api_call', userAgent.id, userAgent.name, `Query: "${userMessage.slice(0, 80)}${userMessage.length > 80 ? '...' : ''}"`);
    await delay(step * 0.6);
    setAgentStatus(userAgent.id, 'complete');
  }

  // Step 2: Broker routes
  await delay(step / 3);
  setCurrentStep('Broker routing...');
  setAgentStatus(brokerAgent.id, 'active');
  setActiveAgent(brokerAgent.id);
  trace('routing', brokerAgent.id, brokerAgent.name, 'Analyzing intent and selecting target agents...');
  await delay(step);

  if (simulateErrors && Math.random() < 0.1) {
    trace('error', brokerAgent.id, brokerAgent.name, 'Rate limit encountered — retrying...');
    await delay(step / 2);
  }

  const targetAgents = detectTargetAgents(userMessage, agents);
  trace('routing', brokerAgent.id, brokerAgent.name, `Routing to: ${targetAgents.map((a) => a.name).join(', ')}`, { targets: targetAgents.map((a) => a.id) });

  // Step 3: Each sub-agent runs
  const agentResults: { agentName: string; result: string }[] = [];

  for (const agent of targetAgents) {
    setCurrentStep(`${agent.name} running...`);
    setAgentStatus(agent.id, 'active');
    setActiveAgent(agent.id);
    trace('api_call', agent.id, agent.name, 'Processing request...');
    await delay(step * 1.2);

    const result = getAgentResponse(agent, userMessage);
    trace('response', agent.id, agent.name, result);
    setAgentStatus(agent.id, 'complete');
    agentResults.push({ agentName: agent.name, result });
    await delay(step / 4);
  }

  // Step 4: Broker synthesizes
  setCurrentStep('Synthesizing results...');
  setAgentStatus(brokerAgent.id, 'active');
  setActiveAgent(brokerAgent.id);
  trace('routing', brokerAgent.id, brokerAgent.name, 'All agents responded. Synthesizing final answer...');
  await delay(step * 0.8);
  setAgentStatus(brokerAgent.id, 'complete');

  const finalResponse = synthesizeResponse(agentResults, userMessage);
  addMessage({ role: 'agent', content: finalResponse, agentId: brokerAgent.id, agentName: brokerAgent.name });
  trace('response', brokerAgent.id, brokerAgent.name, 'Final response delivered to user.');

  setCurrentStep('');
  setActiveAgent(null);
  setProcessing(false);
  await delay(2000);
  resetAgentStatuses();
}
