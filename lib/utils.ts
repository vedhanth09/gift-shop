/** Convert a title into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Basic email shape check for server-side validation. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- Money ------------------------------------------------------------------
// Prices are stored in the smallest currency unit (paise) per PRD §7. The admin
// forms work in rupees for usability; convert at the client/server boundary.

/** Rupees (may have decimals) → integer paise. */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Integer paise → rupees (number, for form inputs). */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** Format integer paise as a localised INR string, e.g. "₹1,299.00". */
export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paise / 100);
}
