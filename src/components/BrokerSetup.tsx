'use client';

import { useState, KeyboardEvent } from 'react';
import { useAppStore } from '@/store';
import { AgentNodeData, AgentCard, AgentSkill } from '@/lib/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive a human-readable broker name from the URL path.
 * "/energy-agent-network-demo/" → "Energy Agent Network Demo"
 * Falls back to hostname if no meaningful path segment exists.
 */
function brokerNameFromUrl(url: string): string {
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
    return 'Broker';
  }
}

function guessAgentType(skillName: string): 'agent' | 'mcp' {
  return /search|google|web|mcp|lookup|browse/i.test(skillName) ? 'mcp' : 'agent';
}

function skillToNodeName(skillName: string): string {
  // "Inventory and Distribution Skill" → "Inventory Agent"
  // "Google Search Skill" → "Google Search Agent"
  return skillName
    .replace(/\bskill\b/gi, '')
    .trim()
    .replace(/\s{2,}/g, ' ') + ' Agent';
}

function buildAgentNodes(brokerName: string, skills: AgentSkill[]): AgentNodeData[] {
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

// ── Component ────────────────────────────────────────────────────────────────

export function BrokerSetup() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setAgents = useAppStore((s) => s.setAgents);
  const setBrokerUrl = useAppStore((s) => s.setBrokerUrl);
  const setBrokerLoaded = useAppStore((s) => s.setBrokerLoaded);
  const setBrokerMetadata = useAppStore((s) => s.setBrokerMetadata);
  const setSkills = useAppStore((s) => s.setSkills);

  async function handleLoad() {
    const trimmed = url.trim();
    if (!trimmed) return;

    try { new URL(trimmed); } catch {
      setError('Please enter a valid URL (e.g. https://...)');
      return;
    }

    setError('');
    setLoading(true);

    // Attempt agent card discovery
    let agentCard: AgentCard | null = null;
    try {
      const res = await fetch(`/api/agent-card?url=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        agentCard = await res.json();
      }
    } catch {
      // Network error — proceed without card
    }

    const skills: AgentSkill[] = agentCard?.skills ?? [];
    const brokerName = agentCard?.name ?? brokerNameFromUrl(trimmed);

    setBrokerMetadata(agentCard);
    setSkills(skills);
    setAgents(buildAgentNodes(brokerName, skills));
    setBrokerUrl(trimmed);
    setBrokerLoaded(true);
    setLoading(false);
  }

  function handleSimulation() {
    // Simulation: User + Broker only — no fake agents or skills
    const userNode: AgentNodeData = {
      id: 'user', name: 'User', status: 'idle', type: 'user', description: 'Initiates queries',
    };
    const brokerNode: AgentNodeData = {
      id: 'broker', name: 'Simulation Broker', status: 'idle', type: 'broker', description: 'Simulated orchestration',
    };
    setBrokerMetadata(null);
    setSkills([]);
    setAgents([userNode, brokerNode]);
    setBrokerUrl('');
    setBrokerLoaded(true);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleLoad();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <MuleSoftLogo />
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
            Enter your Agent Broker URL. The app will discover available agents and skills from the broker.
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
                disabled={loading}
                spellCheck={false}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all disabled:opacity-60"
              />
              {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
            </div>

            <button
              onClick={handleLoad}
              disabled={!url.trim() || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  Connecting...
                </>
              ) : (
                'Load Broker'
              )}
            </button>
          </div>

          <div className="mt-7 pt-6 border-t border-gray-100 flex items-center justify-center gap-3 flex-wrap">
            {['A2A Protocol', 'Dynamic Discovery', 'Real-time Trace'].map((f) => (
              <span key={f} className="text-[11px] text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          No broker?{' '}
          <button onClick={handleSimulation} disabled={loading} className="text-blue-500 hover:text-blue-600 font-medium transition-colors disabled:opacity-50">
            Try simulation mode
          </button>
        </p>
      </div>
    </div>
  );
}

// ── MuleSoft Logo SVG ─────────────────────────────────────────────────────────

function MuleSoftLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="MuleSoft">
      <rect width="36" height="36" rx="8" fill="#00A1E0" />
      {/* Stylized connectivity mark */}
      <circle cx="18" cy="18" r="4" fill="white" />
      <circle cx="9" cy="9" r="2.5" fill="white" opacity="0.85" />
      <circle cx="27" cy="9" r="2.5" fill="white" opacity="0.85" />
      <circle cx="9" cy="27" r="2.5" fill="white" opacity="0.85" />
      <circle cx="27" cy="27" r="2.5" fill="white" opacity="0.85" />
      <line x1="11" y1="11" x2="15.5" y2="15.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
      <line x1="25" y1="11" x2="20.5" y2="15.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
      <line x1="11" y1="25" x2="15.5" y2="20.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
      <line x1="25" y1="25" x2="20.5" y2="20.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
    </svg>
  );
}
