"use client";

import { useState } from "react";

/**
 * Star rating used in two modes (V1.1):
 *  - read-only display when `onChange` is omitted (supports fractional `value`
 *    by clipping each star, so a 4.3 average shows a partial 5th star);
 *  - an interactive 1–5 input when `onChange` is provided.
 */
export default function StarRating({
  value,
  onChange,
  size = "md",
  className = "",
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [hover, setHover] = useState(0);
  const interactive = typeof onChange === "function";
  const shown = interactive && hover > 0 ? hover : value;

  const dim = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  const stars = [1, 2, 3, 4, 5].map((star) => {
    // Fraction of this star that should be filled (0–1).
    const fill = Math.max(0, Math.min(1, shown - (star - 1)));
    const star_ = (
      <span key={star} className="relative inline-block">
        <Star className={`${dim} text-line-strong`} />
        <span
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${fill * 100}%` }}
        >
          <Star className={`${dim} text-camel`} />
        </span>
      </span>
    );

    if (!interactive) return star_;

    return (
      <button
        key={star}
        type="button"
        onClick={() => onChange!(star)}
        onMouseEnter={() => setHover(star)}
        onMouseLeave={() => setHover(0)}
        aria-label={`${star} star${star > 1 ? "s" : ""}`}
        className="cursor-pointer p-0.5 transition hover:scale-110"
      >
        {star_}
      </button>
    );
  });

  return (
    <div
      className={`inline-flex items-center ${className}`}
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? "Choose a rating" : `Rated ${value} out of 5`}
    >
      {stars}
    </div>
  );
}

function Star({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 17.27l5.18 3.13-1.37-5.9 4.59-3.97-6.04-.52L12 4.5 9.64 10.1l-6.04.52 4.59 3.97-1.37 5.9z" />
    </svg>
  );
}
