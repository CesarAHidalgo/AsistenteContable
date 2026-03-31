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
    <main className="login-shell">
      <AuthCard
        title="Inicia sesion"
        description="Accede a tus finanzas con correo y contrasena o usa Google cuando lo tengas configurado."
      >
        <CredentialsLoginForm />

        {googleEnabled ? (
          <>
            <div className="separator">o</div>
            <GoogleLoginButton />
          </>
        ) : (
          <p className="auth-helper">
            Google Sign-In aparecera aqui cuando definas `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env`.
          </p>
        )}

        {params.error ? <p className="error-banner">{params.error}</p> : null}
        {params.message ? <p className="success-banner">{params.message}</p> : null}

        <p className="auth-helper">
          Si aun no tienes cuenta, puedes <Link href="/registro">registrarte aqui</Link>.
        </p>
      </AuthCard>
    </main>
  );
}
