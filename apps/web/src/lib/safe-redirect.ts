const DEFAULT_REDIRECT_PATH = "/orders";

function isAllowedOrdersDetail(pathname: string) {
  return /^\/orders\/[^/?#]+$/.test(pathname);
}

export function sanitizeRedirectPath(input: string | null | undefined) {
  if (!input || !input.startsWith("/") || input.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH;
  }

  const url = new URL(input, "http://web-bff.local");
  const pathname = url.pathname;

  if (pathname === "/orders" || pathname === "/trace" || isAllowedOrdersDetail(pathname)) {
    return pathname;
  }

  return DEFAULT_REDIRECT_PATH;
}
