import Link from "next/link";
import type { Locale } from "@/lib/i18n";

interface NewsPaginationProps {
  locale: Locale;
  page: number;
  totalPages: number;
  q?: string;
  type?: string;
  year?: string;
  previous: string;
  next: string;
  pageLabel: string;
}

export default function NewsPagination({
  locale,
  page,
  totalPages,
  q,
  type,
  year,
  previous,
  next,
  pageLabel,
}: NewsPaginationProps) {
  if (totalPages <= 1) return null;

  function hrefForPage(nextPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (year) params.set("year", year);
    params.set("page", String(nextPage));
    return `/${locale}/news?${params.toString()}`;
  }

  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  const boundaryClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-black text-[var(--ink)]";

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-3" aria-label={pageLabel}>
      {page > 1 ? (
        <Link
          href={hrefForPage(previousPage)}
          rel="prev"
          className={`${boundaryClass} focus-ring transition hover:border-[var(--teal)] hover:text-[var(--indigo)]`}
          aria-label={previous}
        >
          <span aria-hidden="true">←</span>
          <span className="sr-only sm:not-sr-only">{previous}</span>
        </Link>
      ) : (
        <span className={`${boundaryClass} cursor-not-allowed opacity-45`} aria-disabled="true">
          <span aria-hidden="true">←</span>
          <span className="sr-only sm:not-sr-only">{previous}</span>
        </span>
      )}

      {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
        const active = pageNumber === page;
        return (
          <Link
            key={pageNumber}
            href={hrefForPage(pageNumber)}
            aria-current={active ? "page" : undefined}
            aria-label={`${pageLabel} ${pageNumber}`}
            className={`focus-ring grid h-11 w-11 place-items-center rounded-full text-sm font-black transition ${
              active
                ? "bg-[var(--teal)] text-[#101828] shadow-sm"
                : "border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--teal)] hover:text-[var(--indigo)]"
            }`}
          >
            {pageNumber}
          </Link>
        );
      })}

      {page < totalPages ? (
        <Link
          href={hrefForPage(nextPage)}
          rel="next"
          className={`${boundaryClass} focus-ring transition hover:border-[var(--teal)] hover:text-[var(--indigo)]`}
          aria-label={next}
        >
          <span className="sr-only sm:not-sr-only">{next}</span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span className={`${boundaryClass} cursor-not-allowed opacity-45`} aria-disabled="true">
          <span className="sr-only sm:not-sr-only">{next}</span>
          <span aria-hidden="true">→</span>
        </span>
      )}
    </nav>
  );
}
