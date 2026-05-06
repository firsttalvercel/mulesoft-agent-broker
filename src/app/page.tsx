'use client';

import { useRef } from 'react';
import { AgentGraph } from '@/components/AgentGraph';
import { Sidebar } from '@/components/Sidebar';
import { BrokerSetup } from '@/components/BrokerSetup';
import { useAppStore } from '@/store';

const MIN_SIDEBAR = 260;
const MAX_SIDEBAR = 600;

export default function Home() {
  const isProcessing = useAppStore((s) => s.isProcessing);
  const currentStep = useAppStore((s) => s.currentStep);
  const brokerUrl = useAppStore((s) => s.brokerUrl);
  const brokerLoaded = useAppStore((s) => s.brokerLoaded);
  const sidebarWidth = useAppStore((s) => s.sidebarWidth);
  const setBrokerLoaded = useAppStore((s) => s.setBrokerLoaded);
  const setBrokerUrl = useAppStore((s) => s.setBrokerUrl);
  const setAgents = useAppStore((s) => s.setAgents);
  const setBrokerMetadata = useAppStore((s) => s.setBrokerMetadata);
  const setSkills = useAppStore((s) => s.setSkills);
  const setSidebarWidth = useAppStore((s) => s.setSidebarWidth);

  const isLive = brokerUrl.trim().length > 0;

  // Drag-to-resize refs (avoid stale closures without useCallback dependency chaining)
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseMoveRef = useRef<(e: MouseEvent) => void>(() => {});
  const onMouseUpRef = useRef<(e: MouseEvent) => void>(() => {});

  onMouseMoveRef.current = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const delta = startX.current - e.clientX;
    const newW = Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, startWidth.current + delta));
    setSidebarWidth(newW);
  };

  onMouseUpRef.current = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.removeEventListener('mousemove', onMouseMoveRef.current);
    document.removeEventListener('mouseup', onMouseUpRef.current);
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  };

  function handleDragStart(e: React.MouseEvent) {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.addEventListener('mousemove', onMouseMoveRef.current);
    document.addEventListener('mouseup', onMouseUpRef.current);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }

  if (!brokerLoaded) {
    return <BrokerSetup />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          {/* MuleSoft logo mark */}
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="MuleSoft" className="shrink-0">
            <rect width="36" height="36" rx="8" fill="#00A1E0" />
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
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold leading-none" style={{ color: '#00A1E0' }}>MuleSoft</span>
              <span className="text-sm font-semibold text-gray-900 leading-none">Agent Broker</span>
            </div>
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

          {isLive && (
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-200 max-w-[220px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] text-gray-600 truncate">{brokerUrl.replace(/^https?:\/\//, '')}</span>
            </div>
          )}

          <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border text-[11px] ${
            isLive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {isLive ? 'Live' : 'Simulation'}
          </div>

          <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border text-[11px] ${
            isProcessing ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`} />
            {isProcessing ? 'Processing' : 'Ready'}
          </div>

          <button
            onClick={() => { setBrokerLoaded(false); setBrokerUrl(''); setAgents([]); setBrokerMetadata(null); setSkills([]); }}
            className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            Change
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 min-h-0 p-4 gap-0">
        {/* Agent Graph */}
        <div className="flex-1 min-w-0 pr-2">
          <AgentGraph />
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={handleDragStart}
          className="w-1 shrink-0 cursor-col-resize rounded-full bg-gray-200 hover:bg-blue-400 active:bg-blue-500 transition-colors self-stretch mx-1"
          title="Drag to resize"
        />

        {/* Sidebar */}
        <div style={{ width: sidebarWidth }} className="shrink-0 min-w-0">
          <Sidebar />
        </div>
      </main>
    </div>
  );
}
