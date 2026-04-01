"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <main className="login-shell">
          <section className="auth-card">
            <p className="eyebrow">Error</p>
            <h1>Ocurrio un problema inesperado.</h1>
            <p className="auth-helper">
              Ya dejamos trazabilidad del error para revisarlo. Intenta de nuevo o vuelve a cargar la pagina.
            </p>
            <button type="button" onClick={() => reset()}>
              Reintentar
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
