import { NextResponse } from "next/server";

import { buildAuthorizationUrl } from "@/src/lib/oidc-client";
import { authRequestStore } from "@/src/lib/stores";

export async function POST(request: Request) {
  const formData = await request.formData();
  const redirectPath = String(formData.get("redirectPath") ?? "/orders");
  const authRequest = authRequestStore.create({ redirectPath });

  return NextResponse.redirect(
    buildAuthorizationUrl({
      state: authRequest.state,
      nonce: authRequest.nonce
    }),
    {
      status: 303
    }
  );
}
