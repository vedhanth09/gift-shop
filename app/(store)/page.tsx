import Link from "next/link";
import { dbConnect } from "@/lib/db";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { queryPublishedProducts } from "@/lib/products";
import ProductCard from "@/components/store/ProductCard";

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

/* ── Dashboard block grid ─────────────────────────────────────────────────
 * The "blocks of dashboard" centrepiece (tinyminymo-style bento): one large
 * hero block plus four quick-entry tiles, each a coloured panel linking into a
 * curated slice of the catalogue. Every tone is drawn from the Midnight & Camel
 * tokens so it sits inside the existing design system. */

type Tone = "midnight" | "camel" | "sand" | "surface";

const TILE_TONES: Record<
  Tone,
  { panel: string; eyebrow: string; sub: string; arrow: string }
> = {
  midnight: {
    panel:
      "bg-midnight text-sand border-[#2A3954] hover:bg-midnight-hover",
    eyebrow: "text-[#D6A95C]",
    sub: "text-sand/75",
    arrow: "text-sand",
  },
  camel: {
    panel:
      "bg-camel text-camel-fg border-camel-active hover:bg-camel-hover",
    eyebrow: "text-camel-fg/70",
    sub: "text-camel-fg/80",
    arrow: "text-camel-fg",
  },
  sand: {
    panel:
      "bg-sand-deep text-ink border-line hover:border-line-strong hover:shadow-sm",
    eyebrow: "text-camel",
    sub: "text-taupe",
    arrow: "text-midnight",
  },
  surface: {
    panel:
      "bg-surface text-ink border-line-subtle hover:border-line hover:shadow-sm",
    eyebrow: "text-camel",
    sub: "text-taupe",
    arrow: "text-midnight",
  },
};

function DashTile({
  href,
  eyebrow,
  title,
  sub,
  tone,
}: {
  href: string;
  eyebrow: string;
  title: string;
  sub: string;
  tone: Tone;
}) {
  const t = TILE_TONES[tone];
  return (
    <Link
      href={href}
      className={`group relative flex min-h-[164px] flex-col justify-between overflow-hidden rounded-lg border p-5 transition duration-200 ${t.panel}`}
    >
      <p
        className={`text-[11px] font-medium uppercase tracking-[0.12em] ${t.eyebrow}`}
      >
        {eyebrow}
      </p>
      <div>
        <div className="font-display text-xl font-semibold leading-tight">
          {title}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className={`text-sm ${t.sub}`}>{sub}</span>
          <span
            className={`text-base transition-transform duration-200 group-hover:translate-x-0.5 ${t.arrow}`}
            aria-hidden
          >
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Rotating benefits shown in the slim announcement strip above the hero. */
const ANNOUNCEMENTS = [
  "Free shipping on orders over ₹1,200",
  "Hand-wrapped & gift-dated on request",
  "Tracked delivery to 19,000+ pincodes",
];

/**
 * Storefront homepage, redesigned around a tinyminymo-style dashboard of
 * blocks while keeping the Giftly "Midnight & Camel" palette (uploads/DESIGN.md
 * §9). Flow: announcement strip → bento block grid (hero + quick-entry tiles) →
 * category block rail → products grid. The products grid lists every published
 * product so the full catalogue is visible on the dashboard; category tiles
 * carry a live published-product count.
 */
export default async function HomePage() {
  await dbConnect();

  const [newest, categoryDocs, countRows] = await Promise.all([
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
    image: c.image ?? null,
    count: countByCat.get(String(c._id)) ?? 0,
  }));

  // Show every published product on the dashboard.
  const arrivals = newest.products;

  return (
    <div>
      {/* ── Announcement strip ───────────────────────────────────────── */}
      <div className="bg-midnight text-sand">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-2.5 text-center text-xs font-medium sm:px-6">
          {ANNOUNCEMENTS.map((line, i) => (
            <span key={line} className="inline-flex items-center gap-2">
              {i > 0 && (
                <span
                  className="hidden h-1.5 w-1.5 rotate-45 bg-camel sm:inline-block"
                  aria-hidden
                />
              )}
              <span className={i > 0 ? "hidden sm:inline" : ""}>{line}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Dashboard block grid (hero + quick-entry tiles) ──────────── */}
      <section className="border-b border-line-subtle bg-sand-deep">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:grid-rows-2">
            {/* Large hero block */}
            <div className="relative col-span-2 flex min-h-[300px] flex-col justify-center overflow-hidden rounded-lg border border-line bg-surface p-7 sm:min-h-[340px] sm:p-9 lg:row-span-2">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "repeating-linear-gradient(135deg,#F4EFE3,#F4EFE3 14px,#EDE6D5 14px,#EDE6D5 28px)",
                }}
                aria-hidden
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(120deg,rgba(251,248,241,0.92),rgba(251,248,241,0.55) 60%,rgba(251,248,241,0.2))",
                }}
                aria-hidden
              />
              <div className="relative">
                <Eyebrow>The art of giving well</Eyebrow>
                <h1 className="mt-4 max-w-[440px] font-display text-[clamp(34px,5vw,52px)] font-semibold leading-[1.04] tracking-[-0.025em] text-ink">
                  Every gift, a quiet{" "}
                  <span className="italic text-camel">gesture</span>.
                </h1>
                <p className="mt-4 max-w-[400px] text-base leading-relaxed text-taupe">
                  From birthday boxes to corporate hampers — thoughtfully
                  sourced, beautifully wrapped, delivered across India.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/products"
                    className="inline-flex h-[50px] items-center rounded bg-midnight px-7 text-[15px] font-medium text-sand transition hover:bg-midnight-hover active:scale-[0.99]"
                  >
                    Shop the collection
                  </Link>
                  <Link
                    href="/search"
                    className="inline-flex h-[50px] items-center rounded border-[1.5px] border-midnight px-7 text-[15px] font-medium text-midnight transition hover:bg-midnight/[0.06]"
                  >
                    Search
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick-entry dashboard tiles */}
            <DashTile
              href="/products?sort=newest"
              eyebrow="Just in"
              title="New arrivals"
              sub="Fresh this week"
              tone="midnight"
            />
            <DashTile
              href="/products?sort=price-asc"
              eyebrow="Easy picks"
              title="Great value"
              sub="Lovely under budget"
              tone="camel"
            />
            <DashTile
              href={categories[0] ? `/categories/${categories[0].slug}` : "/products"}
              eyebrow="By occasion"
              title="Shop categories"
              sub={`${categories.length || "All"} collections`}
              tone="sand"
            />
            <DashTile
              href="/products"
              eyebrow="Made to order"
              title="Personalised"
              sub="Names, dates & notes"
              tone="surface"
            />
          </div>
        </div>
      </section>

      {/* ── Category block rail ──────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Find the occasion</Eyebrow>
              <h2 className="mt-2.5 font-display text-[clamp(24px,3.4vw,30px)] font-semibold leading-tight text-ink">
                Shop by category
              </h2>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-midnight transition hover:text-camel"
            >
              View all <span className="text-base">→</span>
            </Link>
          </div>

          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/categories/${c.slug}`}
                className="group relative aspect-[4/5] w-[160px] flex-none snap-start overflow-hidden rounded-lg border border-line transition hover:border-line-strong sm:w-[190px]"
              >
                {c.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={c.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <>
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "repeating-linear-gradient(135deg,#E5DCC3,#E5DCC3 11px,#DED3B7 11px,#DED3B7 22px)",
                      }}
                      aria-hidden
                    />
                    <span
                      className="absolute inset-0 flex items-center justify-center font-display text-[88px] font-semibold text-midnight/[0.07]"
                      aria-hidden
                    >
                      {c.name.charAt(0)}
                    </span>
                  </>
                )}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top,rgba(27,36,54,0.52),rgba(27,36,54,0) 55%)",
                  }}
                  aria-hidden
                />
                <div className="absolute inset-x-4 bottom-3.5">
                  <div className="font-display text-lg font-semibold leading-tight text-sand">
                    {c.name}
                  </div>
                  <div className="mt-0.5 text-xs text-sand/80">
                    {c.count} {c.count === 1 ? "gift" : "gifts"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── New arrivals ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
        <RibbonRule className="mb-12 sm:mb-14" />
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>This week</Eyebrow>
            <h2 className="mt-2.5 font-display text-[clamp(24px,3.4vw,30px)] font-semibold leading-tight text-ink">
              New arrivals
            </h2>
          </div>
          <Link
            href="/products?sort=newest"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-midnight transition hover:text-camel"
          >
            View all <span className="text-base">→</span>
          </Link>
        </div>

        {arrivals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface p-12 text-center text-taupe">
            No products yet — check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {arrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <div className="h-14 sm:h-20" />
    </div>
  );
}
