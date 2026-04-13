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
  lastSeenAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  lastTrace: TraceSnapshot | null;
};

type CreateSessionInput = {
  user: SessionUser;
  tokens: SessionTokens;
};

type CreateSessionStoreOptions = {
  now?: () => Date;
  idleTimeoutMs?: number;
  absoluteTimeoutMs?: number;
};

export const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1_000;
export const DEFAULT_ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1_000;

function defaultNow() {
  return new Date();
}

function nextIdleExpiry(now: Date, absoluteExpiresAt: string, idleTimeoutMs: number) {
  const candidate = new Date(now.getTime() + idleTimeoutMs).toISOString();
  return candidate < absoluteExpiresAt ? candidate : absoluteExpiresAt;
}

function isExpired(session: SessionRecord, now: Date) {
  return now.toISOString() >= session.idleExpiresAt || now.toISOString() >= session.absoluteExpiresAt;
}

export function createSessionStore(options: CreateSessionStoreOptions = {}) {
  const sessions = new Map<string, SessionRecord>();
  const now = options.now ?? defaultNow;
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const absoluteTimeoutMs = options.absoluteTimeoutMs ?? DEFAULT_ABSOLUTE_TIMEOUT_MS;

  return {
    async create(input: CreateSessionInput) {
      const createdAt = now();
      const createdAtIso = createdAt.toISOString();
      const absoluteExpiresAt = new Date(createdAt.getTime() + absoluteTimeoutMs).toISOString();
      const session: SessionRecord = {
        id: crypto.randomUUID(),
        user: input.user,
        tokens: input.tokens,
        createdAt: createdAtIso,
        lastSeenAt: createdAtIso,
        idleExpiresAt: nextIdleExpiry(createdAt, absoluteExpiresAt, idleTimeoutMs),
        absoluteExpiresAt,
        lastTrace: null
      };

      sessions.set(session.id, session);
      return session;
    },

    async get(sessionId: string) {
      const session = sessions.get(sessionId) ?? null;

      if (!session) {
        return null;
      }

      const currentTime = now();

      if (isExpired(session, currentTime)) {
        sessions.delete(sessionId);
        return null;
      }

      session.lastSeenAt = currentTime.toISOString();
      session.idleExpiresAt = nextIdleExpiry(currentTime, session.absoluteExpiresAt, idleTimeoutMs);

      return session;
    },

    async updateTrace(sessionId: string, trace: TraceSnapshot | null) {
      const session = sessions.get(sessionId);

      if (!session || !trace) {
        return null;
      }

      session.lastTrace = trace;
      return session;
    },

    async clear(sessionId: string) {
      sessions.delete(sessionId);
    }
  };
}
