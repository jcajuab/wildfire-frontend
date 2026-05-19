"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DirtyFieldActions } from "./dirty-field-actions";
import {
  settingsControlClass,
  settingsRowClass,
  SettingsField,
  SettingsPanel,
} from "./settings-field";
import { Input } from "@/components/ui/input";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  type MaintenanceSettings,
  useUpdateMaintenanceSettingsMutation,
} from "@/lib/api/maintenance-settings-api";
import { formatDateTime } from "@/lib/formatters";

interface MaintenanceSettingsSectionProps {
  readonly settings: MaintenanceSettings | null;
  readonly prefersReducedMotion: boolean | null;
}

type MaintenanceSettingsDraft = Omit<MaintenanceSettings, "updatedAt">;

const toDraft = (
  settings: MaintenanceSettings | null,
): MaintenanceSettingsDraft => ({
  autoDeleteFinishedSchedules: {
    enabled: true,
    retentionDays: settings?.autoDeleteFinishedSchedules.retentionDays ?? 1,
  },
  autoDeleteAuditLogs: {
    enabled: true,
    retentionDays: settings?.autoDeleteAuditLogs.retentionDays ?? 30,
  },
});

const normalizeRetention = (value: number): number =>
  Math.min(3650, Math.max(1, Math.trunc(value)));

function MaintenanceRow({
  label,
  retentionDays,
  onRetentionDaysChange,
  disabled,
}: {
  readonly label: string;
  readonly retentionDays: number;
  readonly onRetentionDaysChange: (days: number) => void;
  readonly disabled: boolean;
}): ReactElement {
  return (
    <SettingsField label={label}>
      <div
        className={`${settingsControlClass} flex min-w-0 items-center gap-3 pt-1`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Input
            type="number"
            min={1}
            max={3650}
            value={String(retentionDays)}
            onChange={(event) =>
              onRetentionDaysChange(Number(event.target.value))
            }
            disabled={disabled}
            aria-label={`${label} retention days`}
            className="h-9 w-24"
          />
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            retention day{retentionDays === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </SettingsField>
  );
}

export function MaintenanceSettingsSection({
  settings,
  prefersReducedMotion,
}: MaintenanceSettingsSectionProps): ReactElement {
  const [draft, setDraft] = useState<MaintenanceSettingsDraft>(() =>
    toDraft(settings),
  );
  const [updateSettings, { isLoading }] =
    useUpdateMaintenanceSettingsMutation();

  useEffect(() => {
    setDraft(toDraft(settings));
  }, [settings]);

  const savedDraft = useMemo(() => toDraft(settings), [settings]);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);

  const handleSave = async (): Promise<void> => {
    const payload: MaintenanceSettingsDraft = {
      autoDeleteFinishedSchedules: {
        enabled: true,
        retentionDays: normalizeRetention(
          draft.autoDeleteFinishedSchedules.retentionDays,
        ),
      },
      autoDeleteAuditLogs: {
        enabled: true,
        retentionDays: normalizeRetention(
          draft.autoDeleteAuditLogs.retentionDays,
        ),
      },
    };

    try {
      await updateSettings(payload).unwrap();
      toast.success("Maintenance settings saved.");
    } catch (error) {
      notifyApiError(error, "Failed to save maintenance settings.");
    }
  };

  return (
    <SettingsPanel
      headingId="maintenance-settings-heading"
      title="Maintenance"
      description="Retention periods for automatic cleanup."
      className={!prefersReducedMotion ? "animate-in fade-in duration-150" : ""}
      bodyClassName="divide-y divide-border/70"
    >
      <dl className="divide-y divide-border/70">
        <MaintenanceRow
          label="Finished schedules"
          retentionDays={draft.autoDeleteFinishedSchedules.retentionDays}
          onRetentionDaysChange={(retentionDays) =>
            setDraft((current) => ({
              ...current,
              autoDeleteFinishedSchedules: {
                ...current.autoDeleteFinishedSchedules,
                enabled: true,
                retentionDays,
              },
            }))
          }
          disabled={isLoading}
        />
        <MaintenanceRow
          label="Audit logs"
          retentionDays={draft.autoDeleteAuditLogs.retentionDays}
          onRetentionDaysChange={(retentionDays) =>
            setDraft((current) => ({
              ...current,
              autoDeleteAuditLogs: {
                ...current.autoDeleteAuditLogs,
                enabled: true,
                retentionDays,
              },
            }))
          }
          disabled={isLoading}
        />
      </dl>
      <div className={settingsRowClass}>
        <div className="hidden sm:block" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {settings?.updatedAt
              ? `Updated ${formatDateTime(settings.updatedAt)}`
              : "Using default maintenance settings."}
          </p>
          {isDirty ? (
            <DirtyFieldActions
              canConfirm
              confirmLabel="Save maintenance settings"
              cancelLabel="Reset maintenance settings"
              isSubmitting={isLoading}
              onConfirm={handleSave}
              onCancel={() => setDraft(savedDraft)}
            />
          ) : null}
        </div>
      </div>
    </SettingsPanel>
  );
}
