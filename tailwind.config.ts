import type { Config } from "tailwindcss";

/**
 * Giftly design system — "Midnight & Camel" (Warm Editorial).
 * Build against these tokens, not raw hex. See uploads/DESIGN.md for the
 * single source of truth behind every value here.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm paper backgrounds
        sand: { DEFAULT: "#F4EFE3", deep: "#E9E2D0", muted: "#E5DCC3" },
        surface: "#FBF8F1",
        // Cool ink — text & primary
        ink: "#1B2436",
        midnight: { DEFAULT: "#1F2D44", hover: "#28395A", active: "#16223A" },
        // Camel — secondary accent
        camel: { DEFAULT: "#B58A4A", hover: "#A47B3C", active: "#93702F", fg: "#221A0E" },
        // Secondary text
        taupe: { DEFAULT: "#6B6453", muted: "#8E8568" },
        // Hairlines & dividers
        line: { subtle: "#E2D9C2", DEFAULT: "#D8CDB4", strong: "#C9BC9E" },
        // Status — warm-tuned, never neon
        ok: { DEFAULT: "#3E6B4F", bg: "#E5ECE0", fg: "#2C4F3A" },
        warn: { DEFAULT: "#B5862A", bg: "#F1E7CB", fg: "#6E4E12" },
        bad: { DEFAULT: "#A23B2E", bg: "#F2DFD9", fg: "#7A2A20" },
        note: { DEFAULT: "#2F4A6B", bg: "#E1E7EF", fg: "#21364F" },
        // Legacy alias — remapped onto the new primary so any remaining
        // bg-brand / text-brand picks up Midnight automatically.
        brand: { DEFAULT: "#1F2D44", dark: "#16223A", light: "#E7EAF0" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "9px",
        lg: "14px",
        xl: "20px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(27,36,54,.06)",
        DEFAULT: "0 2px 8px rgba(27,36,54,.08)",
        md: "0 8px 24px rgba(27,36,54,.10)",
        lg: "0 16px 40px rgba(27,36,54,.12)",
      },
      ringColor: {
        DEFAULT: "rgb(31 45 68 / 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
