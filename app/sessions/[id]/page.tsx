import type { Metadata } from "next";
import SessionDetailClient from "../../../components/SessionDetailClient";
import { fetchPublishedSessionById } from "../../../lib/firebaseContent";

export const dynamic = "force-dynamic";

const FALLBACK_METADATA: Metadata = {
  title: "Think Session | The Thinking Architects",
  description:
    "Details, speaker information, registration, and recording for a live Think Session.",
  openGraph: {
    title: "Think Session | The Thinking Architects",
    description:
      "Details, speaker information, registration, and recording for a live Think Session.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Think Session | The Thinking Architects",
    description:
      "Details, speaker information, registration, and recording for a live Think Session.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const sessionId = decodeURIComponent(id);
    const session = await fetchPublishedSessionById(sessionId);

    if (!session) {
      return FALLBACK_METADATA;
    }

    const pageTitle = `${session.title} — ${session.speaker} | The Thinking Architects`;
    const ogTitle = `${session.title} · ${session.speaker}`;
    const rawDescription =
      session.summary.trim() ||
      `${session.number} with ${session.speaker} (${session.speakerRole}) — ${session.dateLabel}, ${session.timeLabel}.`;
    const description =
      rawDescription.length > 220
        ? `${rawDescription.slice(0, 217).trimEnd()}...`
        : rawDescription;
    const siteUrl = process.env.APP_URL || "https://thethinkingarchitects.com.ng";
    const canonicalUrl = `${siteUrl}/sessions/${encodeURIComponent(session.id)}`;

    return {
      title: pageTitle,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: ogTitle,
        description,
        url: canonicalUrl,
        type: "article",
        siteName: "The Thinking Architects",
      },
      twitter: {
        card: "summary_large_image",
        title: ogTitle,
        description,
      },
    };
  } catch {
    return FALLBACK_METADATA;
  }
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SessionDetailClient sessionId={decodeURIComponent(id)} />;
}
