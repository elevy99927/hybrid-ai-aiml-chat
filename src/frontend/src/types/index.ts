// Message types
export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  source: 'user' | 'aiml' | 'ai';
  sessionId: string;
}

// AIML types
export interface AimlPattern {
  id: string;
  pattern: string;
  template: string;
  priority: number;
  category?: string;
}

// Session types
export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
}

// System status types
export interface SystemStatus {
  aimlEngine: {
    loaded: boolean;
    patternCount: number;
    lastReload: Date;
  };
  liteLLM: {
    connected: boolean;
    lastCheck: Date;
    responseTime?: number;
  };
  uptime: number;
}

// API request/response types
export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  response: string;
  source: 'aiml' | 'ai';
  sessionId: string;
}