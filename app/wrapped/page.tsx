import type { Metadata } from "next";
import WrappedPageClient from "../../components/WrappedPageClient";

export const metadata: Metadata = {
  title: "TTA Year Wrapped 2026 | The Thinking Architects",
  description:
    "Our first year at The Thinking Architects, in conversations. Around 300 people registered, 76 joined the community, and we're just getting started.",
};

export default function WrappedPage() {
  return <WrappedPageClient />;
}
