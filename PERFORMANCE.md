# Giftopia — Performance Audit (V1.1)

Scope: a code-level performance review of the Next.js 14 storefront + admin app.
Field metrics (Lighthouse / Core Web Vitals) must be measured against the
**deployed** build — they can't be produced in this environment — so this
document records the static findings, the changes applied in code, and the
runtime checklist to run after deploy.

---

## 1. Changes applied in this pass

### Build / delivery (`next.config.mjs`)
- `reactStrictMode: true` — surfaces unsafe lifecycles and double-effect bugs.
- `poweredByHeader: false` — drops the `X-Powered-By: Next.js` header.
- `productionBrowserSourceMaps: false` — no source maps shipped to clients
  (smaller deploy, faster first load, less information disclosure).
- `images.formats: ["image/avif", "image/webp"]` + `minimumCacheTTL` of 1 day —
  the image optimizer now serves modern formats and caches transforms.

### Database indexes (read-path optimisation)
The catalogue and order/analytics queries were scanning collections. Added
compound indexes matching the actual query shapes:

| Model   | Index                              | Serves |
|---------|------------------------------------|--------|
| Product | `{ published: 1, createdAt: -1 }`  | storefront list, newest-first |
| Product | `{ published: 1, price: 1 }`       | price sort + price-range filter |
| Product | `{ published: 1, category: 1 }`    | category pages |
| Order   | `{ customer: 1, createdAt: -1 }`   | a customer's order history |
| Order   | `{ orderStatus: 1, createdAt: -1 }`| admin order list + status filter |
| Order   | `{ paymentStatus: 1, createdAt: 1 }`| revenue aggregation by day |
| Review  | `{ product: 1, user: 1 }` (unique) | one-review-per-customer + lookups |
| Review  | `{ product: 1, createdAt: -1 }`    | product reviews, newest-first |
| User    | `verifyTokenHash` / `resetTokenHash` (sparse) | token redemption |

> Note: Atlas builds these on connect only when `autoIndex` is on (the default
> in non-production). For production, build them once via the Atlas UI or a
> migration, or temporarily enable `autoIndex` on first deploy.

---

## 2. Findings already in good shape (no change needed)

- **No heavy chart dependency** — analytics use a dependency-free inline SVG
  (`RevenueChart`) instead of Recharts, keeping the admin bundle small.
- **No payment/Cloudinary SDKs** — gateways and image ops are hand-rolled over
  `fetch` + Node `crypto`; the browser only loads Razorpay/Stripe.js from their
  CDNs, on the checkout page.
- **SSR + `force-dynamic`** on product pages with per-product metadata/OG tags —
  good for SEO and TTFB-cached content.
- **Cached Mongo connection** (`lib/db.ts`) avoids per-request reconnects.
- **Cart/auth/wishlist client stores** read from `localStorage` / a single
  `/api/auth/me` call; no render-blocking data fetches in the header.

---

## 3. Recommendations for the deployed environment (not code-blocking)

1. **Migrate raw `<img>` to `next/image`.** Product cards, the gallery, admin
   thumbnails and the wishlist use plain `<img>` (with eslint-disable). Cloudinary
   is already allow-listed in `images.remotePatterns`, so switching to
   `next/image` would add responsive `srcset`, lazy-loading and AVIF/WebP, which
   directly improves **LCP** and bandwidth. Left as a follow-up because it
   touches layout sizing on several components and needs visual QA.
2. **Set explicit width/height (or aspect-ratio) on every image** to keep
   **CLS < 0.1**. The card/gallery already reserve square boxes; verify the rest.
3. **Cache public GET APIs** (`/api/products`, `/api/categories`) with
   `Cache-Control: s-maxage` / `revalidate` where data tolerates staleness, to
   cut DB load and improve TTFB on listing pages.
4. **Run Lighthouse + Vercel Analytics** on the production URL and confirm the
   PRD targets: **LCP < 2.5s, CLS < 0.1, FID/INP < 100ms**. Record the numbers
   back here.
5. **Responsive device pass** at 375 / 768 / 1280px (carried over from Phase 5).

---

## 4. Post-deploy verification checklist

- [ ] Indexes present in Atlas (`db.products.getIndexes()`, etc.).
- [ ] Lighthouse mobile score + CWV captured for `/`, `/products`, `/products/[slug]`.
- [ ] Image responses served as AVIF/WebP (check `Content-Type` on `/_next/image`).
- [ ] No source maps served in production (`*.js.map` 404s).
- [ ] Bundle analyzed for unexpected large client chunks.
