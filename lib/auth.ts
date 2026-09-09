import { createHmac, timingSafeEqual } from "crypto";

export const AUTH_COOKIE_NAME = "circuits_auth";
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET env var is not set");
  return secret;
}

export function expectedAuthToken(): string {
  return createHmac("sha256", sessionSecret()).update("authenticated").digest("hex");
}

export function verifyPasscode(input: string): boolean {
  const expected = process.env.APP_PASSCODE;
  if (!expected) throw new Error("APP_PASSCODE env var is not set");
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isAuthTokenValid(token: string | undefined): boolean {
  if (!token) return false;
  const expected = expectedAuthToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: AUTH_COOKIE_MAX_AGE,
};
