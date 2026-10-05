import crypto from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** value = "<payload>.<hmac>" — a minimal signed token, no external JWT lib needed for a single static claim. */
export function signSessionValue(payload: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

export function verifySessionValue(token: string, secret: string): boolean {
  const [payload, hmac] = token.split(".");
  if (!payload || !hmac) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function verifyPassword(plain: string): Promise<boolean> {
  return bcrypt.compare(plain, env.ADMIN_PASSWORD_HASH);
}

export async function createSessionCookie(): Promise<void> {
  const token = signSessionValue("admin", env.SESSION_SECRET);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionValue(token, env.SESSION_SECRET);
}
