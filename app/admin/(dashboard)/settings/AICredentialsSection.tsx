"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  IconKey,
  IconTrash,
  IconCheck,
  IconX,
  IconLoader2,
  IconEdit,
} from "@tabler/icons-react";

import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAICredentials } from "@/hooks/use-ai-credentials";
import { AI_PROVIDERS } from "@/lib/ai/providers";
import { SettingsField } from "./SettingsField";

const controlContainerClass = "w-full max-w-md";
const controlClass = "h-10 w-full";

interface ProviderInfo {
  readonly id: string;
  readonly label: string;
}

interface Credential {
  readonly provider: string;
  readonly keyHint: string;
}

interface ProviderCredentialRowProps {
  readonly provider: ProviderInfo;
  readonly credential: Credential | undefined;
  readonly onSave: (provider: string, apiKey: string) => Promise<boolean>;
  readonly onDelete: (provider: string) => Promise<boolean>;
  readonly isSaving: boolean;
  readonly isDeleting: string | null;
}

function ProviderCredentialRow({
  provider,
  credential,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: ProviderCredentialRowProps): ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isDeletingThis = isDeleting === provider.id;

  const handleSave = async (): Promise<void> => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    const success = await onSave(provider.id, trimmed);
    if (success) {
      setApiKey("");
      setIsEditing(false);
    }
  };

  const handleCancel = (): void => {
    setApiKey("");
    setIsEditing(false);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    await onDelete(provider.id);
  };

  return (
    <SettingsField label={provider.label}>
      <div className={controlContainerClass}>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              type="password"
              autoComplete="off"
              placeholder="Paste API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={controlClass}
              disabled={isSaving}
              autoFocus
            />
            <Button
              type="button"
              variant="default"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => void handleSave()}
              disabled={isSaving || !apiKey.trim()}
              aria-label="Save API key"
            >
              {isSaving ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconCheck className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={handleCancel}
              disabled={isSaving}
              aria-label="Cancel"
            >
              <IconX className="h-4 w-4" />
            </Button>
          </div>
        ) : credential ? (
          <div className="flex items-center gap-2">
            <div
              className={`${controlClass} flex items-center gap-2 rounded-md border border-border bg-muted/60 px-3`}
            >
              <IconKey className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono text-sm text-foreground/80">
                {credential.keyHint}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => setIsEditing(true)}
              disabled={isDeletingThis}
              aria-label={`Update ${provider.label} API key`}
            >
              <IconEdit className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isDeletingThis}
              aria-label={`Delete ${provider.label} API key`}
            >
              {isDeletingThis ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconTrash className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div
              className={`${controlClass} flex items-center rounded-md border border-border bg-muted/60 px-3`}
            >
              <span className="text-sm text-muted-foreground">
                Not configured
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0 gap-1.5"
              onClick={() => setIsEditing(true)}
              aria-label={`Add ${provider.label} API key`}
            >
              <IconKey className="h-4 w-4" />
              Add Key
            </Button>
          </div>
        )}
      </div>

      <ConfirmActionDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={`Remove ${provider.label} API key?`}
        description={`This will permanently remove the stored ${provider.label} API key. The AI assistant will no longer be able to use ${provider.label} models.`}
        confirmLabel="Remove key"
        errorFallback={`Failed to remove ${provider.label} API key.`}
        onConfirm={handleDeleteConfirm}
      />
    </SettingsField>
  );
}

interface AICredentialsSectionProps {
  readonly sectionMotionProps: Record<string, unknown>;
}

export function AICredentialsSection({
  sectionMotionProps,
}: AICredentialsSectionProps): ReactElement {
  const {
    credentials,
    isLoading,
    isSaving,
    isDeleting,
    saveCredential,
    deleteCredential,
  } = useAICredentials();

  return (
    <motion.section
      aria-labelledby="ai-credentials-heading"
      className="border-b border-border pb-8"
      {...sectionMotionProps}
    >
      <header className="mb-4">
        <h2
          id="ai-credentials-heading"
          className="text-base font-semibold tracking-tight"
        >
          AI Provider Credentials
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          API keys for AI assistant providers. These keys are used by the AI
          Chat assistant.
        </p>
      </header>

      <dl className="space-y-4">
        {isLoading
          ? AI_PROVIDERS.map((provider) => (
              <SettingsField key={provider.id} label={provider.label}>
                <div className={controlContainerClass}>
                  <div
                    className={`${controlClass} animate-pulse rounded-md bg-muted`}
                  />
                </div>
              </SettingsField>
            ))
          : AI_PROVIDERS.map((provider) => {
              const credential = credentials.find(
                (c) => c.provider === provider.id,
              );
              return (
                <ProviderCredentialRow
                  key={provider.id}
                  provider={provider}
                  credential={credential}
                  onSave={saveCredential}
                  onDelete={deleteCredential}
                  isSaving={isSaving}
                  isDeleting={isDeleting}
                />
              );
            })}
      </dl>
    </motion.section>
  );
}
