import type { MetadataRoute } from "next";

const SITE_URL = process.env.APP_URL || "https://taniyai.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
