import { NextRequest, NextResponse } from "next/server";

export type YouTubeVideoItem = {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  description: string;
};

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? decodeXmlEntities(match[1].trim()) : "";
}

function parseYouTubeAtom(xml: string): YouTubeVideoItem[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];
  return entries
    .map((entry) => {
      const videoId = extractTag(entry, "yt:videoId");
      const title = extractTag(entry, "title");
      const publishedRaw = extractTag(entry, "published");
      const description = extractTag(entry, "media:description").slice(0, 320);

      if (!videoId || !title) return null;

      let publishedAt = "";
      if (publishedRaw) {
        const parsed = new Date(publishedRaw);
        if (!Number.isNaN(parsed.getTime())) {
          publishedAt = parsed.toLocaleDateString("en-NG", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        }
      }

      return {
        id: videoId,
        title,
        url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
        publishedAt,
        description,
      };
    })
    .filter((item): item is YouTubeVideoItem => item !== null)
    .slice(0, 12);
}

async function resolveChannelId(rawUrl: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  if (host !== "youtube.com" && host !== "www.youtube.com" && host !== "m.youtube.com") {
    return null;
  }

  const channelMatch = parsed.pathname.match(/^\/channel\/(UC[a-zA-Z0-9_-]+)/);
  if (channelMatch) {
    return channelMatch[1];
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TheThinkingArchitects/1.0)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/youtube\.com\/feeds\/videos\.xml\?channel_id=(UC[a-zA-Z0-9_-]+)/) ??
      html.match(/"externalId":"(UC[a-zA-Z0-9_-]+)"/) ??
      html.match(/<meta itemprop="identifier" content="(UC[a-zA-Z0-9_-]+)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const channelUrl = req.nextUrl.searchParams.get("channelUrl")?.trim() ?? "";
  if (!channelUrl) {
    return NextResponse.json({ configured: false, videos: [] });
  }

  const channelId = await resolveChannelId(channelUrl);
  if (!channelId) {
    return NextResponse.json({
      configured: true,
      error: "Could not resolve YouTube channel feed.",
      videos: [],
    });
  }

  try {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
    const feedRes = await fetch(feedUrl, { next: { revalidate: 1800 } });
    if (!feedRes.ok) {
      return NextResponse.json({
        configured: true,
        error: "YouTube feed temporarily unavailable.",
        videos: [],
      });
    }
    const xml = await feedRes.text();
    const videos = parseYouTubeAtom(xml);
    return NextResponse.json({
      configured: true,
      channelId,
      videos,
    });
  } catch {
    return NextResponse.json({
      configured: true,
      error: "Unable to load YouTube recordings right now.",
      videos: [],
    });
  }
}
