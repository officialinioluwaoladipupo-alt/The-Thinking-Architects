export type EmbedMediaInfo =
  | { type: "iframe"; src: string; title: string; aspect: "video" | "audio" }
  | { type: "video"; src: string }
  | { type: "audio"; src: string }
  | null;

export function getEmbedInfo(rawUrl: string | undefined, fallbackTitle: string): EmbedMediaInfo {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith("https://")) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

  // YouTube (watch, youtu.be, live, shorts, embed)
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    let videoId = parsed.searchParams.get("v");
    if (!videoId && (parsed.pathname.startsWith("/embed/") || parsed.pathname.startsWith("/live/") || parsed.pathname.startsWith("/shorts/"))) {
      videoId = parsed.pathname.split("/")[2] ?? null;
    }
    if (videoId && /^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      return {
        type: "iframe",
        src: `https://www.youtube-nocookie.com/embed/${videoId}`,
        title: fallbackTitle,
        aspect: "video",
      };
    }
  }

  if (host === "youtu.be") {
    const videoId = parsed.pathname.replace(/^\//, "").split("/")[0];
    if (videoId && /^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      return {
        type: "iframe",
        src: `https://www.youtube-nocookie.com/embed/${videoId}`,
        title: fallbackTitle,
        aspect: "video",
      };
    }
  }

  // Vimeo
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    const idCandidate = segments[segments.length - 1];
    if (idCandidate && /^\d{5,15}$/.test(idCandidate)) {
      return {
        type: "iframe",
        src: `https://player.vimeo.com/video/${idCandidate}`,
        title: fallbackTitle,
        aspect: "video",
      };
    }
  }

  // Spotify episodes / shows
  if (host === "open.spotify.com") {
    const match = parsed.pathname.match(/^\/(episode|show|track)\/([a-zA-Z0-9]+)$/);
    if (match) {
      return {
        type: "iframe",
        src: `https://open.spotify.com/embed/${match[1]}/${match[2]}`,
        title: fallbackTitle,
        aspect: "audio",
      };
    }
  }

  // Direct HTML5 video or audio files
  const pathLower = parsed.pathname.toLowerCase();
  if (/\.(mp4|webm|ogg)$/i.test(pathLower)) {
    return { type: "video", src: trimmed };
  }
  if (/\.(mp3|wav|m4a|aac)$/i.test(pathLower)) {
    return { type: "audio", src: trimmed };
  }

  return null;
}
