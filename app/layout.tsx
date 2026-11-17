import type { Metadata } from "next";
import { IBM_Plex_Mono, MuseoModerno, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { FirebaseProvider } from "../components/FirebaseProvider";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const museoModerno = MuseoModerno({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-museo",
  display: "swap",
});

const siteUrl = process.env.APP_URL || "https://thethinkingarchitects.com.ng";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "The Thinking Architects – Architecture Community & Events",
  description:
    "A media and events community for architecture students, graduates, and practitioners. Join monthly live sessions and watch recordings.",
  openGraph: {
    title: "The Thinking Architects – Architecture Community & Events",
    description:
      "A media and events community for architecture students, graduates, and practitioners. Join monthly live sessions and watch recordings.",
    url: siteUrl,
    siteName: "The Thinking Architects",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Thinking Architects – Architecture Community & Events",
    description:
      "Figure out the profession with people who've done it. Monthly live sessions, recordings, and open community conversations.",
  },
  icons: { icon: "/favicon.svg" },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "The Thinking Architects",
  url: siteUrl,
  email: "hello@thethinkingarchitects.com.ng",
  description:
    "A media and events community for architecture students, graduates, and practitioners.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${ibmPlexMono.variable} ${museoModerno.variable}`}
    >
      <body className="bg-background text-foreground antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <FirebaseProvider>{children}</FirebaseProvider>
        <Script src="https://tally.so/widgets/embed.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
