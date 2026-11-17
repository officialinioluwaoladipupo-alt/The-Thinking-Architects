import type { Metadata } from "next";
import ContactPageClient from "../../components/ContactPageClient";

export const metadata: Metadata = {
  title: "Contact | The Thinking Architects",
  description:
    "Get in touch with The Thinking Architects for general questions, speaking pitches, partnerships, or media inquiries.",
};

export default function ContactPage() {
  return <ContactPageClient />;
}
