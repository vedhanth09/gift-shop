import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * JWT + cookie helpers shared by admin and customer auth.
 *
 * Uses `jose` so the same verification logic runs in both the Node.js API
 * runtime and the Edge middleware runtime (bcrypt is Node-only and lives in
 * the password helpers below — never import those from middleware).
 */

export type Role = "admin" | "customer";

export interface SessionPayload extends JWTPayload {
  id: string;
  role: Role;
}

// --- Cookie names -----------------------------------------------------------

export const ADMIN_COOKIE = "giftly_admin";
export const CUSTOMER_COOKIE = "giftly_session";
export const CUSTOMER_REFRESH_COOKIE = "giftly_refresh";

// --- Token lifetimes (seconds) ---------------------------------------------

export const ADMIN_TOKEN_TTL = 8 * 60 * 60; // 8 hours
export const CUSTOMER_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
export const CUSTOMER_REFRESH_TTL = 30 * 24 * 60 * 60; // 30 days

function getSecret(refresh = false): Uint8Array {
  const secret = refresh
    ? process.env.JWT_REFRESH_SECRET
    : process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      `${refresh ? "JWT_REFRESH_SECRET" : "JWT_SECRET"} is not defined.`
    );
  }
  return new TextEncoder().encode(secret);
}

// --- Sign / verify ----------------------------------------------------------

export async function signToken(
  payload: { id: string; role: Role },
  ttlSeconds: number,
  refresh = false
): Promise<string> {
  return new SignJWT({ id: payload.id, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getSecret(refresh));
}

export async function verifyToken(
  token: string,
  refresh = false
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(refresh));
    if (
      typeof payload.id === "string" &&
      (payload.role === "admin" || payload.role === "customer")
    ) {
      return payload as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

// --- Cookie option builder --------------------------------------------------

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
