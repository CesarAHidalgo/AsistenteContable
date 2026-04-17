"use client";

import { useEffect } from "react";

export function FeedbackScrollIntoView({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) {
      return;
    }
    const el = document.getElementById("feedback-banner");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active]);

  return null;
}
