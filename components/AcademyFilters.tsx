import Link from "next/link";
import { ACADEMY_LEVELS, ACADEMY_TRACKS, type AcademyLevel, type AcademyTrack } from "@/lib/academy-types";
import type { Locale } from "@/lib/i18n";

type AcademyFilterLabels = {
  searchPlaceholder: string;
  searchFieldLabel: string;
  allTracks: string;
  allLevels: string;
  trackFieldLabel: string;
  levelFieldLabel: string;
  search: string;
  reset: string;
  tracks: Record<AcademyTrack, string>;
  levels: Record<AcademyLevel, string>;
};

type AcademyFiltersProps = {
  locale: Locale;
  labels: AcademyFilterLabels;
  current: { q?: string; track?: string; level?: string };
};

export default function AcademyFilters({ locale, labels, current }: AcademyFiltersProps) {
  const searchId = `academy-search-${locale}`;
  const trackId = `academy-track-${locale}`;
  const levelId = `academy-level-${locale}`;

  function hrefForTrack(track?: AcademyTrack) {
    const params = new URLSearchParams();
    if (current.q) params.set("q", current.q);
    if (current.level) params.set("level", current.level);
    if (track) params.set("track", track);
    const query = params.toString();
    return `/${locale}/academy${query ? `?${query}` : ""}`;
  }

  const chipClass = (active: boolean) =>
    `focus-ring rounded-full px-4 py-2 text-xs font-black transition ${
      active
        ? "bg-[var(--teal)] text-[#101828] shadow-sm"
        : "border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--teal)] hover:text-[var(--indigo)]"
    }`;

  return (
    <div className="surface-card p-5 sm:p-6">
      <form action={`/${locale}/academy`} method="get" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_210px_170px_auto_auto]">
        <div>
          <label htmlFor={searchId} className="sr-only">{labels.searchFieldLabel}</label>
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
          <label htmlFor={trackId} className="sr-only">{labels.trackFieldLabel}</label>
          <select id={trackId} name="track" defaultValue={current.track ?? ""} className="focus-ring min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--page)] px-4 py-3 text-sm font-bold text-[var(--ink)] outline-none transition focus:border-[var(--teal)] focus:bg-[var(--surface)]">
            <option value="">{labels.allTracks}</option>
            {ACADEMY_TRACKS.map((track) => <option key={track} value={track}>{labels.tracks[track]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={levelId} className="sr-only">{labels.levelFieldLabel}</label>
          <select id={levelId} name="level" defaultValue={current.level ?? ""} className="focus-ring min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--page)] px-4 py-3 text-sm font-bold text-[var(--ink)] outline-none transition focus:border-[var(--teal)] focus:bg-[var(--surface)]">
            <option value="">{labels.allLevels}</option>
            {ACADEMY_LEVELS.map((level) => <option key={level} value={level}>{labels.levels[level]}</option>)}
          </select>
        </div>
        <button type="submit" className="focus-ring min-h-12 rounded-2xl bg-[#403A8F] px-5 py-3 text-sm font-black text-white transition hover:bg-[#302B78] active:scale-[0.98]">{labels.search}</button>
        <Link href={`/${locale}/academy`} className="focus-ring inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-center text-sm font-black text-[var(--ink)] transition hover:border-[var(--teal)] hover:text-[var(--indigo)]">{labels.reset}</Link>
      </form>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={labels.trackFieldLabel}>
        <Link href={hrefForTrack()} className={chipClass(!current.track)} aria-current={!current.track ? "page" : undefined}>{labels.allTracks}</Link>
        {ACADEMY_TRACKS.map((track) => (
          <Link key={track} href={hrefForTrack(track)} className={chipClass(current.track === track)} aria-current={current.track === track ? "page" : undefined}>
            {labels.tracks[track]}
          </Link>
        ))}
      </div>
    </div>
  );
}
