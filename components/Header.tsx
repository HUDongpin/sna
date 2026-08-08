"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";

export default function Header({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname().replace(/\/$/, "");
  const navItems = [
    { href: `/${locale}`, label: dictionary.nav.home },
    { href: `/${locale}/mission`, label: dictionary.nav.mission },
    { href: `/${locale}/news`, label: dictionary.nav.news },
    { href: `/${locale}/academy`, label: dictionary.nav.academy },
    { href: `/${locale}/about`, label: dictionary.nav.about },
  ];

  function isActive(href: string) {
    if (href === `/${locale}`) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--surface-glass)] backdrop-blur-xl">
      <div className="container-page flex h-20 items-center justify-between gap-4">
        <Logo locale={locale} />
        <nav className="hidden items-center gap-1 lg:flex" aria-label={dictionary.footer.navigation}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "focus-ring inline-flex h-11 items-center rounded-full px-4 text-sm font-bold transition",
                isActive(item.href)
                  ? "bg-[#403A8F] text-[#F8FAFC] shadow-[0_10px_24px_rgba(64,58,143,0.22)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--indigo)]"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden lg:block">
          <LanguageSwitcher locale={locale} />
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="focus-ring inline-flex min-h-11 items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--ink)] lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? dictionary.nav.close : dictionary.nav.menu}
        </button>
      </div>
      <div id="mobile-navigation" className={cn("border-t border-[var(--line)] bg-[var(--surface)] px-4 py-4 lg:hidden", open ? "block" : "hidden")}>
        <div className="container-page flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                "focus-ring inline-flex min-h-12 items-center rounded-2xl px-4 py-3 text-base font-bold",
                isActive(item.href) ? "bg-[#403A8F] text-[#F8FAFC]" : "text-[var(--ink)] hover:bg-[var(--surface-soft)]"
              )}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-2">
            <LanguageSwitcher locale={locale} />
          </div>
        </div>
      </div>
    </header>
  );
}
