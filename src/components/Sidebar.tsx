'use client';

import { useAppStore } from '@/store';
import { SidebarTab } from '@/lib/types';
import { ConversationPanel } from './ConversationPanel';
import { TracePanel } from './TracePanel';
import { SettingsPanel } from './SettingsPanel';

const TABS: { id: SidebarTab; label: string }[] = [
  { id: 'conversation', label: 'Chat' },
  { id: 'information', label: 'Trace' },
  { id: 'settings', label: 'Settings' },
];

export function Sidebar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-xs font-medium py-2.5 transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-500 -mb-px'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'conversation' && <ConversationPanel />}
        {activeTab === 'information' && <TracePanel />}
        {activeTab === 'settings' && <div className="h-full overflow-y-auto"><SettingsPanel /></div>}
      </div>
    </div>
  );
}
