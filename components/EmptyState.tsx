import Image from "next/image";

interface EmptyStateProps {
  title: string;
  text: string;
  note: string;
}

export default function EmptyState({ title, text, note }: EmptyStateProps) {
  return (
    <section className="container-page pb-24 pt-4">
      <div className="surface-card network-field mx-auto grid max-w-4xl gap-8 p-8 sm:p-12 lg:grid-cols-[auto_1fr] lg:items-center lg:p-16">
        <div className="grid h-28 w-28 place-items-center rounded-[2rem] border border-[#DAD8EF] bg-[#F5F3FF] shadow-[0_16px_44px_rgba(64,58,143,0.12)]">
          <Image src="/favicon.svg" alt="" width={80} height={80} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-balance text-3xl font-black tracking-[-0.03em] text-[var(--ink)] sm:text-4xl">{title}</h2>
          <p className="mt-4 max-w-[58ch] text-lg leading-8 text-[var(--muted)]">{text}</p>
          <p className="mt-6 border-l-4 border-[#F4A340] pl-4 text-sm font-bold leading-6 text-[var(--ink)]">{note}</p>
        </div>
      </div>
    </section>
  );
}
