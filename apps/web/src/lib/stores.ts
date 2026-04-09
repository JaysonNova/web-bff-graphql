import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { AuthRequestRecord } from "./auth-request-store";
import type { SessionRecord } from "./session-store";

type PersistedState = {
  authRequests: Record<string, AuthRequestRecord>;
  sessions: Record<string, SessionRecord>;
};

const stateFilePath = process.env.DEMO_STATE_FILE ?? path.join(os.tmpdir(), "web-bff-graphql-demo-state.json");

function emptyState(): PersistedState {
  return {
    authRequests: {},
    sessions: {}
  };
}

function readState(): PersistedState {
  try {
    const raw = fs.readFileSync(stateFilePath, "utf8");
    return JSON.parse(raw) as PersistedState;
  } catch {
    return emptyState();
  }
}

function writeState(state: PersistedState) {
  fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
}

export const authRequestStore = {
  create(input: { redirectPath: string }) {
    const state = readState();
    const request: AuthRequestRecord = {
      state: crypto.randomUUID(),
      nonce: crypto.randomUUID(),
      redirectPath: input.redirectPath,
      createdAt: new Date().toISOString()
    };

    state.authRequests[request.state] = request;
    writeState(state);

    return request;
  },

  consume(authState: string) {
    const state = readState();
    const request = state.authRequests[authState] ?? null;

    if (request) {
      delete state.authRequests[authState];
      writeState(state);
    }

    return request;
  }
};

export const sessionStore = {
  create(input: Omit<SessionRecord, "id" | "createdAt" | "lastTrace">) {
    const state = readState();
    const session: SessionRecord = {
      id: crypto.randomUUID(),
      user: input.user,
      tokens: input.tokens,
      createdAt: new Date().toISOString(),
      lastTrace: null
    };

    state.sessions[session.id] = session;
    writeState(state);

    return session;
  },

  get(sessionId: string) {
    const state = readState();
    return state.sessions[sessionId] ?? null;
  },

  updateTrace(sessionId: string, trace: SessionRecord["lastTrace"]) {
    const state = readState();
    const session = state.sessions[sessionId];

    if (!session || !trace) {
      return null;
    }

    session.lastTrace = trace;
    writeState(state);

    return session;
  },

  clear(sessionId: string) {
    const state = readState();

    if (state.sessions[sessionId]) {
      delete state.sessions[sessionId];
      writeState(state);
    }
  }
};
