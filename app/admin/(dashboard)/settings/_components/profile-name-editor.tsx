import type { ReactElement } from "react";
import { IconPencil } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DirtyFieldActions } from "./dirty-field-actions";
import { SettingsField } from "./settings-field";

const controlContainerClass = "w-full max-w-md";
const controlClass = "h-10 w-full";

interface ProfileNameEditorProps {
  readonly name: string;
  readonly savedName: string;
  readonly isEditingName: boolean;
  readonly isSavingProfileName: boolean;
  readonly profileNameError: string | null;
  readonly onNameChange: (value: string) => void;
  readonly onEditNameChange: (editing: boolean) => void;
  readonly onSaveProfileName: (name: string) => Promise<boolean>;
  readonly onCancelEdit: () => void;
}

export function ProfileNameEditor({
  name,
  savedName,
  isEditingName,
  isSavingProfileName,
  profileNameError,
  onNameChange,
  onEditNameChange,
  onSaveProfileName,
  onCancelEdit,
}: ProfileNameEditorProps): ReactElement {
  const isNameDirty = name.trim() !== savedName.trim();

  const saveName = (): void => {
    void (async () => {
      const didSave = await onSaveProfileName(name);
      if (didSave) {
        onEditNameChange(false);
      }
    })();
  };

  return (
    <SettingsField label="Name">
      <div className={controlContainerClass}>
        {isEditingName ? (
          <div className="flex items-start gap-2">
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveName();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  onCancelEdit();
                }
              }}
              aria-label="Name"
              placeholder="Enter your full name"
              className={`${controlClass} flex-1`}
            />
            <DirtyFieldActions
              canConfirm={isNameDirty}
              confirmLabel="Save name"
              cancelLabel="Cancel name changes"
              isSubmitting={isSavingProfileName}
              onConfirm={saveName}
              onCancel={onCancelEdit}
            />
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => onEditNameChange(true)}
            disabled={isSavingProfileName}
            className={`${controlClass} justify-between gap-2 pr-2`}
            aria-label="Edit name"
          >
            <span>{savedName || "Set name"}</span>
            <IconPencil
              className="size-3.5 text-muted-foreground/80"
              aria-hidden="true"
            />
          </Button>
        )}
      </div>
      {isEditingName && profileNameError ? (
        <p role="alert" className="text-xs text-destructive">
          {profileNameError}
        </p>
      ) : null}
    </SettingsField>
  );
}
