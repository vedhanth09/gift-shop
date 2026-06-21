/**
 * One-time admin seed. PRD §3.1 / §17.1: exactly one admin account, created
 * here — never via the UI. Re-running is safe (idempotent): it updates the
 * existing admin's password instead of creating a duplicate.
 *
 * Usage:  npm run seed:admin
 *
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD from .env.local. dotenv must be
 * configured BEFORE importing anything that reads process.env at load time
 * (lib/db.ts throws on a missing MONGODB_URI), so models are pulled in via
 * dynamic import after config().
 */
import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.local.");
  }
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be set in .env.local.");
  }

  const mongoose = (await import("mongoose")).default;
  const { hashPassword } = await import("../lib/password");
  const User = (await import("../models/User")).default;

  await mongoose.connect(process.env.MONGODB_URI);

  const hashed = await hashPassword(password);

  const existing = await User.findOne({ role: "admin" });

  if (existing) {
    existing.email = email;
    existing.password = hashed;
    await existing.save();
    console.log(`✓ Admin account updated: ${email}`);
  } else {
    await User.create({
      name: "Store Owner",
      email,
      password: hashed,
      role: "admin",
    });
    console.log(`✓ Admin account created: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Admin seed failed:", err);
  process.exit(1);
});
