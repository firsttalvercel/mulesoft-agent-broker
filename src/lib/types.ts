export type AgentStatus = 'idle' | 'active' | 'complete' | 'error';
export type AgentType = 'broker' | 'agent' | 'mcp' | 'llm' | 'user';
export type TraceEventType = 'routing' | 'api_call' | 'response' | 'error';
export type MessageRole = 'user' | 'agent' | 'system';
export type SidebarTab = 'conversation' | 'skills' | 'information' | 'settings';

export interface AgentSkill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  examples?: string[];
}

export interface AgentCard {
  name?: string;
  description?: string;
  version?: string;
  url?: string;
  skills?: AgentSkill[];
  capabilities?: {
    streaming?: boolean;
    pushNotifications?: boolean;
    stateTransitionHistory?: boolean;
  };
}

export interface MessageAttribution {
  name: string;
  type: AgentType;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  agentId?: string;
  agentName?: string;
  attribution?: MessageAttribution[];
  timestamp: Date;
}

export interface AgentNodeData {
  id: string;
  name: string;
  status: AgentStatus;
  type: AgentType;
  description: string;
}

export interface TraceEvent {
  id: string;
  timestamp: Date;
  type: TraceEventType;
  agentId: string;
  agentName: string;
  message: string;
  data?: unknown;
}
