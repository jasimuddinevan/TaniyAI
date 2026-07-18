"use client";

import { useEffect, useState } from "react";

export default function Preloader() {
  const [state, setState] = useState<"visible" | "hidden" | "gone">("visible");

  useEffect(() => {
    const t1 = setTimeout(() => setState("hidden"), 250);
    const t2 = setTimeout(() => setState("gone"), 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (state === "gone") return null;

  return (
    <div
      id="preloader"
      className={`preloader ${state === "hidden" ? "hidden" : ""}`}
    >
      <img src="/logo.png" alt="TaniyAI" className="preloader-logo" />
      <span className="preloader-text">TaniyAI</span>
    </div>
  );
}
