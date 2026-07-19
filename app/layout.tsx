import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Preloader from "@/components/Preloader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const SITE_URL = process.env.APP_URL || "https://taniyai.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "TaniyAI",
  title: {
    default: "Free AI Assistant — powered by TaniyAI",
    template: "%s · TaniyAI",
  },
  description:
    "A free AI assistant powered by TaniyAI. Chat instantly with AI — no sign-up required, works right in your browser.",
  keywords: [
    "free AI assistant",
    "AI chat",
    "TaniyAI",
    "chatbot",
    "AI helper",
    "free chatbot",
    "talk to AI",
    "AI without login",
  ],
  authors: [{ name: "TaniyAI" }],
  creator: "TaniyAI",
  publisher: "TaniyAI",
  category: "technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "TaniyAI",
    title: "Free AI Assistant — powered by TaniyAI",
    description:
      "Chat instantly with a free AI assistant. No sign-up required — powered by TaniyAI.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free AI Assistant — powered by TaniyAI",
    description:
      "Chat instantly with a free AI assistant. No sign-up required — powered by TaniyAI.",
    creator: "@taniyai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TaniyAI",
    url: SITE_URL,
    description:
      "A free AI assistant powered by TaniyAI. Chat instantly, no sign-up required.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        <Preloader />
        {children}
      </body>
    </html>
  );
}
