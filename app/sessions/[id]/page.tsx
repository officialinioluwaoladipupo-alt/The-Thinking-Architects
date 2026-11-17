import type { Metadata } from "next";
import SessionDetailClient from "../../../components/SessionDetailClient";

export const metadata: Metadata = {
  title: "Think Session | The Thinking Architects",
  description:
    "Details, speaker information, registration, and recording for a live Think Session.",
};

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SessionDetailClient sessionId={decodeURIComponent(id)} />;
}
