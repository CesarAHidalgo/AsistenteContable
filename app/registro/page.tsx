import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/forms";
import { getCurrentUser } from "@/lib/auth";

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main className="login-shell">
      <AuthCard
        title="Crea tu cuenta"
        description="Registra un usuario con correo y contraseña para acceder a tu panel contable desde la web."
      >
        <RegisterForm />
        {params.error ? <p className="error-banner">{params.error}</p> : null}
        <p className="auth-helper">
          Si ya tienes cuenta, <Link href="/login">inicia sesión aquí</Link>.
        </p>
      </AuthCard>
    </main>
  );
}
