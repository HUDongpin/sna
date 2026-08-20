import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OpenSnaWorkbench from "@/components/open-sna/OpenSnaWorkbench";
import { isLocale } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";

const title = "Open SNA";
const description = "Run a transparent social network analysis workflow for Programming Resilience questionnaire data, with network, centrality, bridge, predictability, subgroup, stability, and evidence-summary results.";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const url = absoluteUrl("/en/open-sna");
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: `${title} | SNA.HK`,
      description,
      url,
      siteName: "SNA.HK",
    },
    twitter: { card: "summary_large_image", title: `${title} | SNA.HK`, description },
  };
}

export default async function OpenSnaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div className="bg-sna-gradient" lang="en">
      <a href="#open-sna-workbench" className="focus-ring fixed left-4 top-3 z-[70] -translate-y-24 rounded-xl bg-[#403A8F] px-4 py-3 text-sm font-black text-white shadow-xl transition focus:translate-y-0">Skip to workbench</a>
      <section className="container-page pb-6 pt-9 sm:pt-12 lg:pb-9 lg:pt-14">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
          <div className="hero-enter min-w-0 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--indigo)]">Open research workbench</p>
              <span className="rounded-full border border-[var(--teal-line)] bg-[var(--teal-tint)] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.1em] text-[var(--teal-ink)]">Runs on R</span>
            </div>
            <h1 className="mt-4 break-words text-balance text-5xl font-black leading-[0.96] tracking-[-0.055em] text-[var(--ink)] [overflow-wrap:anywhere] sm:text-6xl lg:text-7xl">See the network.<br /><span className="text-[var(--indigo)]">Trust the method.</span></h1>
            <p className="mt-5 max-w-[68ch] text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">Explore a reproducible Programming Resilience reference network, or bring a compatible XLSX workbook into one evidence-consistent workflow for visualization, centrality, bridge nodes, subgroup comparison, and stability.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="#open-sna-workbench" className="focus-ring inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#403A8F] px-5 font-black text-[#F8FAFC] shadow-[0_14px_28px_rgba(64,58,143,0.24)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#302B78]">Explore reference result<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></a>
              <a href="#open-sna-setup" className="focus-ring inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 font-black text-[var(--ink)] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--indigo)] hover:bg-[var(--surface-soft)]"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-[var(--indigo)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></svg>Analyze your workbook</a>
            </div>
            <dl className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-[var(--line)] pt-5 text-sm">
              <div className="flex items-baseline gap-2"><dd className="text-lg font-black tabular-nums text-[var(--ink)]">8</dd><dt className="text-[var(--muted)]">analysis views</dt></div>
              <div className="flex items-baseline gap-2"><dd className="text-lg font-black tabular-nums text-[var(--ink)]">1,000</dd><dt className="text-[var(--muted)]">NCT permutations</dt></div>
              <div className="flex items-baseline gap-2"><dd className="text-lg font-black text-[var(--ink)]">Zero</dd><dt className="text-[var(--muted)]">raw rows in output</dt></div>
            </dl>
          </div>

          <aside className="surface-card network-field hero-enter-delayed hidden p-5 lg:block" aria-label="Open SNA method summary">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--teal-ink)]">From data to evidence</p>
            <ol className="mt-4 space-y-3">
              {[
                ["01", "Validate", "Bounded schema and privacy checks"],
                ["02", "Estimate", "NPN plus EBICglasso profile"],
                ["03", "Test", "NCT and case-dropping stability"],
              ].map(([step, label, detail]) => (
                <li key={step} className="flex gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-glass)] p-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--surface-soft)] text-[0.68rem] font-black text-[var(--indigo)]">{step}</span>
                  <span><strong className="block text-sm text-[var(--ink)]">{label}</strong><span className="mt-0.5 block text-xs leading-5 text-[var(--muted)]">{detail}</span></span>
                </li>
              ))}
            </ol>
            <p className="mt-4 flex items-center gap-2 text-xs font-bold text-[var(--muted)]"><span className="h-2 w-2 rounded-full bg-[var(--teal-solid)]" aria-hidden="true" />Aggregate results only by design</p>
          </aside>

          <details className="surface-card group lg:hidden">
            <summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-[2rem] px-5 py-3 font-black text-[var(--ink)] marker:content-none"><span><span className="block text-[0.68rem] uppercase tracking-[0.14em] text-[var(--teal-ink)]">Transparent by design</span><span className="mt-0.5 block text-sm">How the method is bounded</span></span><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-[var(--indigo)] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 10 4 4 4-4" /></svg></summary>
            <ul className="space-y-2 border-t border-[var(--line)] px-5 py-4 text-sm leading-6 text-[var(--muted)]"><li><strong className="text-[var(--ink)]">One profile:</strong> NPN plus EBICglasso across network panels.</li><li><strong className="text-[var(--ink)]">Real inference:</strong> NCT and case-dropping stability.</li><li><strong className="text-[var(--ink)]">Private output:</strong> aggregate metrics with no raw responses or IDs.</li></ul>
          </details>
        </div>
      </section>

      <section className="container-page pb-24 pt-3">
        <OpenSnaWorkbench />
      </section>
    </div>
  );
}
