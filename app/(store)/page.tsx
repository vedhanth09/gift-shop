import Link from "next/link";
import { dbConnect } from "@/lib/db";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { queryPublishedProducts } from "@/lib/products";
import ProductCard from "@/components/store/ProductCard";
import NewsletterSignup from "@/components/store/NewsletterSignup";

export const dynamic = "force-dynamic";

/** Hairline divider with a small camel diamond at its center — the "ribbon rule". */
function RibbonRule({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`} aria-hidden>
      <span className="h-px flex-1 bg-line" />
      <span className="mx-3.5 h-2.5 w-2.5 rotate-45 bg-camel" />
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** Eyebrow / overline — uppercase camel label above section headings. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.12em] text-camel">
      {children}
    </p>
  );
}

/** Warm decorative panel standing in for editorial photography. */
function ImagePanel({
  ratio,
  className = "",
  tone = "sand",
}: {
  ratio: string;
  className?: string;
  tone?: "sand" | "midnight";
}) {
  const pattern =
    tone === "midnight"
      ? "repeating-linear-gradient(135deg,#28395A,#28395A 12px,#243352 12px,#243352 24px)"
      : "repeating-linear-gradient(135deg,#E5DCC3,#E5DCC3 12px,#E1D7BC 12px,#E1D7BC 24px)";
  return (
    <div
      className={`relative overflow-hidden rounded-lg ${
        tone === "midnight" ? "border border-[#2A3954]" : "border border-line"
      } ${className}`}
      style={{ aspectRatio: ratio }}
      aria-hidden
    >
      <div className="absolute inset-0" style={{ background: pattern }} />
      <span
        className={`absolute inset-0 flex items-center justify-center font-display text-[120px] font-semibold ${
          tone === "midnight" ? "text-sand/10" : "text-midnight/[0.06]"
        }`}
      >
        G
      </span>
    </div>
  );
}

const VALUE_PROPS = [
  {
    title: "Hand-wrapped, always",
    body: "Every order is packed by hand in our studio — ribbon, note card and all.",
    icon: (
      <>
        <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
        <path d="M3 8l9 5 9-5" />
        <path d="M12 13v8" />
      </>
    ),
  },
  {
    title: "Pan-India delivery",
    body: "Tracked shipping to 19,000+ pincodes, with gift dating on request.",
    icon: (
      <>
        <path d="M3 7h13l5 5v4h-3" />
        <path d="M3 7v9h2" />
        <circle cx="7.5" cy="17.5" r="2" />
        <circle cx="17.5" cy="17.5" r="2" />
        <path d="M9.5 17.5h6" />
      </>
    ),
  },
  {
    title: "Personalisation",
    body: "Names, dates and short notes engraved or foiled — usually within 48 hours.",
    icon: (
      <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 16.8 6.6 18.2l.9-5.5-4-3.9 5.5-.8z" />
    ),
  },
];

/**
 * Storefront homepage. Editorial hero → ribbon rule → featured products →
 * category grid → value props → gifting-guide band → newsletter, following the
 * Giftly "Midnight & Camel" design (uploads/DESIGN.md §9). Featured products are
 * the newest published items; category tiles carry a live published-product
 * count.
 */
export default async function HomePage() {
  await dbConnect();

  const [{ products: featured }, categoryDocs, countRows] = await Promise.all([
    queryPublishedProducts({ sort: "newest", page: 1 }),
    Category.find().sort({ name: 1 }).lean(),
    Product.aggregate<{ _id: unknown; count: number }>([
      { $match: { published: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);

  const countByCat = new Map(countRows.map((r) => [String(r._id), r.count]));

  const categories = categoryDocs.map((c) => ({
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    count: countByCat.get(String(c._id)) ?? 0,
  }));

  return (
    <div>
      {/* ── Editorial hero ───────────────────────────────────────────── */}
      <section className="relative border-b border-line-subtle bg-sand-deep">
        <div className="mx-auto max-w-[860px] px-6 py-16 text-center sm:py-24 lg:py-28">
          <Eyebrow>The art of giving well</Eyebrow>
          <h1 className="mx-auto mt-5 font-display text-[clamp(40px,7vw,68px)] font-semibold leading-[1.02] tracking-[-0.025em] text-ink">
            Every gift, a quiet <span className="italic text-camel">gesture</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-[520px] text-lg leading-relaxed text-taupe">
            From birthday boxes to corporate hampers — thoughtfully sourced,
            beautifully wrapped, delivered across India.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/products"
              className="inline-flex h-[52px] items-center gap-2 rounded bg-midnight px-7 text-[15px] font-medium text-sand transition hover:bg-midnight-hover active:scale-[0.99]"
            >
              Shop the collection
            </Link>
            <Link
              href="/search"
              className="inline-flex h-[52px] items-center rounded border-[1.5px] border-midnight px-7 text-[15px] font-medium text-midnight transition hover:bg-midnight/[0.06]"
            >
              Search
            </Link>
          </div>
          <ImagePanel ratio="16 / 9" className="mt-11" />
        </div>
      </section>

      {/* ── Featured products ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
        <RibbonRule className="mb-12 sm:mb-16" />
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>This week</Eyebrow>
            <h2 className="mt-2.5 font-display text-[clamp(26px,3.4vw,32px)] font-semibold leading-tight text-ink">
              Featured gifts
            </h2>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-midnight transition hover:text-camel"
          >
            View all <span className="text-base">→</span>
          </Link>
        </div>

        {featured.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface p-12 text-center text-taupe">
            No products yet — check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {featured.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* ── Category grid ────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="mt-12 border-y border-line-subtle bg-sand-deep sm:mt-16">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="mb-9 text-center">
              <Eyebrow>Find the occasion</Eyebrow>
              <h2 className="mt-2.5 font-display text-[clamp(26px,3.4vw,32px)] font-semibold leading-tight text-ink">
                Shop by category
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/categories/${c.slug}`}
                  className="group relative aspect-[4/5] overflow-hidden rounded-lg border border-line transition hover:border-line-strong"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "repeating-linear-gradient(135deg,#E5DCC3,#E5DCC3 11px,#DED3B7 11px,#DED3B7 22px)",
                    }}
                    aria-hidden
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top,rgba(27,36,54,0.5),rgba(27,36,54,0) 55%)",
                    }}
                    aria-hidden
                  />
                  <div className="absolute inset-x-4 bottom-3.5">
                    <div className="font-display text-xl font-semibold leading-tight text-sand">
                      {c.name}
                    </div>
                    <div className="mt-0.5 text-xs text-sand/80">
                      {c.count} {c.count === 1 ? "gift" : "gifts"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Value props ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-8 sm:grid-cols-3">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="flex items-start gap-4">
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded border border-line-subtle bg-sand-deep text-midnight">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {v.icon}
                </svg>
              </div>
              <div>
                <div className="font-medium text-ink">{v.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-taupe">{v.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gifting guide band ───────────────────────────────────────── */}
      <section className="bg-midnight text-sand">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#D6A95C]">
              The gifting guide
            </p>
            <h2 className="mt-4 font-display text-[clamp(28px,3.8vw,38px)] font-semibold leading-[1.1] tracking-[-0.015em] text-sand">
              Not sure what to send? Start with the feeling.
            </h2>
            <p className="mt-4 max-w-[460px] text-[17px] leading-relaxed text-sand/80">
              Our short guide pairs occasions with gifts that land — by
              relationship, budget and how much time you have.
            </p>
            <Link
              href="/products"
              className="mt-7 inline-flex h-12 items-center rounded bg-camel px-6 text-sm font-medium text-camel-fg transition hover:bg-camel-hover active:scale-[0.99]"
            >
              Read the guide
            </Link>
          </div>
          <ImagePanel ratio="3 / 2" tone="midnight" />
        </div>
      </section>

      {/* ── Newsletter ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[560px] text-center">
          <RibbonRule className="mb-6" />
          <h2 className="font-display text-[clamp(24px,3vw,30px)] font-semibold text-ink">
            Join the list
          </h2>
          <p className="mb-6 mt-2.5 text-base text-taupe">
            Seasonal edits and early access to new collections. No noise.
          </p>
          <NewsletterSignup />
        </div>
      </section>
    </div>
  );
}
