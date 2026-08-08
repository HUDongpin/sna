"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="bg-sna-gradient grid min-h-[100dvh] place-items-center px-4 py-16">
      <div className="surface-card max-w-xl p-10 text-center sm:p-14">
        <h1 className="text-4xl font-black tracking-[-0.04em] text-[var(--ink)]">The network did not load.</h1>
        <p className="mt-5 text-lg leading-8 text-[var(--muted)]">A temporary error interrupted this page. Please try the connection again.</p>
        <button
          type="button"
          onClick={reset}
          className="focus-ring mt-8 min-h-12 rounded-full bg-[#403A8F] px-6 font-black text-[#F8FAFC] active:scale-[0.98]"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
