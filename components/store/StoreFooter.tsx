import Link from "next/link";

interface FooterProps {
  storeName?: string;
  contactEmail?: string;
  social?: { instagram?: string; twitter?: string; facebook?: string };
}

/** Storefront footer with nav, configurable contact/social links and copyright. */
export default function StoreFooter({
  storeName = "Giftopia",
  contactEmail = "",
  social = {},
}: FooterProps) {
  const socialLinks = [
    { label: "Instagram", href: social.instagram },
    { label: "Twitter", href: social.twitter },
    { label: "Facebook", href: social.facebook },
  ].filter((s) => s.href);

  return (
    <footer className="mt-16 border-t border-line-subtle bg-sand-deep text-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full bg-midnight font-display text-xs font-semibold text-camel"
              style={{ boxShadow: "inset 0 0 0 1.25px #B58A4A" }}
              aria-hidden
            >
              G
            </span>
            <p className="font-display text-lg font-semibold text-ink">{storeName}</p>
          </div>
          <p className="mt-2 text-sm text-taupe">
            Thoughtfully curated gifts, delivered.
          </p>
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}`}
              className="mt-2 inline-block text-sm text-taupe transition hover:text-ink"
            >
              {contactEmail}
            </a>
          )}
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-taupe">
          <Link href="/products" className="transition hover:text-ink">
            Shop all
          </Link>
          <Link href="/search" className="transition hover:text-ink">
            Search
          </Link>
          <Link href="/cart" className="transition hover:text-ink">
            Cart
          </Link>
          <Link href="/account/login" className="transition hover:text-ink">
            Account
          </Link>
        </nav>
        {socialLinks.length > 0 && (
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-taupe">
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-ink"
              >
                {s.label}
              </a>
            ))}
          </nav>
        )}
      </div>
      <div className="border-t border-line-subtle py-4 text-center text-xs text-taupe-muted">
        © {new Date().getFullYear()} {storeName}. All rights reserved.
      </div>
    </footer>
  );
}
