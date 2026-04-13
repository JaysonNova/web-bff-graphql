export function isTrustedMutationRequest(
  request: Request,
  input: {
    appBaseUrl: string;
  }
) {
  const origin = request.headers.get("origin");

  if (origin) {
    return origin === input.appBaseUrl;
  }

  const fetchSite = request.headers.get("sec-fetch-site");

  if (!fetchSite) {
    return true;
  }

  return fetchSite === "same-origin" || fetchSite === "same-site";
}
