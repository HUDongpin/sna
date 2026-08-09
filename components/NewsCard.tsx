import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { LocalizedNewsArticle } from "@/lib/news-types";

type NewsCardLabels = {
  journal: string;
  conference: string;
  readArticle: string;
  openAccess: string;
};

interface NewsCardProps {
  article: LocalizedNewsArticle;
  locale: Locale;
  labels: NewsCardLabels;
  priority?: boolean;
}

export default function NewsCard({ article, locale, labels, priority = false }: NewsCardProps) {
  const typeLabel = labels[article.type];
  const sequence = String(article.sequence).padStart(2, "0");
  const identifier = `${typeLabel} ${sequence}`;

  return (
    <article className="surface-card group overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-[var(--teal)] hover:shadow-[var(--shadow-soft)]">
      <Link
        href={`/${locale}/news/${article.slug}`}
        className="focus-ring grid h-full md:grid-cols-[minmax(280px,38%)_minmax(0,1fr)]"
      >
        <div className="relative aspect-[16/10] overflow-hidden border-b border-[var(--line)] bg-[var(--page-strong)] md:aspect-auto md:min-h-[22rem] md:border-b-0 md:border-r">
          <Image
            src={article.coverImage}
            alt={article.imageAlt}
            fill
            priority={priority}
            sizes="(min-width: 768px) 38vw, calc(100vw - 32px)"
            className="object-cover transition duration-300 group-hover:scale-[1.012] group-hover:brightness-[0.98]"
          />
        </div>

        <div className="flex min-w-0 flex-col p-6 sm:p-7 lg:p-8">
          <div className="flex items-start justify-between gap-4 text-xs font-black uppercase tracking-[0.16em]">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-[var(--indigo)]">{typeLabel}</span>
              <span className="text-[var(--muted)]">{article.year}</span>
              {article.openAccess ? (
                <span className="rounded-full bg-[color:rgba(24,169,154,0.14)] px-3 py-1 text-[var(--teal)]">
                  {labels.openAccess}
                </span>
              ) : null}
            </div>
            <span className="shrink-0 text-right text-[0.68rem] leading-5 text-[var(--indigo)]" aria-label={identifier}>
              {identifier}
            </span>
          </div>

          <h3 className="mt-4 text-balance text-2xl font-black leading-tight tracking-[-0.03em] text-[var(--ink)] transition group-hover:text-[var(--indigo)] sm:text-3xl">
            {article.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{article.authors.join(", ")}</p>
          <p className="mt-2 text-sm font-bold text-[var(--ink)]">{article.venue}</p>
          <p className="mt-4 line-clamp-3 text-base leading-7 text-[var(--muted)]">{article.summary}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {article.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                {tag}
              </span>
            ))}
          </div>

          <span className="mt-6 inline-flex items-center text-sm font-black text-[var(--indigo)]">
            {labels.readArticle}
            <span aria-hidden="true" className="ml-2 transition group-hover:translate-x-1">
              →
            </span>
          </span>
        </div>
      </Link>
    </article>
  );
}
