import { create } from 'zustand';
import { Message, AgentNodeData, TraceEvent, SidebarTab, AgentSkill, AgentCard } from '@/lib/types';

interface AppState {
  messages: Message[];
  agents: AgentNodeData[];
  activeAgentId: string | null;
  traceEvents: TraceEvent[];
  isProcessing: boolean;
  currentStep: string;
  activeTab: SidebarTab;
  selectedLLM: string;
  simulateLatency: boolean;
  simulateErrors: boolean;
  verbosity: 'low' | 'medium' | 'high';
  brokerUrl: string;
  brokerLoaded: boolean;
  sidebarWidth: number;
  brokerMetadata: AgentCard | null;
  skills: AgentSkill[];
  setAgents: (agents: AgentNodeData[]) => void;
  setBrokerUrl: (url: string) => void;
  setBrokerLoaded: (val: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setBrokerMetadata: (card: AgentCard | null) => void;
  setSkills: (skills: AgentSkill[]) => void;
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
  addTraceEvent: (event: Omit<TraceEvent, 'id' | 'timestamp'>) => void;
  setAgentStatus: (agentId: string, status: AgentNodeData['status']) => void;
  setActiveAgent: (agentId: string | null) => void;
  setProcessing: (val: boolean) => void;
  setCurrentStep: (step: string) => void;
  setActiveTab: (tab: SidebarTab) => void;
  setSelectedLLM: (llm: string) => void;
  setSimulateLatency: (val: boolean) => void;
  setSimulateErrors: (val: boolean) => void;
  setVerbosity: (val: 'low' | 'medium' | 'high') => void;
  resetAgentStatuses: () => void;
  clearTrace: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  messages: [],
  agents: [],
  activeAgentId: null,
  traceEvents: [],
  isProcessing: false,
  currentStep: '',
  activeTab: 'conversation',
  selectedLLM: 'Gemini 2.5 Flash Lite',
  simulateLatency: true,
  simulateErrors: false,
  verbosity: 'medium',
  brokerUrl: '',
  brokerLoaded: false,
  sidebarWidth: 420,
  brokerMetadata: null,
  skills: [],

  setAgents: (agents) => set({ agents }),
  setBrokerUrl: (url) => set({ brokerUrl: url }),
  setBrokerLoaded: (val) => set({ brokerLoaded: val }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setBrokerMetadata: (card) => set({ brokerMetadata: card }),
  setSkills: (skills) => set({ skills }),
  addMessage: (msg) => set((s) => ({
    messages: [...s.messages, { ...msg, id: crypto.randomUUID(), timestamp: new Date() }],
  })),
  addTraceEvent: (event) => set((s) => ({
    traceEvents: [...s.traceEvents, { ...event, id: crypto.randomUUID(), timestamp: new Date() }],
  })),
  setAgentStatus: (agentId, status) => set((s) => ({
    agents: s.agents.map((a) => a.id === agentId ? { ...a, status } : a),
  })),
  setActiveAgent: (agentId) => set({ activeAgentId: agentId }),
  setProcessing: (val) => set({ isProcessing: val }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedLLM: (llm) => set({ selectedLLM: llm }),
  setSimulateLatency: (val) => set({ simulateLatency: val }),
  setSimulateErrors: (val) => set({ simulateErrors: val }),
  setVerbosity: (val) => set({ verbosity: val }),
  resetAgentStatuses: () => set((s) => ({
    agents: s.agents.map((a) => ({ ...a, status: 'idle' })),
    activeAgentId: null,
    currentStep: '',
  })),
  clearTrace: () => set({ traceEvents: [] }),
}));
