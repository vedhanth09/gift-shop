import { randomBytes, createHash } from "node:crypto";

/**
 * One-time token helpers for email verification and password resets (V1.1).
 *
 * The raw token is mailed to the user; only its SHA-256 hash is stored, so a
 * leaked database read can't be replayed against the endpoints (the same reason
 * passwords are hashed). Tokens are single-use and time-boxed by the caller.
 */

const TOKEN_BYTES = 32; // 256 bits → 64 hex chars

export interface IssuedToken {
  /** Sent to the user (in the email link). Never persisted. */
  token: string;
  /** Stored in the database and compared on redemption. */
  hash: string;
}

export function issueToken(): IssuedToken {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Common expiries, in milliseconds, for callers to add to `Date.now()`.
export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
