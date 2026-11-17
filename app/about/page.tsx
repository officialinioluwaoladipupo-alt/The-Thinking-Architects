import type { Metadata } from "next";
import AboutPageClient from "../../components/AboutPageClient";

export const metadata: Metadata = {
  title: "About | The Thinking Architects",
  description:
    "Built for the questions school doesn't answer. Learn why The Thinking Architects exists and how we run monthly Think Sessions.",
};

export default function AboutPage() {
  return <AboutPageClient />;
}
