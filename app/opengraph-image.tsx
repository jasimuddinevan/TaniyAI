import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TaniyAI — Free AI Assistant";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #14161c 0%, #1f2937 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: -2,
          }}
        >
          <span style={{ color: "#34d399" }}>Taniy</span>
          <span>AI</span>
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 40,
            color: "#cbd5e1",
            fontWeight: 500,
          }}
        >
          Free AI Assistant — no sign-up required
        </div>
      </div>
    ),
    { ...size }
  );
}
