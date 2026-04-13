import { createClient } from "redis";

import {
  createAuthRequestStore,
  DEFAULT_AUTH_REQUEST_TTL_MS,
  type AuthRequestRecord
} from "./auth-request-store";
import {
  createSessionStore,
  DEFAULT_ABSOLUTE_TIMEOUT_MS,
  DEFAULT_IDLE_TIMEOUT_MS,
  type SessionRecord
} from "./session-store";

const memoryAuthRequestStore = createAuthRequestStore();
const memorySessionStore = createSessionStore();

type RedisLikeClient = {
  get(key: string): Promise<string | null>;
  getDel(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  set(key: string, value: string, options: { EX: number }): Promise<string | null>;
};

let redisClientPromise: Promise<RedisLikeClient> | null = null;

function getRedisUrl() {
  return process.env.REDIS_URL ?? "";
}

async function getRedisClient() {
  const redisUrl = getRedisUrl();

  if (!redisUrl) {
    return null;
  }

  if (!redisClientPromise) {
    const client = createClient({
      url: redisUrl
    });
    redisClientPromise = client.connect().then(() => client as RedisLikeClient);
  }

  return redisClientPromise;
}

function authRequestKey(state: string) {
  return `web-bff:auth-requests:${state}`;
}

function sessionKey(sessionId: string) {
  return `web-bff:sessions:${sessionId}`;
}

function buildCodeVerifier() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

function nextIdleExpiry(now: Date, absoluteExpiresAt: string, idleTimeoutMs: number) {
  const candidate = new Date(now.getTime() + idleTimeoutMs).toISOString();
  return candidate < absoluteExpiresAt ? candidate : absoluteExpiresAt;
}

function isExpired(session: SessionRecord, now: Date) {
  const nowIso = now.toISOString();
  return nowIso >= session.idleExpiresAt || nowIso >= session.absoluteExpiresAt;
}

function sessionTtlSeconds(session: SessionRecord, now = Date.now()) {
  const remainingMs = Math.min(Date.parse(session.idleExpiresAt) - now, Date.parse(session.absoluteExpiresAt) - now);
  return Math.max(1, Math.ceil(remainingMs / 1_000));
}

function buildSessionRecord(input: Omit<SessionRecord, "id" | "createdAt" | "lastSeenAt" | "idleExpiresAt" | "absoluteExpiresAt" | "lastTrace">) {
  const createdAt = new Date();
  const createdAtIso = createdAt.toISOString();
  const absoluteExpiresAt = new Date(createdAt.getTime() + DEFAULT_ABSOLUTE_TIMEOUT_MS).toISOString();

  return {
    id: crypto.randomUUID(),
    user: input.user,
    tokens: input.tokens,
    createdAt: createdAtIso,
    lastSeenAt: createdAtIso,
    idleExpiresAt: nextIdleExpiry(createdAt, absoluteExpiresAt, DEFAULT_IDLE_TIMEOUT_MS),
    absoluteExpiresAt,
    lastTrace: null
  } satisfies SessionRecord;
}

async function readSessionFromRedis(client: RedisLikeClient, sessionId: string) {
  const raw = await client.get(sessionKey(sessionId));

  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as SessionRecord;
}

async function writeSessionToRedis(client: RedisLikeClient, session: SessionRecord) {
  await client.set(sessionKey(session.id), JSON.stringify(session), {
    EX: sessionTtlSeconds(session)
  });
}

export const authRequestStore = {
  async create(input: { redirectPath: string }) {
    const client = await getRedisClient();

    if (!client) {
      return memoryAuthRequestStore.create(input);
    }

    const request: AuthRequestRecord = {
      state: crypto.randomUUID(),
      nonce: crypto.randomUUID(),
      codeVerifier: buildCodeVerifier(),
      redirectPath: input.redirectPath,
      createdAt: new Date().toISOString()
    };

    await client.set(authRequestKey(request.state), JSON.stringify(request), {
      EX: Math.ceil(DEFAULT_AUTH_REQUEST_TTL_MS / 1_000)
    });

    return request;
  },

  async consume(authState: string) {
    const client = await getRedisClient();

    if (!client) {
      return memoryAuthRequestStore.consume(authState);
    }

    const raw = await client.getDel(authRequestKey(authState));
    return raw ? (JSON.parse(raw) as AuthRequestRecord) : null;
  }
};

export const sessionStore = {
  async create(input: Omit<SessionRecord, "id" | "createdAt" | "lastSeenAt" | "idleExpiresAt" | "absoluteExpiresAt" | "lastTrace">) {
    const client = await getRedisClient();

    if (!client) {
      return memorySessionStore.create(input);
    }

    const session = buildSessionRecord(input);
    await writeSessionToRedis(client, session);
    return session;
  },

  async get(sessionId: string) {
    const client = await getRedisClient();

    if (!client) {
      return memorySessionStore.get(sessionId);
    }

    const session = await readSessionFromRedis(client, sessionId);

    if (!session) {
      return null;
    }

    const now = new Date();

    if (isExpired(session, now)) {
      await client.del(sessionKey(sessionId));
      return null;
    }

    session.lastSeenAt = now.toISOString();
    session.idleExpiresAt = nextIdleExpiry(now, session.absoluteExpiresAt, DEFAULT_IDLE_TIMEOUT_MS);
    await writeSessionToRedis(client, session);

    return session;
  },

  async updateTrace(sessionId: string, trace: SessionRecord["lastTrace"]) {
    if (!trace) {
      return null;
    }

    const client = await getRedisClient();

    if (!client) {
      return memorySessionStore.updateTrace(sessionId, trace);
    }

    const session = await readSessionFromRedis(client, sessionId);

    if (!session) {
      return null;
    }

    session.lastTrace = trace;
    await writeSessionToRedis(client, session);

    return session;
  },

  async clear(sessionId: string) {
    const client = await getRedisClient();

    if (!client) {
      await memorySessionStore.clear(sessionId);
      return;
    }

    await client.del(sessionKey(sessionId));
  }
};
