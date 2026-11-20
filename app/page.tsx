import type { Metadata } from "next";
import LandingPageClient from "../components/LandingPageClient";

export const metadata: Metadata = {
  title: "The Thinking Architects – Think Sessions & Community",
  description:
    "A media and events community for architecture students, graduates, and practitioners. Join monthly Think Sessions, watch recordings, and learn openly.",
  openGraph: {
    title: "The Thinking Architects – Think Sessions & Community",
    description:
      "Figure out architecture with people who have done it. Monthly live Think Sessions, recordings, and candid community conversations.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Thinking Architects – Think Sessions & Community",
    description:
      "Monthly live Think Sessions, career insights, and open conversations for architecture students, graduates, and practitioners.",
  },
};

export default function Home() {
  return <LandingPageClient />;
}
