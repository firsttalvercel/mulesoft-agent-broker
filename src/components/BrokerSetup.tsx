'use client';

import { useState, KeyboardEvent } from 'react';
import Image from 'next/image';
import { useAppStore } from '@/store';
import { AgentNodeData } from '@/lib/types';
import { fetchBrokerData } from '@/lib/broker';

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

    const { agentCard, skills, nodes } = await fetchBrokerData(trimmed);

    setBrokerMetadata(agentCard);
    setSkills(skills);
    setAgents(nodes);
    setBrokerUrl(trimmed);
    setBrokerLoaded(true);
    setLoading(false);
  }

  function handleSimulation() {
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
        <div className="flex flex-col items-center gap-3 mb-10">
          <Image
            src="/mulesoft-logo.png"
            alt="MuleSoft from Salesforce"
            width={180}
            height={60}
            className="object-contain"
            priority
          />
          <p className="text-sm font-semibold text-gray-700 tracking-tight">Agent Broker</p>
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
