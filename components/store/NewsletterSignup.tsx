"use client";

import { useState } from "react";
import { toast } from "@/store/toastStore";

/**
 * Homepage newsletter form. There's no list backend yet, so this validates the
 * address client-side and confirms with a toast — the visual contract from the
 * design ("Join the list") without promising delivery we can't make.
 */
export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setDone(true);
    setEmail("");
    toast.success("You're on the list — keep an eye on your inbox.");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap justify-center gap-2.5"
      aria-label="Subscribe to the newsletter"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        aria-label="Email address"
        className="h-12 min-w-[220px] flex-1 rounded border border-line bg-surface px-4 text-[15px] text-ink placeholder:text-taupe-muted outline-none transition focus:border-midnight focus:ring-2 focus:ring-midnight/35"
      />
      <button
        type="submit"
        className="h-12 rounded bg-midnight px-6 text-sm font-medium text-sand transition hover:bg-midnight-hover active:scale-[0.99]"
      >
        {done ? "Subscribed" : "Subscribe"}
      </button>
    </form>
  );
}
