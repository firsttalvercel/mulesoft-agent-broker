'use client';

import { useAppStore } from '@/store';
import { SidebarTab } from '@/lib/types';
import { ConversationPanel } from './ConversationPanel';
import { TracePanel } from './TracePanel';
import { SettingsPanel } from './SettingsPanel';
import { SkillsPanel } from './SkillsPanel';

const TABS: { id: SidebarTab; label: string }[] = [
  { id: 'conversation', label: 'Chat' },
  { id: 'skills', label: 'Skills' },
  { id: 'information', label: 'Trace' },
  { id: 'settings', label: 'Settings' },
];

export function Sidebar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const skills = useAppStore((s) => s.skills);

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-xs font-medium py-2.5 transition-colors relative ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-500 -mb-px'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
            {tab.id === 'skills' && skills.length > 0 && (
              <span className="ml-1 text-[10px] bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 font-semibold">
                {skills.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'conversation' && <ConversationPanel />}
        {activeTab === 'skills' && <SkillsPanel />}
        {activeTab === 'information' && <TracePanel />}
        {activeTab === 'settings' && <div className="h-full overflow-y-auto"><SettingsPanel /></div>}
      </div>
    </div>
  );
}
