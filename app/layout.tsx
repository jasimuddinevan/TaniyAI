import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Preloader from "@/components/Preloader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Free AI Assistant — powered by TaniyAI",
  description:
    "A free AI assistant powered by TaniyAI. Chat instantly, no sign-up required.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
      </head>
      <body className="font-sans antialiased">
        <Preloader />
        {children}
      </body>
    </html>
  );
}
