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

export function personJsonLd(input: {
  name: string;
  url: string;
  jobTitle?: string;
  description?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    url: input.url,
    ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: input.image } : {}),
  };
}

export function aboutOrganizationJsonLd(input: {
  name: string;
  url: string;
  description?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
  };
}
