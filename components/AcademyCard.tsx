import Link from "next/link";
import AcademyLessonVisual from "@/components/AcademyLessonVisual";
import type { Locale } from "@/lib/i18n";
import type { AcademyLevel, AcademyTrack, LocalizedAcademyLesson } from "@/lib/academy-types";
import { formatDate } from "@/lib/utils";

type AcademyCardLabels = {
  tracks: Record<AcademyTrack, string>;
  levels: Record<AcademyLevel, string>;
  analysisLens: string;
  tutorial: string;
  startTutorial: string;
  minutes: string;
};

type AcademyCardProps = {
  lesson: LocalizedAcademyLesson;
  locale: Locale;
  labels: AcademyCardLabels;
};

export default function AcademyCard({ lesson, locale, labels }: AcademyCardProps) {
  const identifier = `${labels.tutorial} ${String(lesson.sequence).padStart(2, "0")}`;

  return (
    <article className="surface-card group overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-[var(--teal)] hover:shadow-[var(--shadow-soft)]">
      <Link
        href={`/${locale}/academy/${lesson.slug}`}
        className="focus-ring grid h-full md:grid-cols-[minmax(280px,38%)_minmax(0,1fr)]"
      >
        <div className="min-h-[18rem] border-b border-[var(--line)] md:min-h-[22rem] md:border-b-0 md:border-r">
          <AcademyLessonVisual
            sequence={lesson.sequence}
            track={lesson.track}
            eyebrow={labels.analysisLens}
            label={lesson.visualLabel}
            compact
          />
        </div>

        <div className="flex min-w-0 flex-col p-6 sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.16em]">
            <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-[var(--indigo)]">
              {labels.tracks[lesson.track]}
            </span>
            <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-[var(--muted)]">
              {labels.levels[lesson.level]}
            </span>
            <span className="text-[var(--muted)]">{formatDate(lesson.publishedAt, locale)}</span>
          </div>

          <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-[var(--teal)]">{identifier}</p>
          <h3 className="mt-3 text-balance text-2xl font-black leading-tight tracking-[-0.03em] text-[var(--ink)] transition group-hover:text-[var(--indigo)] sm:text-3xl">
            {lesson.title}
          </h3>
          <p className="mt-4 line-clamp-3 text-base leading-7 text-[var(--muted)]">{lesson.shortSummary}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {lesson.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm font-black">
            <span className="text-[var(--muted)]">{lesson.durationMinutes} {labels.minutes}</span>
            <span className="inline-flex items-center text-[var(--indigo)]">
              {labels.startTutorial}
              <span aria-hidden="true" className="ml-2 transition group-hover:translate-x-1">→</span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
