import { useAppStore } from '@/store';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function callRealBroker(userMessage: string, brokerUrl: string) {
  const { addTraceEvent, addMessage, setAgentStatus, setActiveAgent, setProcessing, setCurrentStep, resetAgentStatuses } =
    useAppStore.getState();

  setProcessing(true);
  resetAgentStatuses();

  setCurrentStep('Routing to broker...');
  setAgentStatus('gemini', 'active');
  setActiveAgent('gemini');
  addTraceEvent({ type: 'routing', agentId: 'gemini', agentName: 'LLM', message: 'Query received — forwarding to broker.' });
  await delay(300);
  setAgentStatus('gemini', 'complete');

  setAgentStatus('energy-broker', 'active');
  setActiveAgent('energy-broker');
  setCurrentStep('Calling broker...');
  addTraceEvent({ type: 'api_call', agentId: 'energy-broker', agentName: 'Energy Broker', message: `POST ${brokerUrl}` });

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

    setAgentStatus('energy-broker', 'complete');
    addTraceEvent({ type: 'response', agentId: 'energy-broker', agentName: 'Energy Broker', message: 'Response received from broker.' });
    addMessage({ role: 'agent', content: responseText, agentId: 'energy-broker', agentName: 'Energy Broker' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    setAgentStatus('energy-broker', 'error');
    addTraceEvent({ type: 'error', agentId: 'energy-broker', agentName: 'Energy Broker', message: `Error: ${msg}` });
    addMessage({ role: 'agent', content: `Broker call failed: ${msg}`, agentId: 'energy-broker', agentName: 'Energy Broker' });
  }

  setCurrentStep('');
  setActiveAgent(null);
  setProcessing(false);

  await delay(2000);
  resetAgentStatuses();
}

const ERP_KEYWORDS = ['inventory', 'stock', 'erp', 'sap', 'order', 'orders', 'product', 'supply', 'warehouse', 'shipment'];
const CRM_KEYWORDS = ['account', 'customer', 'crm', 'salesforce', 'lead', 'contact', 'opportunity', 'deal', 'client', 'pipeline'];
const MCP_KEYWORDS = ['search', 'google', 'find', 'web', 'news', 'latest', 'price', 'market', 'energy', 'tariff'];

function detectAgents(text: string): string[] {
  const lower = text.toLowerCase();
  const targets: string[] = [];
  if (ERP_KEYWORDS.some((k) => lower.includes(k))) targets.push('erp-agent');
  if (CRM_KEYWORDS.some((k) => lower.includes(k))) targets.push('crm-agent');
  if (MCP_KEYWORDS.some((k) => lower.includes(k))) targets.push('google-mcp');
  if (targets.length === 0) targets.push('erp-agent', 'crm-agent');
  return targets;
}

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

function getAgentResponse(agentId: string, query: string): string {
  const lower = query.toLowerCase();
  if (agentId === 'erp-agent') {
    if (lower.includes('inventory') || lower.includes('stock')) return ERP_RESPONSES.inventory;
    if (lower.includes('order')) return ERP_RESPONSES.order;
    return ERP_RESPONSES.default;
  }
  if (agentId === 'crm-agent') {
    if (lower.includes('account') || lower.includes('customer')) return CRM_RESPONSES.account;
    if (lower.includes('lead')) return CRM_RESPONSES.lead;
    return CRM_RESPONSES.default;
  }
  if (agentId === 'google-mcp') {
    if (lower.includes('energy') || lower.includes('price') || lower.includes('tariff')) return MCP_RESPONSES.energy;
    if (lower.includes('market') || lower.includes('carbon')) return MCP_RESPONSES.market;
    return MCP_RESPONSES.default;
  }
  return 'Agent response received.';
}

function synthesizeResponse(agentResults: { agentName: string; result: string }[], query: string): string {
  if (agentResults.length === 1) {
    return `Based on the ${agentResults[0].agentName} data: ${agentResults[0].result}`;
  }
  const parts = agentResults.map((r) => `**${r.agentName}**: ${r.result}`).join('\n\n');
  return `I've gathered data from ${agentResults.length} sources to answer your query about "${query.slice(0, 60)}${query.length > 60 ? '...' : ''}":\n\n${parts}\n\nSummary: All systems nominal. The broker has cross-referenced the data — no conflicts detected. Ready for your next query.`;
}

export async function runSimulation(userMessage: string) {
  const store = useAppStore.getState();
  const { simulateLatency, simulateErrors, verbosity, addTraceEvent, addMessage, setAgentStatus, setActiveAgent, setProcessing, setCurrentStep, resetAgentStatuses } = store;

  const fast = !simulateLatency;
  const step = fast ? 80 : 600;

  const trace = (type: Parameters<typeof addTraceEvent>[0]['type'], agentId: string, agentName: string, message: string, data?: unknown) => {
    if (verbosity === 'low' && type === 'routing') return;
    addTraceEvent({ type, agentId, agentName, message, data });
  };

  setProcessing(true);
  resetAgentStatuses();

  // Step 1: LLM receives and processes
  setCurrentStep('LLM processing query...');
  setAgentStatus('gemini', 'active');
  setActiveAgent('gemini');
  trace('api_call', 'gemini', 'Gemini 2.5 Flash', `Received query: "${userMessage.slice(0, 80)}..."`);
  await delay(step);

  if (simulateErrors && Math.random() < 0.1) {
    trace('error', 'gemini', 'Gemini 2.5 Flash', 'Rate limit encountered — retrying...');
    await delay(step / 2);
  }

  trace('routing', 'gemini', 'Gemini 2.5 Flash', 'Intent classified. Routing decision delegated to Energy Broker.');
  setAgentStatus('gemini', 'complete');

  // Step 2: Broker activates and routes
  await delay(step / 3);
  setCurrentStep('Broker routing to agents...');
  setAgentStatus('energy-broker', 'active');
  setActiveAgent('energy-broker');
  trace('routing', 'energy-broker', 'Energy Broker', 'Analyzing query intent and selecting target agents...');
  await delay(step);

  const targetAgents = detectAgents(userMessage);
  const agentNames: Record<string, string> = {
    'erp-agent': 'ERP Inventory Agent',
    'crm-agent': 'CRM Account Agent',
    'google-mcp': 'Google Search MCP',
  };

  trace('routing', 'energy-broker', 'Energy Broker', `Routing to: ${targetAgents.map((id) => agentNames[id]).join(', ')}`, { targets: targetAgents });

  // Step 3: Each agent runs
  const agentResults: { agentName: string; result: string }[] = [];

  for (const agentId of targetAgents) {
    const agentName = agentNames[agentId];
    setCurrentStep(`${agentName} running...`);
    setAgentStatus(agentId, 'active');
    setActiveAgent(agentId);
    trace('api_call', agentId, agentName, `Processing request...`);
    await delay(step * 1.2);

    const result = getAgentResponse(agentId, userMessage);
    trace('response', agentId, agentName, result);
    setAgentStatus(agentId, 'complete');
    agentResults.push({ agentName, result });
    await delay(step / 4);
  }

  // Step 4: Broker synthesizes
  setCurrentStep('Synthesizing results...');
  setAgentStatus('energy-broker', 'active');
  setActiveAgent('energy-broker');
  trace('routing', 'energy-broker', 'Energy Broker', 'All agents responded. Synthesizing final answer...');
  await delay(step * 0.8);
  setAgentStatus('energy-broker', 'complete');

  // Step 5: Final response
  const finalResponse = synthesizeResponse(agentResults, userMessage);
  addMessage({ role: 'agent', content: finalResponse, agentId: 'energy-broker', agentName: 'Energy Broker' });
  trace('response', 'energy-broker', 'Energy Broker', 'Final response delivered to user.');

  setCurrentStep('');
  setActiveAgent(null);
  setProcessing(false);

  // Reset statuses after a short delay
  await delay(2000);
  resetAgentStatuses();
}
