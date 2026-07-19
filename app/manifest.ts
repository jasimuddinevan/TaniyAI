import type { MetadataRoute } from "next";

const SITE_URL = process.env.APP_URL || "https://taniyai.vercel.app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaniyAI — Free AI Assistant",
    short_name: "TaniyAI",
    description:
      "A free AI assistant powered by TaniyAI. Chat instantly, no sign-up required.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#14161c",
    icons: [
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
