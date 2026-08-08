export default function Loading() {
  return (
    <div className="bg-sna-gradient min-h-[100dvh] px-4 py-20" role="status" aria-live="polite">
      <div className="container-page animate-pulse">
        <div className="h-4 w-28 rounded-full bg-[var(--line)]" />
        <div className="mt-6 h-14 max-w-2xl rounded-2xl bg-[var(--line)]" />
        <div className="mt-5 h-24 max-w-xl rounded-2xl bg-[var(--line)]" />
        <div className="mt-12 aspect-[16/7] rounded-[2rem] bg-[var(--line)]" />
      </div>
      <span className="sr-only">Loading SNA.HK</span>
    </div>
  );
}
