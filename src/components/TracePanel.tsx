'use client';

import { useAppStore } from '@/store';
import { TraceEvent } from '@/lib/types';
import { useRef, useEffect } from 'react';

const EVENT_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  routing: { label: 'ROUTE', color: 'text-violet-600', bg: 'bg-violet-50' },
  api_call: { label: 'CALL', color: 'text-blue-600', bg: 'bg-blue-50' },
  response: { label: 'RESP', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  error: { label: 'ERR', color: 'text-red-600', bg: 'bg-red-50' },
};

export function TracePanel() {
  const traceEvents = useAppStore((s) => s.traceEvents);
  const clearTrace = useAppStore((s) => s.clearTrace);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [traceEvents]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-600">
          {traceEvents.length} event{traceEvents.length !== 1 ? 's' : ''}
        </span>
        {traceEvents.length > 0 && (
          <button
            onClick={clearTrace}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3 font-mono">
        {traceEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400 text-center leading-relaxed">
              Trace events appear here when<br />the broker processes a query.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {traceEvents.map((event) => (
              <TraceRow key={event.id} event={event} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function TraceRow({ event }: { event: TraceEvent }) {
  const style = EVENT_STYLES[event.type] ?? { label: 'INFO', color: 'text-gray-500', bg: 'bg-gray-50' };
  const time = event.timestamp.toTimeString().slice(0, 8);

  return (
    <div className="flex items-start gap-2.5 text-[13px] hover:bg-gray-50 rounded-lg px-2 py-2 transition-colors">
      <span className="text-gray-400 shrink-0 tabular-nums leading-relaxed">{time}</span>
      <span className={`shrink-0 font-bold w-12 leading-relaxed ${style.color}`}>{style.label}</span>
      <div className="min-w-0 leading-relaxed">
        <span className="text-gray-500 font-medium">[{event.agentName}]</span>{' '}
        <span className="text-gray-700 break-words">{event.message}</span>
      </div>
    </div>
  );
}
