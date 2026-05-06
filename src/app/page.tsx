'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { AgentGraph } from '@/components/AgentGraph';
import { Sidebar } from '@/components/Sidebar';
import { BrokerSetup } from '@/components/BrokerSetup';
import { useAppStore } from '@/store';
import { fetchBrokerData } from '@/lib/broker';

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
  const clearTrace = useAppStore((s) => s.clearTrace);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);

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

  async function handleRefresh() {
    if (!brokerUrl || refreshing || isProcessing) return;
    setRefreshing(true);
    setRefreshError(false);

    try {
      const { agentCard, skills, nodes } = await fetchBrokerData(brokerUrl, { bustCache: true });
      clearTrace();
      setBrokerMetadata(agentCard);
      setSkills(skills);
      setAgents(nodes);
    } catch {
      setRefreshError(true);
      setTimeout(() => setRefreshError(false), 3000);
    } finally {
      setRefreshing(false);
    }
  }

  if (!brokerLoaded) {
    return <BrokerSetup />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-gray-200 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/mulesoft-logo.png"
            alt="MuleSoft from Salesforce"
            width={110}
            height={37}
            className="object-contain shrink-0"
            priority
          />
          <div className="h-4 w-px bg-gray-200 shrink-0" />
          <span className="text-sm font-semibold text-gray-700 leading-none">Agent Broker</span>
        </div>

        <div className="flex items-center gap-2.5">
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

          {isLive && (
            <button
              onClick={handleRefresh}
              disabled={refreshing || isProcessing}
              title="Refresh broker metadata"
              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                refreshError
                  ? 'bg-red-50 border-red-200 text-red-500'
                  : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={refreshing ? 'animate-spin' : ''}
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
            </button>
          )}

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

        {/* Drag handle — wider hit area with a centred visual bar */}
        <div
          onMouseDown={handleDragStart}
          className="w-4 shrink-0 cursor-col-resize self-stretch mx-0 flex items-center justify-center group"
          title="Drag to resize"
        >
          <div className="w-1 h-full rounded-full bg-gray-200 group-hover:bg-blue-400 group-active:bg-blue-500 transition-colors" />
        </div>

        {/* Sidebar */}
        <div style={{ width: sidebarWidth }} className="shrink-0 min-w-0">
          <Sidebar />
        </div>
      </main>
    </div>
  );
}
