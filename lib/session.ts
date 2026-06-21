import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  CUSTOMER_COOKIE,
  verifyToken,
  type SessionPayload,
} from "./auth";

/**
 * Read the current session from httpOnly cookies inside Server Components,
 * Route Handlers, or Server Actions. Returns null when unauthenticated.
 */
export async function getAdminSession(): Promise<SessionPayload | null> {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  return session?.role === "admin" ? session : null;
}

export async function getCustomerSession(): Promise<SessionPayload | null> {
  const token = cookies().get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  return session?.role === "customer" ? session : null;
}

/** Throws if the caller is not an authenticated admin. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getAdminSession();
  if (!session) throw new Error("Unauthorized: admin session required.");
  return session;
}

/** Throws if the caller is not an authenticated customer. */
export async function requireCustomer(): Promise<SessionPayload> {
  const session = await getCustomerSession();
  if (!session) throw new Error("Unauthorized: customer session required.");
  return session;
}
