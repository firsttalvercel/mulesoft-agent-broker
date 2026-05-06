export type AgentStatus = 'idle' | 'active' | 'complete' | 'error';
export type AgentType = 'broker' | 'agent' | 'mcp' | 'llm';
export type TraceEventType = 'routing' | 'api_call' | 'response' | 'error';
export type MessageRole = 'user' | 'agent' | 'system';
export type SidebarTab = 'conversation' | 'information' | 'settings';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  agentId?: string;
  agentName?: string;
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
