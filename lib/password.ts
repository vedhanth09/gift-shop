import bcrypt from "bcryptjs";

/**
 * bcrypt password helpers. bcryptjs is Node-only — never import this file
 * from middleware (which runs on the Edge runtime). PRD §9: 12 rounds.
 */
const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
