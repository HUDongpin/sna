import Link from "next/link";
import type { Dictionary, Locale } from "@/lib/i18n";
import Logo from "@/components/Logo";

export default function Footer({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const year = new Date().getFullYear();
  const navItems = [
    { href: `/${locale}`, label: dictionary.nav.home },
    { href: `/${locale}/mission`, label: dictionary.nav.mission },
    { href: `/${locale}/news`, label: dictionary.nav.news },
    { href: `/${locale}/academy`, label: dictionary.nav.academy },
    { href: `/${locale}/about`, label: dictionary.nav.about },
  ];

  return (
    <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.3fr_0.7fr_0.9fr]">
        <div>
          <Logo locale={locale} />
          <p className="mt-5 max-w-md text-sm leading-7 text-[var(--muted)]">{dictionary.footer.description}</p>
        </div>
        <div>
          <h2 className="text-sm font-black text-[var(--ink)]">{dictionary.footer.navigation}</h2>
          <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-[var(--indigo)]">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-black text-[var(--ink)]">{dictionary.footer.scope}</h2>
          <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
            {dictionary.footer.scopeItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--line)] py-5 text-center text-xs font-medium text-[var(--muted)]">
        © {year} {dictionary.footer.copyright}
      </div>
    </footer>
  );
}
