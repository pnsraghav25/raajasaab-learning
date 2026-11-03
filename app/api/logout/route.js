import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth.mjs";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const res = NextResponse.redirect(new URL("/login?signedOut=1", request.url), 303);
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}
