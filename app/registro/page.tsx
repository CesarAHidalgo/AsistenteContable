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
    <main id="main-content" className="login-shell" tabIndex={-1}>
      <AuthCard
        kicker="Empezar"
        title="Crea tu cuenta"
        description="Solo necesitas correo y una contraseña. En segundos tendrás tu panel listo para registrar movimientos y deudas."
      >
        <RegisterForm />
        {params.error ? <p className="error-banner">{params.error}</p> : null}
        <p className="auth-helper">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="auth-inline-link">
            Inicia sesión
          </Link>
        </p>
      </AuthCard>
    </main>
  );
}
