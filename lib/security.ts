import type { NextRequest } from "next/server";

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (!host) throw new Error("Request host is missing.");

  const expected = `${forwardedProto}://${host}`;
  const localExpected = `http://${host}`;
  if (origin !== expected && origin !== localExpected) {
    throw new Error("Cross-origin mutation rejected.");
  }
}

