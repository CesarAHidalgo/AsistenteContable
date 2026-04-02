"use client";

import { useFormStatus } from "react-dom";

export function ConfirmSubmitButton({
  idleLabel,
  pendingLabel,
  confirmMessage,
  className
}: {
  idleLabel: string;
  pendingLabel: string;
  confirmMessage: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-busy={pending}
      onClick={(event) => {
        if (pending) {
          return;
        }

        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
