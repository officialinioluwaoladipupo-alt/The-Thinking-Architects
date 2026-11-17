import type { Metadata } from "next";
import CommunityPageClient from "../../components/CommunityPageClient";

export const metadata: Metadata = {
  title: "Community | The Thinking Architects",
  description:
    "A place to talk openly. Join The Thinking Architects community, see what the intake form asks, or reach out to speak or volunteer.",
};

export default function CommunityPage() {
  return <CommunityPageClient />;
}
