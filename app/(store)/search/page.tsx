import type { Metadata } from "next";
import LiveSearch from "@/components/store/LiveSearch";

export const metadata: Metadata = {
  title: "Search · Giftly",
  description: "Search Giftly for the perfect gift.",
};

/** Live search page. The initial query comes from ?q= (e.g. the header search). */
export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-display font-semibold text-ink">Search</h1>
      <LiveSearch initialQuery={searchParams.q ?? ""} />
    </div>
  );
}
