import type { ReactElement } from "react";
import { useRef } from "react";
import { IconPencil } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DirtyFieldActions } from "./DirtyFieldActions";

const controlContainerClass = "w-full max-w-md";
const controlClass = "h-10 w-full";

interface EmailEditorProps {
  readonly emailDraft: string;
  readonly displayedEmail: string;
  readonly pendingEmail: string | null;
  readonly editingField: "firstName" | "lastName" | "email" | null;
  readonly isRequestingEmailChange: boolean;
  readonly emailError: string | null;
  readonly onEmailDraftChange: (value: string) => void;
  readonly onEditFieldChange: (field: "email" | null) => void;
  readonly onRequestEmailVerification: () => Promise<boolean>;
  readonly onCancelEdit: () => void;
}

export function EmailEditor({
  emailDraft,
  displayedEmail,
  pendingEmail,
  editingField,
  isRequestingEmailChange,
  emailError,
  onEmailDraftChange,
  onEditFieldChange,
  onRequestEmailVerification,
  onCancelEdit,
}: EmailEditorProps): ReactElement {
  const emailInputRef = useRef<HTMLInputElement>(null);

  const isEmailDirty =
    emailDraft.trim().toLowerCase() !== displayedEmail.trim().toLowerCase();

  return (
    <>
      <div className={controlContainerClass}>
        {editingField === "email" ? (
          <div className="flex items-start gap-2">
            <Input
              ref={emailInputRef}
              id="email"
              type="email"
              value={emailDraft}
              onChange={(event) => onEmailDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void (async () => {
                    const didRequest = await onRequestEmailVerification();
                    if (didRequest) {
                      onEditFieldChange(null);
                    }
                  })();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  onCancelEdit();
                }
              }}
              aria-label="Email"
              className={`${controlClass} flex-1`}
            />
            <DirtyFieldActions
              canConfirm={isEmailDirty}
              confirmLabel="Request email verification"
              cancelLabel="Cancel email changes"
              isSubmitting={isRequestingEmailChange}
              onConfirm={() => {
                void (async () => {
                  const didRequest = await onRequestEmailVerification();
                  if (didRequest) {
                    onEditFieldChange(null);
                  }
                })();
              }}
              onCancel={onCancelEdit}
            />
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className={`${controlClass} justify-between gap-2 pr-2`}
            onClick={() => {
              onEditFieldChange("email");
            }}
            aria-label="Edit email"
          >
            <span>{displayedEmail || "Set email address"}</span>
            <IconPencil
              className="size-3.5 text-muted-foreground/80"
              aria-hidden="true"
            />
          </Button>
        )}
      </div>
      {pendingEmail ? (
        <p className="text-xs text-primary" aria-live="polite">
          Pending verification: {pendingEmail}
        </p>
      ) : null}
      {emailError ? (
        <p role="alert" className="text-xs text-destructive">
          {emailError}
        </p>
      ) : null}
    </>
  );
}
