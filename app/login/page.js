import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { authConfigured, readSession, safeNext, SESSION_COOKIE } from "@/lib/auth.mjs";

export const metadata = { title: "Sign in · raajasaab-learning" };
export const dynamic = "force-dynamic";

const MESSAGES = {
  invalid: "That username or password isn't right.",
  rate: "Too many attempts. Please wait 10 minutes and try again.",
  config: "Sign-in isn't set up on the server yet (AUTH_SECRET / AUTH_USERS missing).",
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const next = safeNext(typeof params?.next === "string" ? params.next : "/");

  const store = await cookies();
  if (readSession(store.get(SESSION_COOKIE)?.value)) redirect(next);

  const errorKey = typeof params?.error === "string" ? params.error : "";
  const error = !authConfigured() ? MESSAGES.config : MESSAGES[errorKey];
  const signedOut = params?.signedOut === "1" && !error;

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/4 h-120 w-120 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-40 right-1/4 h-120 w-120] rounded-full bg-accent/15 blur-[120px]" />
      </div>

      <div className="dl-fade-up w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-2xl shadow-xl shadow-primary/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-new.webp"
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
            />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
            raajasaab<span className="text-primary">-learning</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Sign in to continue learning.</p>
        </div>

        <form
          action="/api/login"
          method="post"
          className="space-y-5 rounded-3xl border border-border bg-card/80 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8"
        >
          <input type="hidden" name="next" value={next} />

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
          {signedOut && (
            <p role="status" className="flex items-start gap-2 rounded-2xl bg-accent/10 px-4 py-3 text-sm text-accent">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              You&apos;ve been signed out.
            </p>
          )}

          <label className="block text-sm font-semibold">
            Username
            <input
              name="username"
              required
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={60}
              className="mt-2 h-11 w-full rounded-xl border border-border bg-background/60 px-4 text-sm font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </label>

          <label className="block text-sm font-semibold">
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              maxLength={200}
              className="mt-2 h-11 w-full rounded-xl border border-border bg-background/60 px-4 text-sm font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </label>

          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[.98]"
          >
            <Lock className="h-4 w-4" />
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Private site — access by invitation only.
        </p>
      </div>
    </main>
  );
}
