'use client';

import { useState, KeyboardEvent } from 'react';
import { useAppStore } from '@/store';

export function BrokerSetup() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setBrokerUrl = useAppStore((s) => s.setBrokerUrl);
  const setBrokerLoaded = useAppStore((s) => s.setBrokerLoaded);

  async function handleLoad() {
    const trimmed = url.trim();
    if (!trimmed) return;

    try {
      new URL(trimmed);
    } catch {
      setError('Please enter a valid URL (e.g. https://...)');
      return;
    }

    setError('');
    setLoading(true);

    // Simulated broker initialization handshake
    await new Promise((r) => setTimeout(r, 1400));

    setBrokerUrl(trimmed);
    setBrokerLoaded(true);
    setLoading(false);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleLoad();
  }

  function handleSimulation() {
    setBrokerUrl('');
    setBrokerLoaded(true);
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
            <h1 className="text-lg font-semibold text-gray-900 leading-none">MuleSoft Agent Broker</h1>
            <p className="text-xs text-gray-400 mt-0.5">Energy Intelligence Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Connect your Broker</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Enter your Agent Broker URL to initialize the orchestration network and visualize agent routing in real time.
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
                  Initializing Broker...
                </>
              ) : (
                'Load Broker'
              )}
            </button>
          </div>

          {/* Feature pills */}
          <div className="mt-7 pt-6 border-t border-gray-100 flex items-center justify-center gap-3 flex-wrap">
            {['Multi-Agent Routing', 'Real-time Trace', 'Skills Library'].map((f) => (
              <span key={f} className="text-[11px] text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Simulation mode link */}
        <p className="text-center text-xs text-gray-400 mt-5">
          No broker yet?{' '}
          <button onClick={handleSimulation} className="text-blue-500 hover:text-blue-600 font-medium transition-colors">
            Try simulation mode
          </button>
        </p>
      </div>
    </div>
  );
}
