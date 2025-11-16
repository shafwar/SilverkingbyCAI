import { NextRequest } from "next/server";

export function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.ip ||
    null
  );
}

export function getUserAgent(request: NextRequest) {
  return request.headers.get("user-agent") || null;
}

