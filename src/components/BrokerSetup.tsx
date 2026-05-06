'use client';

import { useState, KeyboardEvent } from 'react';
import { useAppStore } from '@/store';
import { AgentNodeData } from '@/lib/types';

// ── Discovery helpers ────────────────────────────────────────────────────────

function parseAgentNames(text: string): string[] {
  const patterns = [
    /[-•*]\s+\*{0,2}([A-Z][A-Za-z0-9 &/]+?(?:Agent|Service|MCP|Bot|API|Tool))\*{0,2}/g,
    /\d+\.\s+\*{0,2}([A-Z][A-Za-z0-9 &/]+?(?:Agent|Service|MCP|Bot|API|Tool))\*{0,2}/g,
    /\*\*([A-Z][A-Za-z0-9 &/]+?(?:Agent|Service|MCP|Bot|API|Tool))\*\*/g,
  ];
  const names = new Set<string>();
  for (const re of patterns) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      names.add(match[1].trim());
    }
  }
  return [...names].slice(0, 8);
}

function fallbackAgentNames(url: string): string[] {
  const lower = url.toLowerCase();
  if (lower.includes('energy') || lower.includes('util') || lower.includes('power')) {
    return ['ERP Inventory Agent', 'CRM Account Agent', 'Market Search Agent'];
  }
  if (lower.includes('finance') || lower.includes('payment') || lower.includes('billing')) {
    return ['Billing Agent', 'Fraud Detection Agent', 'Reporting Agent'];
  }
  if (lower.includes('hr') || lower.includes('people') || lower.includes('workforce')) {
    return ['Payroll Agent', 'Leave Management Agent', 'Recruitment Agent'];
  }
  return ['Data Agent', 'Search Agent', 'Analytics Agent'];
}

function deriveBrokerName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split('.');
    const segment = parts[0].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    // strip common prefixes
    const clean = segment.replace(/^(Api|App|Www|Dev|Staging|Agent)\s/i, '');
    return `${clean} Broker`.replace(/\s{2,}/g, ' ').trim() || 'Agent Broker';
  } catch {
    return 'Agent Broker';
  }
}

function guessAgentType(name: string): 'agent' | 'mcp' {
  return /mcp|search|google|web|market/i.test(name) ? 'mcp' : 'agent';
}

function descriptionFor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('inventory') || lower.includes('erp') || lower.includes('sap')) return 'Inventory & supply management';
  if (lower.includes('crm') || lower.includes('account') || lower.includes('customer')) return 'Customer relationship data';
  if (lower.includes('search') || lower.includes('market') || lower.includes('mcp')) return 'Market data & web search';
  if (lower.includes('billing') || lower.includes('payment')) return 'Billing & payment processing';
  if (lower.includes('fraud')) return 'Fraud detection & risk';
  if (lower.includes('report') || lower.includes('analytic')) return 'Reporting & analytics';
  if (lower.includes('payroll')) return 'Payroll processing';
  if (lower.includes('leave')) return 'Leave & absence management';
  if (lower.includes('recruit')) return 'Talent acquisition';
  return 'Specialized processing agent';
}

function buildAgentArray(discoveryText: string, url: string): AgentNodeData[] {
  let names = parseAgentNames(discoveryText);
  if (names.length === 0) names = fallbackAgentNames(url);

  const brokerName = deriveBrokerName(url);

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

  const subAgents: AgentNodeData[] = names.map((name, i) => ({
    id: `agent-${i}`,
    name,
    status: 'idle',
    type: guessAgentType(name),
    description: descriptionFor(name),
  }));

  return [userNode, brokerNode, ...subAgents];
}

// ── Component ────────────────────────────────────────────────────────────────

type LoadStep = 'connecting' | 'discovering' | 'building' | null;

const STEP_LABEL: Record<string, string> = {
  connecting: 'Connecting to broker...',
  discovering: 'Discovering agents...',
  building: 'Building network...',
};

export function BrokerSetup() {
  const [url, setUrl] = useState('');
  const [loadStep, setLoadStep] = useState<LoadStep>(null);
  const [error, setError] = useState('');
  const setAgents = useAppStore((s) => s.setAgents);
  const setBrokerUrl = useAppStore((s) => s.setBrokerUrl);
  const setBrokerLoaded = useAppStore((s) => s.setBrokerLoaded);

  const isLoading = loadStep !== null;

  async function handleLoad() {
    const trimmed = url.trim();
    if (!trimmed) return;
    try { new URL(trimmed); } catch {
      setError('Please enter a valid URL (e.g. https://...)');
      return;
    }
    setError('');

    setLoadStep('connecting');
    await new Promise((r) => setTimeout(r, 700));

    setLoadStep('discovering');
    let discoveryText = '';
    try {
      const res = await fetch('/api/broker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What agents or services are available in this system? Please list them with their capabilities.',
          brokerUrl: trimmed,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        discoveryText = data.response ?? '';
      }
    } catch {
      // Network error — fall through to fallback
    }

    setLoadStep('building');
    await new Promise((r) => setTimeout(r, 500));

    const agents = buildAgentArray(discoveryText, trimmed);
    setAgents(agents);
    setBrokerUrl(trimmed);
    setBrokerLoaded(true);
    setLoadStep(null);
  }

  function handleSimulation() {
    const agents = buildAgentArray('', '');
    setAgents(agents);
    setBrokerUrl('');
    setBrokerLoaded(true);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleLoad();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">

        {/* Logo + title */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="3" fill="white" />
              <path d="M9 1V4M9 14V17M1 9H4M14 9H17M3.22 3.22L5.34 5.34M12.66 12.66L14.78 14.78M14.78 3.22L12.66 5.34M5.34 12.66L3.22 14.78" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold" style={{ color: '#00A1E0' }}>MuleSoft</span>
              <span className="text-lg font-semibold text-gray-900">Agent Broker</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Energy Intelligence Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Connect your Broker</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Enter your Agent Broker URL to discover agents and visualize the orchestration network.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Broker URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(''); }}
                onKeyDown={handleKey}
                placeholder="https://your-broker/endpoint"
                disabled={isLoading}
                spellCheck={false}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all disabled:opacity-60"
              />
              {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
            </div>

            <button
              onClick={handleLoad}
              disabled={!url.trim() || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  {STEP_LABEL[loadStep!]}
                </>
              ) : (
                'Load Broker'
              )}
            </button>

            {/* Step progress dots */}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 pt-1">
                {(['connecting', 'discovering', 'building'] as const).map((s) => {
                  const steps = ['connecting', 'discovering', 'building'];
                  const current = steps.indexOf(loadStep!);
                  const idx = steps.indexOf(s);
                  return (
                    <div
                      key={s}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        idx < current ? 'w-6 bg-blue-500' : idx === current ? 'w-6 bg-blue-400 animate-pulse' : 'w-6 bg-gray-200'
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Feature pills */}
          <div className="mt-7 pt-6 border-t border-gray-100 flex items-center justify-center gap-3 flex-wrap">
            {['Dynamic Discovery', 'Real-time Trace', 'Skills Library'].map((f) => (
              <span key={f} className="text-[11px] text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Simulation mode */}
        <p className="text-center text-xs text-gray-400 mt-5">
          No broker yet?{' '}
          <button onClick={handleSimulation} disabled={isLoading} className="text-blue-500 hover:text-blue-600 font-medium transition-colors disabled:opacity-50">
            Try simulation mode
          </button>
        </p>
      </div>
    </div>
  );
}
