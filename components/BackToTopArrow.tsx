"use client";

import { useEffect, useState } from "react";

export default function BackToTopArrow() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting));
    const marker = document.querySelector("[data-page-top]");
    if (marker) observer.observe(marker);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="focus-ring fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-[#403A8F] text-xl font-black text-[#F8FAFC] shadow-[0_16px_40px_rgba(64,58,143,0.34)] transition hover:-translate-y-1 active:scale-[0.98]"
      aria-label="Back to top"
    >
      ↑
    </button>
  );
}
