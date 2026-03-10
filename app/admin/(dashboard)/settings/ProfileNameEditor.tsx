import type { ReactElement } from "react";
import { IconPencil } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DirtyFieldActions } from "./DirtyFieldActions";
import { SettingsField } from "./SettingsField";

const controlContainerClass = "w-full max-w-md";
const controlClass = "h-10 w-full";

interface ProfileNameEditorProps {
  readonly firstName: string;
  readonly lastName: string;
  readonly savedFirstName: string;
  readonly savedLastName: string;
  readonly editingField: "firstName" | "lastName" | "email" | null;
  readonly isSavingProfileName: boolean;
  readonly profileNameError: string | null;
  readonly onFirstNameChange: (value: string) => void;
  readonly onLastNameChange: (value: string) => void;
  readonly onEditFieldChange: (field: "firstName" | "lastName" | null) => void;
  readonly onSaveProfileName: (
    firstName: string,
    lastName: string,
  ) => Promise<boolean>;
  readonly onCancelEdit: () => void;
}

export function ProfileNameEditor({
  firstName,
  lastName,
  savedFirstName,
  savedLastName,
  editingField,
  isSavingProfileName,
  profileNameError,
  onFirstNameChange,
  onLastNameChange,
  onEditFieldChange,
  onSaveProfileName,
  onCancelEdit,
}: ProfileNameEditorProps): ReactElement {
  const isFirstNameDirty = firstName.trim() !== savedFirstName.trim();
  const isLastNameDirty = lastName.trim() !== savedLastName.trim();

  return (
    <>
      <SettingsField label="First name">
        <div className={controlContainerClass}>
          {editingField === "firstName" ? (
            <div className="flex items-start gap-2">
              <Input
                id="firstName"
                value={firstName}
                onChange={(event) => onFirstNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void (async () => {
                      const didSave = await onSaveProfileName(
                        firstName,
                        lastName,
                      );
                      if (didSave) {
                        onEditFieldChange(null);
                      }
                    })();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    onCancelEdit();
                  }
                }}
                aria-label="First name"
                className={`${controlClass} flex-1`}
              />
              <DirtyFieldActions
                canConfirm={isFirstNameDirty}
                confirmLabel="Save first name"
                cancelLabel="Cancel first name changes"
                isSubmitting={isSavingProfileName}
                onConfirm={() => {
                  void (async () => {
                    const didSave = await onSaveProfileName(
                      firstName,
                      lastName,
                    );
                    if (didSave) {
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
              onClick={() => onEditFieldChange("firstName")}
              disabled={isSavingProfileName}
              className={`${controlClass} justify-between gap-2 pr-2`}
              aria-label="Edit first name"
            >
              <span>{firstName || "Set first name"}</span>
              <IconPencil
                className="size-3.5 text-muted-foreground/80"
                aria-hidden="true"
              />
            </Button>
          )}
        </div>
        {editingField === "firstName" && profileNameError ? (
          <p role="alert" className="text-xs text-destructive">
            {profileNameError}
          </p>
        ) : null}
      </SettingsField>

      <SettingsField label="Last name">
        <div className={controlContainerClass}>
          {editingField === "lastName" ? (
            <div className="flex items-start gap-2">
              <Input
                id="lastName"
                value={lastName}
                onChange={(event) => onLastNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void (async () => {
                      const didSave = await onSaveProfileName(
                        firstName,
                        lastName,
                      );
                      if (didSave) {
                        onEditFieldChange(null);
                      }
                    })();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    onCancelEdit();
                  }
                }}
                aria-label="Last name"
                className={`${controlClass} flex-1`}
              />
              <DirtyFieldActions
                canConfirm={isLastNameDirty}
                confirmLabel="Save last name"
                cancelLabel="Cancel last name changes"
                isSubmitting={isSavingProfileName}
                onConfirm={() => {
                  void (async () => {
                    const didSave = await onSaveProfileName(
                      firstName,
                      lastName,
                    );
                    if (didSave) {
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
              onClick={() => onEditFieldChange("lastName")}
              disabled={isSavingProfileName}
              className={`${controlClass} justify-between gap-2 pr-2`}
              aria-label="Edit last name"
            >
              <span>{lastName || "Set last name"}</span>
              <IconPencil
                className="size-3.5 text-muted-foreground/80"
                aria-hidden="true"
              />
            </Button>
          )}
        </div>
        {editingField === "lastName" && profileNameError ? (
          <p role="alert" className="text-xs text-destructive">
            {profileNameError}
          </p>
        ) : null}
      </SettingsField>
    </>
  );
}
