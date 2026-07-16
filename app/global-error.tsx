"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        event: "ui.global_error",
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          digest: error.digest
        }
      })
    );
  }, [error]);

  return (
    <html lang="es">
      <body>
        <main id="main-content" className="login-shell" tabIndex={-1}>
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
