import Link from "next/link";
import type { Locale } from "@/lib/i18n";

type NewsFilterLabels = {
  searchPlaceholder: string;
  allTypes: string;
  allYears: string;
  search: string;
  reset: string;
  journal: string;
  conference: string;
};

interface NewsFiltersProps {
  locale: Locale;
  labels: NewsFilterLabels;
  years: number[];
  current: {
    q?: string;
    type?: string;
    year?: string;
  };
}

export default function NewsFilters({ locale, labels, years, current }: NewsFiltersProps) {
  const searchId = `news-search-${locale}`;
  const typeId = `news-type-${locale}`;
  const yearId = `news-year-${locale}`;

  function hrefForType(type?: "journal" | "conference") {
    const params = new URLSearchParams();
    if (current.q) params.set("q", current.q);
    if (current.year) params.set("year", current.year);
    if (type) params.set("type", type);
    const query = params.toString();
    return `/${locale}/news${query ? `?${query}` : ""}`;
  }

  const chipClass = (active: boolean) =>
    `focus-ring rounded-full px-4 py-2 text-xs font-black transition ${
      active
        ? "bg-[var(--teal)] text-[#101828] shadow-sm"
        : "border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--teal)] hover:text-[var(--indigo)]"
    }`;

  return (
    <div className="surface-card p-5 sm:p-6">
      <form action={`/${locale}/news`} method="get" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_160px_auto_auto]">
        <div>
          <label htmlFor={searchId} className="sr-only">
            {labels.searchPlaceholder}
          </label>
          <input
            id={searchId}
            name="q"
            type="search"
            defaultValue={current.q ?? ""}
            placeholder={labels.searchPlaceholder}
            className="focus-ring min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--page)] px-4 py-3 text-sm font-medium text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--teal)] focus:bg-[var(--surface)]"
          />
        </div>

        <div>
          <label htmlFor={typeId} className="sr-only">
            {labels.allTypes}
          </label>
          <select
            id={typeId}
            name="type"
            defaultValue={current.type ?? ""}
            className="focus-ring min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--page)] px-4 py-3 text-sm font-bold text-[var(--ink)] outline-none transition focus:border-[var(--teal)] focus:bg-[var(--surface)]"
          >
            <option value="">{labels.allTypes}</option>
            <option value="journal">{labels.journal}</option>
            <option value="conference">{labels.conference}</option>
          </select>
        </div>

        <div>
          <label htmlFor={yearId} className="sr-only">
            {labels.allYears}
          </label>
          <select
            id={yearId}
            name="year"
            defaultValue={current.year ?? ""}
            className="focus-ring min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--page)] px-4 py-3 text-sm font-bold text-[var(--ink)] outline-none transition focus:border-[var(--teal)] focus:bg-[var(--surface)]"
          >
            <option value="">{labels.allYears}</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="focus-ring min-h-12 rounded-2xl bg-[#403A8F] px-5 py-3 text-sm font-black text-white transition hover:bg-[#302B78] active:scale-[0.98]"
        >
          {labels.search}
        </button>
        <Link
          href={`/${locale}/news`}
          className="focus-ring inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-center text-sm font-black text-[var(--ink)] transition hover:border-[var(--teal)] hover:text-[var(--indigo)]"
        >
          {labels.reset}
        </Link>
      </form>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={labels.allTypes}>
        <Link
          href={hrefForType()}
          className={chipClass(!current.type)}
          aria-current={!current.type ? "page" : undefined}
        >
          {labels.allTypes}
        </Link>
        <Link
          href={hrefForType("journal")}
          className={chipClass(current.type === "journal")}
          aria-current={current.type === "journal" ? "page" : undefined}
        >
          {labels.journal}
        </Link>
        <Link
          href={hrefForType("conference")}
          className={chipClass(current.type === "conference")}
          aria-current={current.type === "conference" ? "page" : undefined}
        >
          {labels.conference}
        </Link>
      </div>
    </div>
  );
}
