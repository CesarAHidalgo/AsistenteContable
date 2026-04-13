import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { CredentialsLoginForm, GoogleLoginButton } from "@/components/auth-client-controls";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <main id="main-content" className="login-shell" tabIndex={-1}>
      <AuthCard
        kicker="Bienvenido"
        title="Inicia sesión"
        description="Entra con tu correo y contraseña. Si configuraste Google, también puedes usarlo desde el botón de abajo."
      >
        <CredentialsLoginForm />

        {googleEnabled ? (
          <>
            <div className="separator">o</div>
            <GoogleLoginButton />
          </>
        ) : (
          <p className="auth-helper">
            Google Sign-In aparecerá aquí cuando definas `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env`.
          </p>
        )}

        {params.error ? <p className="error-banner">{params.error}</p> : null}
        {params.message ? <p className="success-banner">{params.message}</p> : null}

        <p className="auth-helper">
          Si aún no tienes cuenta, puedes{" "}
          <Link href="/registro" className="auth-inline-link">
            registrarte aquí
          </Link>
          .
        </p>
      </AuthCard>
    </main>
  );
}
