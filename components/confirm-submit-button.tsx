"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

type SummaryField = {
  name: string;
  label: string;
};

export function ConfirmSubmitButton({
  idleLabel,
  pendingLabel,
  confirmMessage,
  confirmTitle,
  confirmDescription,
  summaryFields,
  className
}: {
  idleLabel: string;
  pendingLabel: string;
  confirmMessage?: string;
  confirmTitle?: string;
  confirmDescription?: string;
  summaryFields?: SummaryField[];
  className?: string;
}) {
  const { pending } = useFormStatus();
  const [isOpen, setIsOpen] = useState(false);
  const [summaryLines, setSummaryLines] = useState<string[]>([]);
  const [formElement, setFormElement] = useState<HTMLFormElement | null>(null);

  useEffect(() => {
    if (pending) {
      setIsOpen(false);
    }
  }, [pending]);

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={pending}
        aria-busy={pending}
        onClick={(event) => {
          if (pending) {
            return;
          }

          const form = event.currentTarget.form;
          const formData = form ? new FormData(form) : null;
          const summary =
            formData && summaryFields?.length
              ? summaryFields
                  .map(({ name, label }) => {
                    const value = formData.get(name);

                    if (value === null || String(value).trim() === "") {
                      return null;
                    }

                    const field = form?.elements.namedItem(name);
                    if (field instanceof HTMLSelectElement && field.selectedOptions.length > 0) {
                      return `${label}: ${field.selectedOptions[0]?.text ?? String(value)}`;
                    }

                    return `${label}: ${String(value).trim()}`;
                  })
                  .filter(Boolean) as string[]
              : [];

          setSummaryLines(summary);
          setFormElement(form);
          setIsOpen(true);
        }}
      >
        {pending ? (
          <span className="button-inline-status">
            <span className="button-spinner" aria-hidden="true" />
            {pendingLabel}
          </span>
        ) : (
          idleLabel
        )}
      </button>

      {isOpen ? (
        <div className="confirm-modal-overlay" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-label={confirmTitle ?? idleLabel}>
            <p className="eyebrow">Confirmación</p>
            <h3>{confirmTitle ?? `Vas a ejecutar: ${idleLabel}.`}</h3>
            <p className="meta">
              {confirmMessage ?? confirmDescription ?? "Revisa esta acción antes de continuar."}
            </p>

            {summaryLines.length > 0 ? (
              <div className="confirm-summary">
                {summaryLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}

            <div className="confirm-modal-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setIsOpen(false);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={className}
                onClick={() => {
                  setIsOpen(false);
                  formElement?.requestSubmit();
                }}
              >
                Sí, continuar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
