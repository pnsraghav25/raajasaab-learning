import test from "node:test";
import assert from "node:assert/strict";
import * as auth from "../lib/auth.mjs";

const alice = auth.hashPassword("correct horse 1");
const bob = auth.hashPassword("another-pass-2");
process.env.AUTH_SECRET = "x".repeat(40);
const users = `Alice:${alice.salt}:${alice.hash},bob:${bob.salt}:${bob.hash}`;

test("checks passwords (username is case-insensitive)", () => {
  process.env.AUTH_USERS = users;
  assert.equal(auth.verifyCredentials("alice", "correct horse 1")?.name, "Alice");
  assert.equal(auth.verifyCredentials("alice", "wrong"), null);
  assert.equal(auth.verifyCredentials("nobody", "correct horse 1"), null);
});

test("sessions can't be tampered with", () => {
  process.env.AUTH_USERS = users;
  const token = auth.createSession(auth.verifyCredentials("alice", "correct horse 1"));
  assert.deepEqual(auth.readSession(token), { name: "Alice" });
  assert.equal(auth.readSession(token.slice(0, -2) + "xx"), null);
  const forged = Buffer.from(JSON.stringify({ u: "bob", pv: "x", exp: Date.now() + 1e9 })).toString("base64url");
  assert.equal(auth.readSession(`${forged}.${token.split(".")[1]}`), null);
});

test("removing a user or changing a password signs them out", () => {
  process.env.AUTH_USERS = users;
  const token = auth.createSession(auth.verifyCredentials("alice", "correct horse 1"));
  const changed = auth.hashPassword("new password 99");
  process.env.AUTH_USERS = `Alice:${changed.salt}:${changed.hash}`;
  assert.equal(auth.readSession(token), null);
  process.env.AUTH_USERS = `bob:${bob.salt}:${bob.hash}`;
  assert.equal(auth.readSession(token), null);
});

test("only redirects within the site", () => {
  assert.equal(auth.safeNext("/courses/x?lesson=1"), "/courses/x?lesson=1");
  for (const bad of ["//evil.com", "https://evil.com", "/\\evil", "/login", ""]) assert.equal(auth.safeNext(bad), "/");
});
