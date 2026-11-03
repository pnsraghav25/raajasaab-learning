// Server-only authentication helpers (Node.js runtime).
// Never import this file from a "use client" component.
import crypto from "node:crypto";

export const SESSION_COOKIE = "dl_session";
export const SESSION_DAYS = 7;
const ITERATIONS = 210000;
const USERNAME_RE = /^[a-zA-Z0-9._-]{2,40}$/;

/* ------------------------------------------------------------------ users */
// AUTH_USERS = "alice:<salt>:<hash>,bob:<salt>:<hash>"  (create lines with: npm run add-user)
function parseUsers() {
  const users = new Map();
  for (const entry of String(process.env.AUTH_USERS || "").split(/[,\n]/)) {
    const [name, salt, hash] = entry.trim().split(":");
    if (name && salt && hash && USERNAME_RE.test(name)) users.set(name.toLowerCase(), { name, salt, hash });
  }
  return users;
}

function secret() {
  return String(process.env.AUTH_SECRET || "");
}

export function authConfigured() {
  return secret().length >= 32 && parseUsers().size > 0;
}

export function isValidUsername(name) {
  return USERNAME_RE.test(String(name || ""));
}

/* --------------------------------------------------------------- passwords */
export function hashPassword(password, salt = crypto.randomBytes(16).toString("base64url")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, ITERATIONS, 32, "sha256").toString("base64url");
  return { salt, hash };
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

let dummy = null; // used so unknown usernames take the same time as real ones

export function verifyCredentials(username, password) {
  const user = parseUsers().get(String(username || "").trim().toLowerCase());
  if (!dummy) dummy = hashPassword("not-a-real-password");
  const target = user || dummy;
  const { hash } = hashPassword(String(password || ""), target.salt);
  return safeEqual(hash, target.hash) && user ? user : null;
}

/* ---------------------------------------------------------------- sessions */
function sign(data) {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createSession(user) {
  const payload = Buffer.from(
    JSON.stringify({
      u: user.name,
      pv: user.hash.slice(0, 12), // changing a password signs that user out everywhere
      exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Returns { name } for a valid session, otherwise null. */
export function readSession(token) {
  if (!authConfigured() || typeof token !== "string" || token.length > 2000) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!data || typeof data.exp !== "number" || data.exp < Date.now()) return null;
  const user = parseUsers().get(String(data.u || "").toLowerCase());
  if (!user || user.hash.slice(0, 12) !== data.pv) return null; // removed user or changed password
  return { name: user.name };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

/** Only allow redirects back into this site. */
export function safeNext(value) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") && !v.startsWith("/login") ? v : "/";
}

/* ------------------------------------------------- login attempt limiting */
// Best effort: per server instance. Slows down password guessing.
const attempts = new Map(); // key -> { count, until }
const MAX_FAILURES = 5;
const LOCK_MS = 10 * 60 * 1000;

export function isRateLimited(key) {
  const a = attempts.get(key);
  if (!a) return false;
  if (a.until && a.until > Date.now()) return true;
  if (a.until && a.until <= Date.now()) attempts.delete(key);
  return false;
}

export function recordFailure(key) {
  const a = attempts.get(key) || { count: 0, until: 0 };
  a.count += 1;
  if (a.count >= MAX_FAILURES) {
    a.until = Date.now() + LOCK_MS;
    a.count = 0;
  }
  attempts.set(key, a);
  if (attempts.size > 5000) attempts.clear();
}

export function clearFailures(key) {
  attempts.delete(key);
}
