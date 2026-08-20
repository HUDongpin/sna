"use client";

import { useEffect, useRef, useState } from "react";

type ScrollProgressMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

export function getScrollProgress({ scrollTop, scrollHeight, clientHeight }: ScrollProgressMetrics) {
  const maxScroll = Math.max(0, scrollHeight - clientHeight);
  if (maxScroll === 0) return 0;

  return Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
}

export default function BackToTopArrow() {
  const [visible, setVisible] = useState(false);
  const progressArcRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting));
    const marker = document.querySelector("[data-page-top]");
    if (marker) observer.observe(marker);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || CSS.supports("animation-timeline: scroll()")) return;

    let animationFrame = 0;
    let previousOffset = "";

    const updateFallbackProgress = () => {
      const scrollingElement = document.scrollingElement ?? document.documentElement;
      const scrollHeight = Math.max(
        scrollingElement.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const progress = getScrollProgress({
        scrollTop: window.scrollY || scrollingElement.scrollTop,
        scrollHeight,
        clientHeight: window.innerHeight || scrollingElement.clientHeight,
      });
      const nextOffset = (100 - progress).toFixed(3);

      if (progressArcRef.current && nextOffset !== previousOffset) {
        progressArcRef.current.style.strokeDashoffset = nextOffset;
        previousOffset = nextOffset;
      }

      animationFrame = window.requestAnimationFrame(updateFallbackProgress);
    };

    animationFrame = window.requestAnimationFrame(updateFallbackProgress);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [visible]);

  if (!visible) return null;

  function handleClick() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="focus-ring fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-[#403A8F] text-xl font-black text-[#F8FAFC] shadow-[0_16px_40px_rgba(64,58,143,0.34)] transition hover:-translate-y-1 active:scale-[0.98]"
      aria-label="Back to top"
    >
      <svg aria-hidden="true" viewBox="0 0 48 48" className="pointer-events-none absolute inset-0 h-full w-full">
        <circle
          cx="24"
          cy="24"
          r="21.5"
          fill="none"
          stroke="rgba(248, 250, 252, 0.28)"
          strokeWidth="3"
          data-page-scroll-track
        />
        <circle
          ref={progressArcRef}
          cx="24"
          cy="24"
          r="21.5"
          pathLength="100"
          fill="none"
          stroke="#72DFD2"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="100"
          strokeDashoffset="100"
          transform="rotate(-90 24 24)"
          className="page-scroll-progress-arc"
          data-page-scroll-progress
        />
      </svg>
      <span aria-hidden="true" className="relative">
        ↑
      </span>
    </button>
  );
}
