import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import BackToTopArrow from "@/components/BackToTopArrow";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.sna.hk"),
  title: {
    default: "SNA.HK | Social Network Analysis",
    template: "%s | SNA.HK",
  },
  description: "A knowledge platform for rigorous, accessible social network analysis.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "SNA.HK",
    title: "SNA.HK | Social Network Analysis",
    description: "See the structure behind connection.",
    url: "https://www.sna.hk",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "SNA.HK Social Network Analysis" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SNA.HK | Social Network Analysis",
    description: "See the structure behind connection.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <span data-page-top className="pointer-events-none absolute left-0 top-0 h-px w-px" aria-hidden="true" />
        {children}
        <BackToTopArrow />
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
