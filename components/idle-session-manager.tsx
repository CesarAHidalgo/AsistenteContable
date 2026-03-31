"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export function IdleSessionManager() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        void signOut({
          callbackUrl: "/login?message=Sesion%20cerrada%20por%2015%20minutos%20de%20inactividad"
        });
      }, IDLE_TIMEOUT_MS);
    };

    const events: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart"
    ];

    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((eventName) =>
        window.removeEventListener(eventName, resetTimer as EventListener)
      );

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return null;
}
