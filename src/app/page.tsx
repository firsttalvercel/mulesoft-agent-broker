'use client';

import { AgentGraph } from '@/components/AgentGraph';
import { Sidebar } from '@/components/Sidebar';
import { BrokerSetup } from '@/components/BrokerSetup';
import { useAppStore } from '@/store';

export default function Home() {
  const isProcessing = useAppStore((s) => s.isProcessing);
  const currentStep = useAppStore((s) => s.currentStep);
  const brokerUrl = useAppStore((s) => s.brokerUrl);
  const brokerLoaded = useAppStore((s) => s.brokerLoaded);
  const setBrokerLoaded = useAppStore((s) => s.setBrokerLoaded);
  const setBrokerUrl = useAppStore((s) => s.setBrokerUrl);

  const isLive = brokerUrl.trim().length > 0;

  if (!brokerLoaded) {
    return <BrokerSetup />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="2.5" fill="white" />
              <path d="M7 1V3M7 11V13M1 7H3M11 7H13M2.93 2.93L4.34 4.34M9.66 9.66L11.07 11.07M11.07 2.93L9.66 4.34M4.34 9.66L2.93 11.07" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 leading-none">MuleSoft Agent Broker</h1>
            <p className="text-[10px] text-gray-400 mt-0.5">Energy Intelligence Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isProcessing && currentStep && (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping shrink-0" />
              <span className="text-[11px] text-gray-500">{currentStep}</span>
            </div>
          )}

          {/* Broker badge */}
          {isLive && (
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-200 max-w-[200px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] text-gray-600 truncate">{brokerUrl.replace(/^https?:\/\//, '')}</span>
            </div>
          )}

          {/* Live / Simulation badge */}
          <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border text-[11px] ${
            isLive
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {isLive ? 'Live' : 'Simulation'}
          </div>

          {/* Processing badge */}
          <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border text-[11px] ${
            isProcessing
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`} />
            {isProcessing ? 'Processing' : 'Ready'}
          </div>

          {/* Disconnect */}
          <button
            onClick={() => { setBrokerLoaded(false); setBrokerUrl(''); }}
            className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            title="Change broker"
          >
            Change
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 min-h-0 gap-4 p-4">
        {/* Agent Graph */}
        <div className="flex-1 min-w-0">
          <AgentGraph />
        </div>

        {/* Sidebar */}
        <div className="w-80 shrink-0">
          <Sidebar />
        </div>
      </main>
    </div>
  );
}
