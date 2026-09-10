import type { AgentSession } from 'agora-agents';

const globalForAgentSessions = globalThis as typeof globalThis & {
  __agoraAgentSessions?: Map<string, AgentSession>;
};

const sessions =
  globalForAgentSessions.__agoraAgentSessions ??
  (globalForAgentSessions.__agoraAgentSessions = new Map());

export function storeAgentSession(agentId: string, session: AgentSession): void {
  sessions.set(agentId, session);
}

export function takeAgentSession(agentId: string): AgentSession | undefined {
  const session = sessions.get(agentId);
  sessions.delete(agentId);
  return session;
}

export function clearAgentSessions(): void {
  sessions.clear();
}
