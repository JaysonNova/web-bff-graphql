import type { ServiceTrace } from "@demo/contracts";

import { DownstreamServiceError } from "../errors.js";

type FetchJsonInput = {
  service: string;
  baseUrl: string;
  path: string;
  trace: ServiceTrace[];
  fetchImpl: typeof fetch;
};

export async function fetchJson<T>(input: FetchJsonInput) {
  const startedAt = Date.now();
  const response = await input.fetchImpl(new URL(input.path, input.baseUrl), {
    headers: {
      accept: "application/json"
    }
  });
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const detail = await response.text();
    input.trace.push({
      service: input.service,
      path: input.path,
      status: "error",
      durationMs,
      detail
    });

    throw new DownstreamServiceError(
      response.status === 404 ? "NOT_FOUND" : "DOWNSTREAM_SERVICE_ERROR",
      input.service,
      input.path,
      response.status,
      detail
    );
  }

  const data = (await response.json()) as T;

  input.trace.push({
    service: input.service,
    path: input.path,
    status: "ok",
    durationMs
  });

  return data;
}
