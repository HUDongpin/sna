import Link from "next/link";

export default function NotFound() {
  return (
    <main className="bg-sna-gradient grid min-h-[100dvh] place-items-center px-4 py-16">
      <div className="surface-card max-w-xl p-10 text-center sm:p-14">
        <p className="text-sm font-black text-[var(--indigo)]">404</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[var(--ink)]">This connection is missing.</h1>
        <p className="mt-5 text-lg leading-8 text-[var(--muted)]">The page may have moved, or the network path may not exist yet.</p>
        <Link href="/en" className="focus-ring mt-8 inline-flex min-h-12 items-center rounded-full bg-[#403A8F] px-6 font-black text-[#F8FAFC]">
          Return home
        </Link>
      </div>
    </main>
  );
}
