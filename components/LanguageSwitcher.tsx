"use client";

import { usePathname, useRouter } from "next/navigation";
import { localeMeta, locales, type Locale } from "@/lib/i18n";

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  function changeLocale(nextLocale: string) {
    const segments = pathname.split("/");
    segments[1] = nextLocale;
    router.push(segments.join("/") || `/${nextLocale}`);
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{localeMeta[locale].languageLabel}</span>
      <select
        value={locale}
        onChange={(event) => changeLocale(event.target.value)}
        className="focus-ring h-11 cursor-pointer appearance-none rounded-full border border-[var(--line)] bg-[var(--surface)] py-2 pl-4 pr-9 text-sm font-bold text-[var(--ink)] shadow-sm"
        aria-label={localeMeta[locale].languageLabel}
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {localeMeta[item].label}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-3 text-xs text-[var(--muted)]">
        ▾
      </span>
    </label>
  );
}
