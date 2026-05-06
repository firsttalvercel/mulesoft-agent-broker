'use client';

import { useAppStore } from '@/store';

const LLM_OPTIONS = ['Gemini 2.5 Flash Lite', 'Gemini 2.5 Flash', 'Gemini 2.5 Pro', 'Claude Sonnet 4.6', 'Claude Opus 4.6'];

export function SettingsPanel() {
  const selectedLLM = useAppStore((s) => s.selectedLLM);
  const simulateLatency = useAppStore((s) => s.simulateLatency);
  const simulateErrors = useAppStore((s) => s.simulateErrors);
  const verbosity = useAppStore((s) => s.verbosity);
  const brokerUrl = useAppStore((s) => s.brokerUrl);
  const setSelectedLLM = useAppStore((s) => s.setSelectedLLM);
  const setSimulateLatency = useAppStore((s) => s.setSimulateLatency);
  const setSimulateErrors = useAppStore((s) => s.setSimulateErrors);
  const setVerbosity = useAppStore((s) => s.setVerbosity);
  const setBrokerLoaded = useAppStore((s) => s.setBrokerLoaded);
  const setBrokerUrl = useAppStore((s) => s.setBrokerUrl);

  const isLive = brokerUrl.trim().length > 0;

  return (
    <div className="px-4 py-4 space-y-6">

      {/* Connection */}
      <Section label="Connection">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isLive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            <span className="text-xs font-medium text-gray-700">{isLive ? 'Live Broker' : 'Simulation Mode'}</span>
          </div>
          {isLive && (
            <p className="text-[11px] text-gray-500 break-all leading-relaxed">{brokerUrl}</p>
          )}
          <button
            onClick={() => { setBrokerLoaded(false); setBrokerUrl(''); }}
            className="text-[11px] text-blue-500 hover:text-blue-700 transition-colors"
          >
            {isLive ? 'Change Broker' : 'Connect a Broker'}
          </button>
        </div>
      </Section>

      {/* LLM Selection — only relevant in simulation mode */}
      {!isLive && (
        <Section label="Language Model">
          <div className="space-y-1.5">
            {LLM_OPTIONS.map((llm) => (
              <button
                key={llm}
                onClick={() => setSelectedLLM(llm)}
                className={`w-full text-left text-xs rounded-lg px-3 py-2 border transition-colors ${
                  selectedLLM === llm
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-white'
                }`}
              >
                {llm}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Simulation */}
      {!isLive && (
        <Section label="Simulation">
          <div className="space-y-3">
            <Toggle
              label="Simulate Latency"
              description="Add realistic processing delays"
              value={simulateLatency}
              onChange={setSimulateLatency}
            />
            <Toggle
              label="Simulate Errors"
              description="Occasionally inject rate limit errors"
              value={simulateErrors}
              onChange={setSimulateErrors}
            />
          </div>
        </Section>
      )}

      {/* Verbosity */}
      <Section label="Trace Verbosity">
        <div className="space-y-1.5">
          {(['low', 'medium', 'high'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setVerbosity(level)}
              className={`w-full text-left text-xs rounded-lg px-3 py-2 border transition-colors capitalize ${
                verbosity === level
                  ? 'bg-violet-50 border-violet-300 text-violet-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-white'
              }`}
            >
              {level}
              <span className="ml-2 text-gray-400">
                {level === 'low' && '— API calls & responses only'}
                {level === 'medium' && '— includes routing events'}
                {level === 'high' && '— all events + payloads'}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* About */}
      <Section label="About">
        <div className="text-[11px] text-gray-400 space-y-1 leading-relaxed">
          <p>MuleSoft Agent Broker demo — an AI-powered integration layer that routes natural language queries to specialized agents via a central broker.</p>
          <p className="pt-1 text-gray-300">Stack: Next.js 16 · React 19 · Zustand · ReactFlow · Tailwind CSS 4</p>
        </div>
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">{label}</p>
      {children}
    </div>
  );
}

function Toggle({ label, description, value, onChange }: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs text-gray-700">{label}</p>
        <p className="text-[10px] text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors ${
          value ? 'bg-blue-600 border-blue-600' : 'bg-gray-200 border-gray-200'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform mt-px ${
            value ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
