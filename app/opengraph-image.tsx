import { ImageResponse } from "next/og";

export const alt = "SNA.HK Social Network Analysis";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function BrandMark() {
  return (
    <svg width="180" height="180" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="15" fill="#F5F3FF" stroke="#DAD8EF" strokeWidth="1.5" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4">
        <line x1="13" y1="12" x2="26" y2="10" stroke="#403A8F" />
        <line x1="26" y1="10" x2="19" y2="21" stroke="#403A8F" />
        <line x1="19" y1="21" x2="13" y2="12" stroke="#403A8F" />
        <line x1="19" y1="21" x2="25" y2="25" stroke="#403A8F" />
        <line x1="25" y1="25" x2="29" y2="29" stroke="#18A99A" />
        <line x1="29" y1="29" x2="38" y2="34" stroke="#18A99A" />
        <line x1="38" y1="34" x2="27" y2="39" stroke="#18A99A" />
        <line x1="27" y1="39" x2="29" y2="29" stroke="#18A99A" />
      </g>
      <circle cx="13" cy="12" r="2.5" fill="#403A8F" />
      <circle cx="26" cy="10" r="2.5" fill="#403A8F" />
      <circle cx="19" cy="21" r="2.5" fill="#403A8F" />
      <circle cx="25" cy="25" r="3.5" fill="#F4A340" />
      <circle cx="29" cy="29" r="2.5" fill="#18A99A" />
      <circle cx="38" cy="34" r="2.5" fill="#18A99A" />
      <circle cx="27" cy="39" r="2.5" fill="#18A99A" />
    </svg>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "84px 96px",
          background: "#F7FAFC",
          color: "#101828",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
          <div style={{ fontSize: 112, lineHeight: 1, fontWeight: 900, letterSpacing: "-6px" }}>SNA</div>
          <div style={{ marginTop: 24, fontSize: 42, fontWeight: 600 }}>Social Network Analysis</div>
          <div style={{ marginTop: 36, fontSize: 26, color: "#667085" }}>WWW.SNA.HK</div>
        </div>
        <BrandMark />
      </div>
    ),
    size
  );
}
