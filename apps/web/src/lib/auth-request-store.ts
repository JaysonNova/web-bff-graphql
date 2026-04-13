export type AuthRequestRecord = {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectPath: string;
  createdAt: string;
};

type CreateRequestInput = {
  redirectPath: string;
};

type CreateAuthRequestStoreOptions = {
  now?: () => Date;
  ttlMs?: number;
};

export const DEFAULT_AUTH_REQUEST_TTL_MS = 10 * 60 * 1_000;

function defaultNow() {
  return new Date();
}

function buildCodeVerifier() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

export function createAuthRequestStore(options: CreateAuthRequestStoreOptions = {}) {
  const requests = new Map<string, AuthRequestRecord>();
  const now = options.now ?? defaultNow;
  const ttlMs = options.ttlMs ?? DEFAULT_AUTH_REQUEST_TTL_MS;

  return {
    create(input: CreateRequestInput) {
      const createdAt = now().toISOString();
      const request: AuthRequestRecord = {
        state: crypto.randomUUID(),
        nonce: crypto.randomUUID(),
        codeVerifier: buildCodeVerifier(),
        redirectPath: input.redirectPath,
        createdAt
      };

      requests.set(request.state, request);
      return request;
    },

    consume(state: string) {
      const request = requests.get(state) ?? null;

      if (request) {
        requests.delete(state);

        if (Date.parse(request.createdAt) + ttlMs <= now().getTime()) {
          return null;
        }
      }

      return request;
    }
  };
}
