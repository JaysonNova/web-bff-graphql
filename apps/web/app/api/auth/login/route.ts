import { NextResponse } from "next/server";

import { buildAuthorizationUrl, buildCodeChallenge } from "@/src/lib/oidc-client";
import { setNoStore } from "@/src/lib/response";
import { sanitizeRedirectPath } from "@/src/lib/safe-redirect";
import { authRequestStore } from "@/src/lib/stores";

export async function POST(request: Request) {
  const formData = await request.formData();
  const redirectPath = sanitizeRedirectPath(String(formData.get("redirectPath") ?? "/orders"));
  const authRequest = await authRequestStore.create({ redirectPath });

  return setNoStore(
    NextResponse.redirect(
    buildAuthorizationUrl({
      state: authRequest.state,
      nonce: authRequest.nonce,
      codeChallenge: buildCodeChallenge(authRequest.codeVerifier)
    }),
    {
      status: 303
    }
    )
  );
}
