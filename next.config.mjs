/** @type {import("next").NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.sna.hk",
  },
  turbopack: {
    root: new URL(".", import.meta.url).pathname,
  },
  async redirects() {
    const localePattern = "en|zh-hant|zh-hans";

    return [
      {
        source: "/news",
        destination: "/en/news",
        permanent: false,
      },
      {
        source: "/news/:slug*",
        destination: "/en/news/:slug*",
        permanent: false,
      },
      {
        source: "/academy",
        destination: "/en/academy",
        permanent: false,
      },
      {
        source: "/academy/:slug*",
        destination: "/en/academy/:slug*",
        permanent: false,
      },
      {
        source: "/mission",
        destination: "/en/mission",
        permanent: false,
      },
      {
        source: "/about",
        destination: "/en/about",
        permanent: false,
      },
      {
        source: "/research-news",
        destination: "/en/news",
        permanent: true,
      },
      {
        source: "/research-news/:slug*",
        destination: "/en/news/:slug*",
        permanent: true,
      },
      {
        source: `/:locale(${localePattern})/research-news`,
        destination: "/:locale/news",
        permanent: true,
      },
      {
        source: `/:locale(${localePattern})/research-news/:slug*`,
        destination: "/:locale/news/:slug*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
