import type { MetadataRoute } from "next";
import { fetchPublishedSessions } from "../lib/firebaseContent";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.APP_URL || "https://thethinkingarchitects.com.ng";

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/about`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/sessions`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/media`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/community`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/contact`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/wrapped`,
      changeFrequency: "yearly",
      priority: 0.7,
    },
  ];

  try {
    const publishedSessions = await fetchPublishedSessions();
    const sessionEntries: MetadataRoute.Sitemap = publishedSessions.map((session) => ({
      url: `${siteUrl}/sessions/${encodeURIComponent(session.id)}`,
      ...(session.updatedAtMs ? { lastModified: new Date(session.updatedAtMs) } : {}),
      changeFrequency: session.status === "upcoming" ? "weekly" : "monthly",
      priority: session.isNextSession ? 0.9 : 0.7,
    }));
    return [...staticEntries, ...sessionEntries];
  } catch (error) {
    console.warn("sitemap session fetch failed:", error);
    return staticEntries;
  }
}
