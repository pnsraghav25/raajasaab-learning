import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, SESSION_COOKIE } from "./auth.mjs";

/** Server-side check on every page (second layer behind proxy.js). */
export async function requireUser(nextPath = "/") {
  const store = await cookies();
  const session = readSession(store.get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return session;
}
