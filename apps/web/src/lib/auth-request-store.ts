export type AuthRequestRecord = {
  state: string;
  nonce: string;
  redirectPath: string;
  createdAt: string;
};

type CreateRequestInput = {
  redirectPath: string;
};

export function createAuthRequestStore() {
  const requests = new Map<string, AuthRequestRecord>();

  return {
    create(input: CreateRequestInput) {
      const request: AuthRequestRecord = {
        state: crypto.randomUUID(),
        nonce: crypto.randomUUID(),
        redirectPath: input.redirectPath,
        createdAt: new Date().toISOString()
      };

      requests.set(request.state, request);
      return request;
    },

    consume(state: string) {
      const request = requests.get(state) ?? null;

      if (request) {
        requests.delete(state);
      }

      return request;
    }
  };
}
