import { completeOnboardingAction } from "@/app/actions";
import Link from "next/link";
import { PendingSubmitButton } from "@/components/pending-submit-button";

export function OnboardingWelcomeCard() {
  return (
    <article className="panel onboarding-welcome">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Primeros pasos</p>
          <h2>Bienvenido a tu panel</h2>
          <p className="panel-subtitle">
            En pocos minutos puedes tener el ciclo y los movimientos al día. Esto es opcional: cierra cuando
            quieras.
          </p>
        </div>
      </div>
      <ol className="onboarding-steps">
        <li>
          Revisa el <strong>ciclo de facturación</strong> en Resumen para que los totales coincidan con tu
          calendario real.
        </li>
        <li>
          Registra <strong>ingresos y gastos</strong> en Movimientos (puedes agruparlos por categoría).
        </li>
        <li>
          Si usas tarjetas o créditos, añádelos en <strong>Deudas</strong> para ver saldos y cuotas.
        </li>
      </ol>
      <div className="hero-actions">
        <Link href="/?tab=transactions" className="inline-link">
          Ir a movimientos
        </Link>
        <Link href="/?tab=debts" className="inline-link">
          Ir a deudas
        </Link>
        <form action={completeOnboardingAction}>
          <input type="hidden" name="redirectTab" value="overview" />
          <PendingSubmitButton idleLabel="Entendido, ocultar bienvenida" pendingLabel="Guardando…" />
        </form>
      </div>
    </article>
  );
}
