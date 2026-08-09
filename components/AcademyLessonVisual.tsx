import type { AcademyTrack } from "@/lib/academy-types";

type AcademyLessonVisualProps = {
  sequence: number;
  track: AcademyTrack;
  eyebrow: string;
  label: string;
  compact?: boolean;
};

const trackStyles: Record<AcademyTrack, { badge: string; node: string; glow: string }> = {
  "network-theory": {
    badge: "bg-[#403A8F] text-white",
    node: "bg-[#403A8F]",
    glow: "bg-[color:rgba(64,58,143,0.14)]",
  },
  "methods-visualization": {
    badge: "bg-[var(--teal)] text-[#101828]",
    node: "bg-[var(--teal)]",
    glow: "bg-[color:rgba(24,169,154,0.16)]",
  },
  "responsible-application": {
    badge: "bg-[var(--amber)] text-[#101828]",
    node: "bg-[var(--amber)]",
    glow: "bg-[color:rgba(244,163,64,0.18)]",
  },
};

const nodes = [
  { left: "17%", top: "24%" },
  { left: "39%", top: "17%" },
  { left: "61%", top: "31%" },
  { left: "80%", top: "18%" },
  { left: "27%", top: "64%" },
  { left: "54%", top: "72%" },
  { left: "79%", top: "63%" },
];

const edges = [
  { left: "19%", top: "28%", width: "23%", rotate: "-8deg" },
  { left: "41%", top: "22%", width: "24%", rotate: "28deg" },
  { left: "63%", top: "31%", width: "20%", rotate: "-31deg" },
  { left: "20%", top: "31%", width: "38%", rotate: "65deg" },
  { left: "30%", top: "65%", width: "27%", rotate: "16deg" },
  { left: "56%", top: "72%", width: "26%", rotate: "-18deg" },
  { left: "62%", top: "35%", width: "35%", rotate: "58deg" },
  { left: "43%", top: "23%", width: "55%", rotate: "51deg" },
];

export default function AcademyLessonVisual({
  sequence,
  track,
  eyebrow,
  label,
  compact = false,
}: AcademyLessonVisualProps) {
  const style = trackStyles[track];
  const highlightedNode = (Math.max(1, sequence) - 1) % nodes.length;

  return (
    <div
      className="network-field relative h-full min-h-[18rem] overflow-hidden bg-[var(--page-strong)]"
      aria-hidden="true"
    >
      <div className={`absolute -right-12 -top-12 h-44 w-44 rounded-full blur-2xl ${style.glow}`} />
      <div className={`absolute -bottom-16 -left-10 h-40 w-40 rounded-full blur-2xl ${style.glow}`} />

      <div className="absolute inset-x-[8%] top-[13%] bottom-[25%]">
        {edges.map((edge, index) => (
          <span
            key={`${edge.left}-${edge.top}`}
            className={`absolute h-px origin-left ${index === sequence % edges.length ? "bg-[var(--amber)]" : "bg-[var(--line)]"}`}
            style={{
              left: edge.left,
              top: edge.top,
              width: edge.width,
              transform: `rotate(${edge.rotate})`,
            }}
          />
        ))}
        {nodes.map((node, index) => {
          const highlighted = index === highlightedNode;
          return (
            <span
              key={`${node.left}-${node.top}`}
              className={`absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-[var(--surface)] shadow-sm ${
                highlighted ? `h-12 w-12 ${style.node}` : "h-7 w-7 bg-[var(--indigo)]"
              }`}
              style={{ left: node.left, top: node.top }}
            >
              {highlighted ? <span className="h-2 w-2 rounded-full bg-white/90" /> : null}
            </span>
          );
        })}
      </div>

      <div className="absolute left-5 top-5 flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.2em]">
        <span className={`rounded-full px-3 py-1 ${style.badge}`}>SNA</span>
        <span className="text-[var(--muted)]">{String(sequence).padStart(2, "0")}</span>
      </div>
      <div className={`absolute inset-x-5 bottom-5 ${compact ? "sm:inset-x-6 sm:bottom-6" : "sm:inset-x-8 sm:bottom-8"}`}>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">{eyebrow}</p>
        <p className="mt-1 text-2xl font-black tracking-[-0.03em] text-[var(--ink)] sm:text-3xl">{label}</p>
      </div>
    </div>
  );
}
