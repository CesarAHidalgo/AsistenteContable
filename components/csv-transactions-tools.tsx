import { importTransactionsFromCsvAction } from "@/app/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { TRANSACTION_CSV_HEADER } from "@/lib/csv-transactions";

export function CsvTransactionsTools() {
  return (
    <div className="csv-tools-grid">
      <div className="snapshot-card">
        <span className="detail-label">Exportar</span>
        <p className="meta">Descarga todos tus movimientos en CSV (hasta 20.000 filas) para Excel o respaldo.</p>
        <div className="hero-actions">
          <a className="inline-link" href="/api/user/transactions/export" download>
            Descargar movimientos.csv
          </a>
        </div>
      </div>
      <div className="snapshot-card">
        <span className="detail-label">Importar</span>
        <p className="meta">
          Usa un archivo exportado desde aquí (misma cabecera). Máximo 500 filas por carga. Para compras con
          tarjeta, el nombre en <code>creditCardDebtName</code> debe coincidir con la tarjeta registrada.
        </p>
        <p className="meta code-hint">
          <code>{TRANSACTION_CSV_HEADER}</code>
        </p>
        <form action={importTransactionsFromCsvAction} encType="multipart/form-data" className="csv-import-form">
          <input type="hidden" name="redirectTab" value="transactions" />
          <input type="file" name="csvFile" accept=".csv,text/csv" required />
          <PendingSubmitButton idleLabel="Importar CSV" pendingLabel="Importando…" />
        </form>
      </div>
    </div>
  );
}
