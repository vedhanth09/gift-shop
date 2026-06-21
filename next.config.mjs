/**
 * Content Security Policy (PRD §9 "Helmet headers"). App Router injects inline
 * bootstrap scripts, so 'unsafe-inline' is required without a nonce pipeline;
 * the payment SDKs (Razorpay/Stripe) and Cloudinary images are explicitly
 * allow-listed. Tightening to nonces is a post-launch hardening task.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://api.stripe.com https://*.ingest.sentry.io",
  "frame-src https://checkout.razorpay.com https://api.razorpay.com https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // --- Performance audit (V1.1) ---------------------------------------------
  reactStrictMode: true,
  // Don't advertise the framework, and skip shipping browser source maps to
  // production clients (smaller deploys, no map download).
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // Serve modern formats and cache transformed images for a day.
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  // The app is same-origin: API routes are served from this domain and send no
  // Access-Control-Allow-Origin header, so browsers block cross-origin reads
  // (PRD §9 "CORS restricted to own domain"). Webhooks are server-to-server.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
