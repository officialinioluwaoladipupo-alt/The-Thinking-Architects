import type { Metadata } from "next";
import MediaPageClient from "../../components/MediaPageClient";

export const metadata: Metadata = {
  title: "Media | The Thinking Architects",
  description:
    "Recordings and features from Think Sessions so the conversation doesn't end when the call does.",
};

export default function MediaPage() {
  return <MediaPageClient />;
}
