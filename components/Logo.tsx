import Link from "next/link";

export type LogoLocale = "en" | "zh-hant" | "zh-hans";

export interface LogoProps {
  locale: LogoLocale;
  compact?: boolean;
}

const homeLabels: Record<LogoLocale, string> = {
  en: "SNA home",
  "zh-hant": "SNA 首頁",
  "zh-hans": "SNA 首页",
};

export default function Logo({ locale, compact = false }: LogoProps) {
  const symbolSize = compact ? 40 : 44;

  return (
    <Link
      href={`/${locale}`}
      aria-label={homeLabels[locale]}
      className="focus-ring group inline-flex items-center gap-3 rounded-2xl"
    >
      <img
        src="/logos/sna-logo.svg"
        alt=""
        aria-hidden="true"
        width={symbolSize}
        height={symbolSize}
        style={{ display: "block", flex: "0 0 auto" }}
      />
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className="text-lg font-black leading-none tracking-[-0.04em] text-[var(--ink)] transition group-hover:text-[var(--indigo)]"
        >
          SNA
        </span>
        <span
          className={`${compact ? "text-[9px]" : "text-xs"} mt-1 hidden whitespace-nowrap font-semibold leading-tight text-[var(--muted)] sm:block`}
        >
          Social Network Analysis
        </span>
      </span>
    </Link>
  );
}
