import { SITE_URL, absoluteUrl } from "@/lib/site";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "SNA.HK",
    alternateName: "Social Network Analysis",
    url: SITE_URL,
    description: "A knowledge platform for rigorous, accessible social network analysis.",
    logo: absoluteUrl("/favicon.svg"),
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "SNA.HK",
    url: SITE_URL,
    publisher: { "@id": ORGANIZATION_ID },
  };
}
