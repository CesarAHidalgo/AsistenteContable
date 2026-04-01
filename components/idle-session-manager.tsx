"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export function IdleSessionManager() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (sessionExpired) {
      return;
    }

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setSessionExpired(true);
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
  }, [sessionExpired]);

  if (!sessionExpired) {
    return null;
  }

  return (
    <div className="session-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="session-expired-title">
      <div className="session-modal">
        <p className="section-kicker">Sesion expirada</p>
        <h2 id="session-expired-title">Tu sesion se cerro por 15 minutos de inactividad</h2>
        <p className="meta">
          Para evitar que sigas trabajando y luego falle un guardado, confirma y te llevamos al login.
        </p>
        <div className="session-modal-actions">
          <button
            type="button"
            onClick={() => {
              void signOut({
                callbackUrl: "/login?message=Sesion%20cerrada%20por%2015%20minutos%20de%20inactividad"
              });
            }}
          >
            Entendido, ir al login
          </button>
        </div>
      </div>
    </div>
  );
}
