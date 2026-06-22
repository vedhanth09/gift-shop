# Giftopia — Development Todolist

> Derived from Giftopia PRD v1.0 | Next.js 14 · MongoDB Atlas · Tailwind · Cloudinary · Razorpay/Stripe

Priority key: **P0** = MVP must-ship · **P1** = first 6 weeks · **P2** = post-launch

---

## Phase 1 — Foundation & Auth (Week 1–2) ✅

### Project Setup
- [x] Initialize Next.js 14 project (App Router) with TypeScript
- [x] Configure Tailwind CSS
- [~] Install and configure shadcn/ui base components — _deferred to Phase 2 (UI-heavy); Tailwind + brand theme in place_
- [x] Add Framer Motion for animations _(dependency installed)_
- [x] Set up folder structure per PRD §16 (`app/`, `components/`, `lib/`, `models/`, `store/`, `scripts/`)
- [x] Create `.env.local` with all variables from PRD §15 _(+ `.env.example`)_
- [x] Set up Zustand stores (`cartStore.ts`, `authStore.ts`)
- [x] Configure Sentry for error monitoring _(no-ops until `NEXT_PUBLIC_SENTRY_DSN` set)_

### Database
- [~] Provision MongoDB Atlas (Cluster1, FLEX tier) — _infra task; connection string slot ready in `.env.local`_
- [x] Create `lib/db.ts` MongoDB connection helper _(cached connection)_
- [x] Define Mongoose models: `Product`, `Category`, `Order`, `User`, `Coupon` (PRD §7)
- [x] Add indexes (Product.title, slug unique, User.email unique, Coupon.code unique)

### Auth
- [x] Create `lib/auth.ts` JWT helpers (jose) + httpOnly cookie handling _(+ `lib/password.ts`, `lib/session.ts`)_
- [x] Implement admin login `POST /api/admin/auth/login` (bcrypt 12 rounds, JWT 8h)
- [x] Implement admin logout `POST /api/admin/auth/logout`
- [x] Build `/admin/login` page (only admin entry point, no public link)
- [x] Write `scripts/seed-admin.ts` + `npm run seed:admin` (single account, no UI creation)
- [x] Implement customer register `POST /api/auth/register`
- [x] Implement customer login `POST /api/auth/login` (JWT 7d + refresh rotation via `/api/auth/refresh`)
- [x] Implement customer logout `POST /api/auth/logout`
- [x] Build `/account/register` and `/account/login` pages
- [x] Create `middleware.ts` protecting all `/admin/*` routes (redirect to `/admin/login`)
- [x] Add role check (`role: admin`) on every admin API handler _(middleware + per-handler session checks)_
- [x] Rate limit admin login: 5 failed attempts → 15-min lockout _(`lib/rate-limit.ts`)_

> **Legend:** `[x]` done · `[~]` deferred/infra (see note). Verified via `npm run build` — 15 routes compiled, types pass, middleware bundled.

---

## Phase 2 — Admin Dashboard: Products (Week 2–3) ✅

### Product Management (P0)
- [x] `GET /api/admin/products` — list all (published + unpublished) _(+ `?q`, `?published` filters)_
- [x] `POST /api/admin/products` — create product
- [x] `GET /api/admin/products/[id]` — get by ID
- [x] `PUT /api/admin/products/[id]` — update _(re-slugs on title change)_
- [x] `DELETE /api/admin/products/[id]` — delete (+ trigger Cloudinary image cleanup)
- [x] `PATCH /api/admin/products/[id]/publish` — toggle published state _(or set explicitly)_
- [x] Auto-generate URL-safe `slug` from title _(`lib/slug.ts`, collision-safe `-2/-3…`)_
- [x] Build `/admin/products` list table (edit/delete/publish toggles)
- [x] Build `/admin/products/new` create form
- [x] Build `/admin/products/[id]` edit form

### Image Upload (P0)
- [x] Create `lib/cloudinary.ts` _(REST API + signed requests, no SDK dependency)_
- [x] `POST /api/uploads/image` — upload to Cloudinary, return URL _(admin-gated; type/5 MB checks)_
- [x] `DELETE /api/uploads/image` — delete by public_id _(accepts `publicId` or `url`)_
- [x] Drag-and-drop image uploader component (max 6 images per product)

### Category Management (P0)
- [x] `GET /api/admin/categories` — list all
- [x] `POST /api/admin/categories` — create
- [x] `PUT /api/admin/categories/[id]` — update
- [x] `DELETE /api/admin/categories/[id]` — delete _(blocked while products reference it)_
- [x] Build `/admin/categories` page (add/edit/delete)

### Dashboard Overview (P0)
- [x] Build `/admin/dashboard` KPI cards (total revenue, orders today, low-stock alerts)
- [x] Recent orders table _(+ low-stock alert list)_

> **Note:** Money stored in paise; admin forms work in rupees (`lib/utils.ts` converters).
> Every admin handler re-checks the session via `lib/api.ts` (`requireAdmin`); `/api/uploads/image`
> sits outside the middleware matcher, so its in-handler check is the only gate. Shared admin chrome
> in `components/admin/AdminShell` + `AdminNav`. Verified via `npm run build` — 21 routes compiled,
> types + lint pass.

---

## Phase 3 — Customer Storefront (Week 3–4) ✅

### Public Product APIs (P0)
- [x] `GET /api/products` — list published (supports `?category`, `?sort`, `?q`, `?page`) _(+ `?min`/`?max` price filter, in rupees)_
- [x] `GET /api/products/[slug]` — single product by slug _(+ 4 related products)_
- [x] `GET /api/categories` — public category list

### Storefront Pages (P0)
- [x] Build `/` homepage — hero banner, featured products, category grid _(hero copy static; becomes admin-configurable with Store Settings in Phase 5)_
- [x] Build `/products` listing — grid, filter by category/price, sort by newest/price _(URL-driven filters → SSR)_
- [x] Build `/products/[slug]` detail — image gallery, price, stock status, description, Add to Cart _(+ dynamic meta/OG tags)_
- [x] Build `/categories/[slug]` — products filtered by category
- [x] Build `/search?q=` — live search by name + description _(debounced, via `/api/products?q=`)_

### Cart (P0)
- [x] Implement Zustand cart with localStorage persistence
- [x] DB sync when logged in _(`User.cart` + `GET`/`PUT /api/cart`; merge-on-login via `components/store/CartSync`)_
- [x] Build `/cart` page — quantity adjust, remove item
- [x] Show "no longer available" warning for unpublished products in cart (block checkout) _(`POST /api/cart/validate` re-checks publish/stock/price)_

### Checkout UI (P0)
- [x] Build `/checkout` — delivery address form → order summary → payment _(payment method select; order placement + payments wired in Phase 4)_
- [x] Require login at checkout (no guest checkout per PRD §13) _(server-side gate → `/account/login?from=/checkout`)_

> **Note:** Storefront lives in the `(store)` route group (shared header/footer/cart-sync in
> `components/store/`); `/account/*` auth pages stay chrome-free in `(shop)`. Shared product
> queries in `lib/products.ts`, cart validation in `lib/cart.ts`. Prices in paise throughout.
> Order creation (`POST /api/orders`) is Phase 4 — checkout captures the address/payment choice
> and shows a notice until then. Verified via `npm run build` — 28 routes compiled, types + lint pass.

---

## Phase 4 — Orders & Payments (Week 4–5) ✅

### Orders (P0)
- [x] `POST /api/orders` — create order _(re-validates cart, snapshots prices, COD confirmed on placement)_
- [x] Generate order number `GFT-YYYY-XXXXX` (zero-padded sequential) _(atomic `Counter` model, per-year)_
- [x] Store price/title snapshots in `Order.items` _(taken from live `validateCart` lines)_
- [x] `GET /api/account/orders` — customer's own orders _(scoped to session)_
- [x] `GET /api/account/orders/[id]` — customer order detail _(other ids 404, not 403)_
- [x] `GET /api/admin/orders` — list all (`?status`, `?page`)
- [x] `GET /api/admin/orders/[id]` — order detail
- [x] `PATCH /api/admin/orders/[id]/status` — update status (pending→processing→shipped→delivered) _(transition matrix; cancel restores stock; deliver marks COD paid)_
- [x] Build `/admin/orders` list with status filters _(filter chips + pagination, SSR)_
- [x] Build `/admin/orders/[id]` detail view (P1) _(+ `OrderStatusControl` client actions)_

### Payments (P0)
- [x] `POST /api/payments/razorpay/create-order` _(amount from stored order, never the client)_
- [x] `POST /api/payments/razorpay/verify` — verify signature _(HMAC-SHA256, constant-time)_
- [x] `POST /api/webhooks/razorpay` — verify HMAC, decrement stock on payment success _(idempotent)_
- [x] `POST /api/payments/stripe/intent` — create PaymentIntent _(orderId in metadata)_
- [x] `POST /api/webhooks/stripe` — verify signature _(t/v1 header + replay tolerance)_
- [x] Implement Cash on Delivery fallback (`paymentStatus: pending` until admin updates)
- [x] Decrement stock only on confirmed payment (not on cart add) _(`confirmOrder`, `stockDecremented` guard, clamps at 0)_
- [x] Restore stock automatically on cancelled orders _(`restoreOrderStock`, symmetric guard)_

### Confirmation & Email (P0)
- [x] Build `/checkout/success` confirmation page with order ID _(shows summary to the order owner)_
- [x] Create `lib/email.ts` (Resend or Nodemailer) _(Resend REST, no-op until `RESEND_API_KEY` set)_
- [x] Send order confirmation/receipt email _(best-effort in `confirmOrder`, never blocks)_

> **Note:** Stock/cart/email side-effects are centralised in `lib/orders.ts` (`confirmOrder`,
> `restoreOrderStock`, `markOrderPaid`) and applied exactly once via the `Order.stockDecremented`
> flag, so repeated webhook deliveries and a verify+webhook race are both safe. Payment gateways
> use REST + Node crypto (no SDK, like `lib/cloudinary.ts`); the browser loads Razorpay/Stripe.js
> from their CDNs (`lib/payment-client.ts`). COD is the only path testable without gateway keys.
> Coupons (`discountAmount`) are wired in the model but applied in Phase 5. Verified via
> `npm run build` — 48 routes compiled, types + lint pass.

---

## Phase 5 — Polish & Launch (Week 5–6) ✅

### Inventory & Coupons (P1)
- [x] Inventory alerts: flag products with stock < threshold (default 5) _(`/admin/inventory`, threshold via `?threshold=`; dashboard keeps the summary)_
- [x] `GET /api/admin/coupons` — list
- [x] `POST /api/admin/coupons` — create (percentage/flat, expiry) _(rupee inputs → paise; usage limit + min order optional)_
- [x] `DELETE /api/admin/coupons/[id]`
- [x] `POST /api/coupons/validate` — validate code (active, expiry, usage limit, min order value) _(`lib/coupons.ts`; subtotal computed server-side, never trusted)_
- [x] Build `/admin/coupons` page _(`CouponManager`)_
- [x] Coupon code entry at checkout _(live preview; re-validated + consumed once in `confirmOrder`, PRD §17.6)_

### Analytics (P2)
- [x] `GET /api/admin/analytics/revenue` — totals by period (`?period=7|30|90`) _(daily paid-revenue series, IST buckets; `lib/analytics.ts`)_
- [x] `GET /api/admin/analytics/top-products` — top 10 by units sold _(non-cancelled orders)_
- [x] Build `/admin/analytics` page (revenue chart + top products) _(dependency-free SVG `RevenueChart` instead of Recharts — no extra bundle/install)_

### Store Settings & Profile (P1)
- [x] Build `/admin/settings` — store name, logo, contact email, currency, shipping rates, social links _(`Settings` singleton model + `lib/settings.ts`; `GET`/`PUT /api/admin/settings`)_
- [x] Admin profile: change password, logout _(`POST /api/admin/profile/password`; logout already in `AdminNav`)_
- [x] Wire settings into storefront _(header/footer name + contact + social; shipping fee applied at checkout/order, shown on summary/success/email/admin)_

### Account (P1)
- [x] Build `/account/orders` — order history with status badges _(in `(store)` chrome)_
- [x] Build `/account/settings` — update name/email/password, manage addresses (max 5) _(`AccountSettings` + `/api/account/{profile,password,addresses}`; default address pre-fills checkout)_
- [x] Related products: 4 from same category on product detail page _(already shipped in Phase 3, `getRelatedProducts`)_

### Security (PRD §9)
- [x] CORS restricted to own domain _(same-origin API, no `Access-Control-Allow-Origin` header → browsers block cross-origin reads; webhooks are server-to-server)_
- [x] Input sanitization (xss-clean / DOMPurify) _(`lib/sanitize.ts` strips tags/control chars on stored free-text; React auto-escapes + email escapes on output — no `dangerouslySetInnerHTML`)_
- [x] Helmet.js headers (CSP, X-Frame-Options) _(`next.config.mjs` headers: CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS)_
- [x] Verify all payment webhooks with HMAC signature _(done in Phase 4; Razorpay + Stripe)_
- [x] Confirm all API routes validate auth server-side _(audited: admin via `requireAdmin`, customer via `getCustomerSession`, webhooks via HMAC, public reads only)_

### Non-Functional & Launch
- [x] SEO: SSR for public product pages, dynamic meta + OG tags _(per-product `generateMetadata`; root `metadataBase` + title template)_
- [x] Generate `sitemap.xml` + `robots.txt` _(`app/sitemap.ts` DB-driven, `app/robots.ts` disallows admin/account/api/cart/checkout)_
- [x] Accessibility pass (WCAG 2.1 AA — semantic HTML, keyboard nav, ARIA) _(skip-to-content link, labelled nav/controls, `role=status/alert`; semantic landmarks throughout)_
- [x] Graceful 404 + 500 pages, toast notifications for form errors _(`not-found.tsx`, `error.tsx`, `global-error.tsx`; global `Toaster` + `toastStore`)_
- [~] Responsive QA at 375px, 768px, 1280px — _responsive Tailwind in place across all pages; needs a manual device pass before launch_
- [~] Core Web Vitals check (LCP < 2.5s, CLS < 0.1, FID < 100ms) — _measure on the deployed build (Lighthouse/Vercel Analytics); not measurable in this env_
- [~] Configure MongoDB Atlas daily backups (7-day retention) — _Atlas console / ops task_
- [~] Deploy to Vercel + DNS + domain setup — _ops task; set env vars from `.env.example`_

> **Legend:** `[x]` done · `[~]` deferred/ops or QA pass (see note). Coupons + shipping flow through
> `lib/coupons.ts` / `lib/settings.ts` and are applied authoritatively in `POST /api/orders`
> (subtotal − discount + shipping), with the coupon consumed exactly once via `confirmOrder`'s
> `stockDecremented` guard. Analytics use a dependency-free SVG chart (no Recharts install).
> Security headers live in `next.config.mjs`. Verified: `npm run build` compiles + `npx tsc --noEmit`
> passes with zero type errors (the build's page-data/export step can't reach MongoDB in this
> environment, as in earlier phases — runtime-only, not a code error).

---

## Post-Launch — V1.1 Enhancements ✅

- [x] Wishlist: `/account/wishlist`, save/add-to-cart (P2) _(`GET`/`POST`/`DELETE /api/account/wishlist` on `User.wishlist`; `wishlistStore` + `WishlistSync` hydrate heart state; `WishlistButton` overlay on product cards + detail page; header link)_
- [x] Product reviews: star rating + text on product pages (P2) _(`Review` model w/ unique `{product,user}`; `GET`/`POST /api/products/[slug]/reviews`; `StarRating` + `ProductReviews` (summary, distribution, write/edit form); avg rating by title; "Verified purchase" badge when the reviewer ordered the item)_
- [x] Customer email verification (required at V1.1) _(`emailVerified` + hashed `verifyToken`; link mailed on register via `lib/email`; `POST /api/auth/verify-email` + `/resend-verification`; `/account/verify-email` page + storefront banner; **order placement blocked until verified when email is configured** — auto-verified in dev without `RESEND_API_KEY` so COD stays testable)_
- [x] Password reset: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` _(hashed single-use `resetToken`, 1h expiry; forgot-password is non-enumerating + IP rate-limited; `/account/forgot-password` + `/account/reset-password` pages; "Forgot password?" link on login)_
- [x] Bulk product actions (multi-select publish/unpublish/delete) (P2) _(`POST /api/admin/products/bulk`; multi-select checkboxes + select-all + bulk toolbar in `ProductsTable`; delete cleans up Cloudinary images like the single-delete route)_
- [x] Advanced analytics _(orders-by-status, payment-method (orders + paid revenue), customer counts (total/new/repeat), sales-by-category via `$lookup`; `getAdvancedAnalytics` in `lib/analytics.ts` + `GET /api/admin/analytics/summary`; new sections on `/admin/analytics`)_
- [x] Performance audit _(see `PERFORMANCE.md`: `next.config` tuning — modern image formats, no prod source maps, `poweredByHeader` off; compound DB indexes on Product/Order/Review/User for the hot read paths; documented `next/image` migration + CWV-on-deploy follow-ups)_

> **Token security:** verification & reset tokens are random 256-bit values; only
> their SHA-256 hashes are stored (`lib/tokens.ts`), so a DB read can't be replayed.
> Verified via `npm run build` — **Compiled successfully**, types pass, 65/65 pages
> generated (new routes: wishlist, reviews, verify/resend/forgot/reset-password,
> products/bulk, analytics/summary). `npx tsc --noEmit` clean.

---

## Key Business Rules to Enforce (PRD §17)

1. [x] Exactly one admin account — seeded, never registered _(`scripts/seed-admin.ts` upserts the single `role: admin`; public `/api/auth/register` hard-codes `role: customer`; no admin-creation route exists)_
2. [x] Products must be published to appear on storefront _(`lib/products.ts` `queryPublishedProducts` hard-filters `{ published: true }`; backs every public `/api/products` read)_
3. [x] Stock decrements on payment-success webhook (not cart add) _(centralised in `lib/orders.ts` `confirmOrder`; called from Razorpay/Stripe webhooks on success — cart ops never touch stock)_
4. [x] Cancelled orders restore stock _(`lib/orders.ts` `restoreOrderStock`, triggered by the `cancelled` transition in `PATCH /api/admin/orders/[id]/status`)_
5. [x] Unpublished products in carts show "no longer available", block checkout _(`lib/cart.ts` `validateCart` flags unavailable lines → `checkoutBlocked`; `POST /api/orders` returns 409)_
6. [x] Coupon validation: active + expiry + usage limit + min order value; once per order _(`lib/coupons.ts` `validateCoupon` checks all four; `consumeCoupon` runs once inside `confirmOrder` under the `stockDecremented` guard)_
7. [x] Order number format: `GFT-YYYY-XXXXX` _(`models/Counter.ts` atomic per-year `$inc`; `lib/orders.ts` `generateOrderNumber` zero-pads to 5 digits)_
8. [x] Cloudinary image deletion on product/image removal _(`lib/cloudinary.ts` `deleteImage`, called by the single + bulk product DELETE routes; best-effort, never blocks)_
9. [x] Price snapshots in `Order.items` — price changes don't affect past orders _(`POST /api/orders` snapshots `title`/`price` from validated cart lines into immutable `Order.items`)_
10. [x] COD orders stay `paymentStatus: pending` until admin updates _(set at placement in `POST /api/orders`; flipped to `paid` only on the `delivered` transition in the admin status route)_

> **Verified:** all 10 rules are enforced server-side (audited against the codebase). Each lives in a
> single authoritative place — order side-effects in `lib/orders.ts`, cart/coupon/product gates in
> `lib/cart.ts` / `lib/coupons.ts` / `lib/products.ts` — so the rule can't be bypassed by a client.
> Money is in paise throughout; amounts and discounts are always recomputed server-side, never trusted
> from the request body.
