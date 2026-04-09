import type { SessionUser, TraceSnapshot } from "@demo/contracts";

type SessionTokens = {
  accessToken: string;
  idToken: string;
};

export type SessionRecord = {
  id: string;
  user: SessionUser;
  tokens: SessionTokens;
  createdAt: string;
  lastTrace: TraceSnapshot | null;
};

type CreateSessionInput = {
  user: SessionUser;
  tokens: SessionTokens;
};

export function createSessionStore() {
  const sessions = new Map<string, SessionRecord>();

  return {
    create(input: CreateSessionInput) {
      const session: SessionRecord = {
        id: crypto.randomUUID(),
        user: input.user,
        tokens: input.tokens,
        createdAt: new Date().toISOString(),
        lastTrace: null
      };

      sessions.set(session.id, session);
      return session;
    },

    get(sessionId: string) {
      return sessions.get(sessionId) ?? null;
    },

    updateTrace(sessionId: string, trace: TraceSnapshot) {
      const session = sessions.get(sessionId);

      if (!session) {
        return null;
      }

      session.lastTrace = trace;
      return session;
    },

    clear(sessionId: string) {
      sessions.delete(sessionId);
    }
  };
}
