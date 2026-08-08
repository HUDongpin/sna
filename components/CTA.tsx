import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CTAProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export default function CTA({ href, children, variant = "primary" }: CTAProps) {
  return (
    <Link
      href={href}
      className={cn(
        "focus-ring inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full px-6 py-3 text-sm font-black transition duration-300 active:scale-[0.98]",
        variant === "primary"
          ? "bg-[#403A8F] text-[#F8FAFC] shadow-[0_14px_34px_rgba(64,58,143,0.28)] hover:-translate-y-0.5 hover:bg-[#302B78]"
          : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:-translate-y-0.5 hover:border-[#18A99A] hover:text-[var(--indigo)]"
      )}
    >
      {children}
    </Link>
  );
}
