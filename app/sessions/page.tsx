import type { Metadata } from "next";
import SessionsPageClient from "../../components/SessionsPageClient";

export const metadata: Metadata = {
  title: "Think Sessions | The Thinking Architects",
  description:
    "Monthly live conversations with practising architects on registration, early practice, running a studio, and building a career that lasts.",
};

export default function SessionsPage() {
  return <SessionsPageClient />;
}
