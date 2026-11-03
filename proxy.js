import { NextResponse } from "next/server";
import { readSession, SESSION_COOKIE } from "./lib/auth.mjs";

// Runs before every matched request. Anyone without a valid session is sent to /login.
export function proxy(request) {
  const session = readSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const { pathname, search } = request.nextUrl;
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  // Everything except Next.js build assets, image files and the login/logout endpoints.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|api/login|api/logout|.*\\.(?:webp|png|jpg|jpeg|svg|gif|ico)$).*)",
  ],
};
