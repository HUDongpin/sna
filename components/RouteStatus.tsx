"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import HtmlLangSync from "@/components/HtmlLangSync";
import { DEFAULT_LOCALE, getLocaleMeta, localeFromPathname, type Locale } from "@/lib/locales";
import { statusCopy } from "@/lib/status-copy";

function useRouteStatusCopy() {
  const pathname = usePathname();
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(localeFromPathname(pathname));
  }, [pathname]);

  return {
    copy: statusCopy[locale],
    locale,
    meta: getLocaleMeta(locale),
  };
}

export function RouteNotFound() {
  const { copy, locale, meta } = useRouteStatusCopy();

  return (
    <main lang={meta.htmlLang} dir={meta.dir} className="bg-sna-gradient grid min-h-[100dvh] place-items-center px-4 py-16">
      <HtmlLangSync lang={meta.htmlLang} dir={meta.dir} />
      <div className="surface-card max-w-xl p-10 text-center sm:p-14">
        <p className="text-sm font-black text-[var(--indigo)]">404</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[var(--ink)]">{copy.notFound.title}</h1>
        <p className="mt-5 text-lg leading-8 text-[var(--muted)]">{copy.notFound.text}</p>
        <Link
          href={`/${locale}`}
          className="focus-ring mt-8 inline-flex min-h-12 items-center rounded-full bg-[#403A8F] px-6 font-black text-[#F8FAFC]"
        >
          {copy.notFound.cta}
        </Link>
      </div>
    </main>
  );
}

export function RouteLoading() {
  const { copy, meta } = useRouteStatusCopy();

  return (
    <div
      lang={meta.htmlLang}
      dir={meta.dir}
      className="bg-sna-gradient min-h-[100dvh] px-4 py-20"
      role="status"
      aria-live="polite"
    >
      <HtmlLangSync lang={meta.htmlLang} dir={meta.dir} />
      <div className="container-page animate-pulse">
        <div className="h-4 w-28 rounded-full bg-[var(--line)]" />
        <div className="mt-6 h-14 max-w-2xl rounded-2xl bg-[var(--line)]" />
        <div className="mt-5 h-24 max-w-xl rounded-2xl bg-[var(--line)]" />
        <div className="mt-12 aspect-[16/7] rounded-[2rem] bg-[var(--line)]" />
      </div>
      <span className="sr-only">{copy.loading.label} SNA.HK</span>
    </div>
  );
}

export function RouteError({ reset }: { reset: () => void }) {
  const { copy, meta } = useRouteStatusCopy();

  return (
    <main lang={meta.htmlLang} dir={meta.dir} className="bg-sna-gradient grid min-h-[100dvh] place-items-center px-4 py-16">
      <HtmlLangSync lang={meta.htmlLang} dir={meta.dir} />
      <div className="surface-card max-w-xl p-10 text-center sm:p-14">
        <h1 className="text-4xl font-black tracking-[-0.04em] text-[var(--ink)]">{copy.error.title}</h1>
        <p className="mt-5 text-lg leading-8 text-[var(--muted)]">{copy.error.text}</p>
        <button
          type="button"
          onClick={reset}
          className="focus-ring mt-8 min-h-12 rounded-full bg-[#403A8F] px-6 font-black text-[#F8FAFC] active:scale-[0.98]"
        >
          {copy.error.retry}
        </button>
      </div>
    </main>
  );
}
