import { NextResponse } from "next/server";
import {
  authConfigured,
  clearFailures,
  createSession,
  isRateLimited,
  recordFailure,
  safeNext,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyCredentials,
} from "@/lib/auth.mjs";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    form = new FormData();
  }
  const username = String(form.get("username") || "").trim().slice(0, 60);
  const password = String(form.get("password") || "").slice(0, 200);
  const next = safeNext(String(form.get("next") || "/"));

  const back = (code) =>
    NextResponse.redirect(
      new URL(`/login?error=${code}${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`, request.url),
      303
    );

  if (!authConfigured()) return back("config");

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
  if (isRateLimited(ip)) return back("rate");

  const user = username && password ? verifyCredentials(username, password) : null;
  if (!user) {
    recordFailure(ip);
    return back("invalid");
  }

  clearFailures(ip);
  const res = NextResponse.redirect(new URL(next, request.url), 303);
  res.cookies.set(SESSION_COOKIE, createSession(user), sessionCookieOptions());
  return res;
}
