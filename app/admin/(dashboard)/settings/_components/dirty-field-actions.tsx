import type { ReactElement } from "react";
import { IconCheck, IconLoader2, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

interface DirtyFieldActionsProps {
  readonly canConfirm: boolean;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly isSubmitting?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function DirtyFieldActions({
  canConfirm,
  confirmLabel,
  cancelLabel,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: DirtyFieldActionsProps): ReactElement {
  if (!canConfirm && !isSubmitting) {
    return <></>;
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        variant="outline"
        className="size-10"
        disabled={isSubmitting}
        onClick={onConfirm}
        aria-label={confirmLabel}
      >
        {isSubmitting ? (
          <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <IconCheck className="size-4" aria-hidden="true" />
        )}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="size-10"
        disabled={isSubmitting}
        onClick={onCancel}
        aria-label={cancelLabel}
      >
        <IconX className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
