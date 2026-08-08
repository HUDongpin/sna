import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  center?: boolean;
}

export default function SectionHeader({ eyebrow, title, description, center = false }: SectionHeaderProps) {
  return (
    <div className={cn("max-w-3xl", center && "mx-auto text-center")}>
      {eyebrow ? (
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--indigo)]">{eyebrow}</p>
      ) : null}
      <h1 className="mt-4 text-balance text-4xl font-black leading-[1.05] tracking-[-0.04em] text-[var(--ink)] sm:text-5xl lg:text-6xl">
        {title}
      </h1>
      {description ? (
        <p className={cn("mt-5 max-w-[65ch] text-lg leading-8 text-[var(--muted)]", center && "mx-auto")}>{description}</p>
      ) : null}
    </div>
  );
}
