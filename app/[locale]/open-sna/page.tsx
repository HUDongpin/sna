import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OpenSnaWorkbench from "@/components/open-sna/OpenSnaWorkbench";
import { getLocaleMeta, isLocale, type Locale } from "@/lib/i18n";
import { getOpenSnaCopy } from "@/lib/open-sna-copy";
import { absoluteUrl } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = getOpenSnaCopy(locale);
  const url = absoluteUrl("/en/open-sna");
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: `${copy.meta.title} | SNA.HK`,
      description: copy.meta.description,
      url,
      siteName: "SNA.HK",
    },
    twitter: { card: "summary_large_image", title: `${copy.meta.title} | SNA.HK`, description: copy.meta.description },
  };
}

export default async function OpenSnaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const copy = getOpenSnaCopy(typedLocale);
  const meta = getLocaleMeta(typedLocale);
  const page = copy.page;

  return (
    <div className="bg-sna-gradient" lang={meta.htmlLang}>
      <a href="#open-sna-workbench" className="focus-ring fixed left-4 top-3 z-[70] -translate-y-24 rounded-xl bg-[#403A8F] px-4 py-3 text-sm font-black text-white shadow-xl transition focus:translate-y-0">{page.skip}</a>
      <section className="container-page pb-6 pt-9 sm:pt-12 lg:pb-9 lg:pt-14">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
          <div className="hero-enter min-w-0 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--indigo)]">{page.eyebrow}</p>
              <span className="rounded-full border border-[var(--teal-line)] bg-[var(--teal-tint)] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.1em] text-[var(--teal-ink)]">{page.runsOnR}</span>
            </div>
            <h1 className="mt-4 break-words text-balance text-5xl font-black leading-[0.96] tracking-[-0.055em] text-[var(--ink)] [overflow-wrap:anywhere] sm:text-6xl lg:text-7xl">{page.titleLead}<br /><span className="text-[var(--indigo)]">{page.titleAccent}</span></h1>
            <p className="mt-5 max-w-[68ch] text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">{page.intro}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="#open-sna-workbench" className="focus-ring inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#403A8F] px-5 font-black text-[#F8FAFC] shadow-[0_14px_28px_rgba(64,58,143,0.24)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#302B78]">{page.exploreReference}<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></a>
              <a href="#open-sna-setup" className="focus-ring inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 font-black text-[var(--ink)] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--indigo)] hover:bg-[var(--surface-soft)]"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-[var(--indigo)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></svg>{page.analyzeWorkbook}</a>
            </div>
            <dl className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-[var(--line)] pt-5 text-sm">
              <div className="flex items-baseline gap-2"><dd className="text-lg font-black tabular-nums text-[var(--ink)]">8</dd><dt className="text-[var(--muted)]">{page.analysisViews}</dt></div>
              <div className="flex items-baseline gap-2"><dd className="text-lg font-black tabular-nums text-[var(--ink)]">1,000</dd><dt className="text-[var(--muted)]">{page.nctPermutations}</dt></div>
              <div className="flex items-baseline gap-2"><dd className="text-lg font-black text-[var(--ink)]">{page.zero}</dd><dt className="text-[var(--muted)]">{page.rawRows}</dt></div>
            </dl>
          </div>

          <aside className="surface-card network-field hero-enter-delayed hidden p-5 lg:block" aria-label={page.methodSummaryLabel}>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--teal-ink)]">{page.fromData}</p>
            <ol className="mt-4 space-y-3">
              {page.steps.map((step, index) => (
                <li key={step.label} className="flex gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-glass)] p-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--surface-soft)] text-[0.68rem] font-black text-[var(--indigo)]">{String(index + 1).padStart(2, "0")}</span>
                  <span><strong className="block text-sm text-[var(--ink)]">{step.label}</strong><span className="mt-0.5 block text-xs leading-5 text-[var(--muted)]">{step.detail}</span></span>
                </li>
              ))}
            </ol>
            <p className="mt-4 flex items-center gap-2 text-xs font-bold text-[var(--muted)]"><span className="h-2 w-2 rounded-full bg-[var(--teal-solid)]" aria-hidden="true" />{page.aggregateOnly}</p>
          </aside>

          <details className="surface-card group lg:hidden">
            <summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-[2rem] px-5 py-3 font-black text-[var(--ink)] marker:content-none"><span><span className="block text-[0.68rem] uppercase tracking-[0.14em] text-[var(--teal-ink)]">{page.mobileEyebrow}</span><span className="mt-0.5 block text-sm">{page.mobileTitle}</span></span><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-[var(--indigo)] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 10 4 4 4-4" /></svg></summary>
            <ul className="space-y-2 border-t border-[var(--line)] px-5 py-4 text-sm leading-6 text-[var(--muted)]">{page.mobileItems.map((item) => <li key={item.label}><strong className="text-[var(--ink)]">{item.label}</strong> {item.text}</li>)}</ul>
          </details>
        </div>
      </section>

      <section className="container-page pb-24 pt-3">
        <OpenSnaWorkbench copy={copy} locale={typedLocale} htmlLang={meta.htmlLang} analysisDisabled={process.env.OPEN_SNA_R_DISABLED === "1"} />
      </section>
    </div>
  );
}
