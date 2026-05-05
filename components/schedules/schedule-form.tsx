"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ScheduleFormData, ScheduleKind } from "@/types/schedule";

interface DisplayPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  options: readonly { id: string; name: string }[];
  disabled?: boolean;
}

export type ScheduleDisplayGroupOption = {
  readonly id: string;
  readonly name: string;
  readonly displayIds: readonly string[];
};

interface DisplayGroupPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  options: readonly ScheduleDisplayGroupOption[];
  disabled?: boolean;
}

function DisplayGroupPicker({
  value,
  onChange,
  options,
  disabled = false,
}: DisplayGroupPickerProps): ReactElement {
  const [inputValue, setInputValue] = useState("");
  const anchorRef = useComboboxAnchor();

  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );

  const trimmed = inputValue.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmed) return options;
    return options.filter((option) =>
      option.name.toLowerCase().includes(trimmed),
    );
  }, [options, trimmed]);

  return (
    <Combobox
      multiple
      value={value}
      items={options.map((option) => option.id)}
      filteredItems={filtered.map((option) => option.id)}
      onValueChange={(next) => {
        onChange(Array.isArray(next) ? (next as string[]) : []);
        setInputValue("");
      }}
      inputValue={inputValue}
      onInputValueChange={(v) => setInputValue(v ?? "")}
      disabled={disabled}
    >
      <ComboboxChips ref={anchorRef}>
        {value.map((id) => (
          <ComboboxChip key={id} showRemove={!disabled}>
            {optionsById.get(id)?.name ?? id}
          </ComboboxChip>
        ))}
        <ComboboxChipsInput
          placeholder={value.length === 0 ? "Search display groups…" : ""}
          disabled={disabled}
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxList>
          {filtered.map((option) => (
            <ComboboxItem key={option.id} value={option.id}>
              <span className="flex flex-col gap-0.5">
                <span>{option.name}</span>
                <span className="text-xs text-muted-foreground">
                  {option.displayIds.length}{" "}
                  {option.displayIds.length === 1 ? "display" : "displays"}
                </span>
              </span>
            </ComboboxItem>
          ))}
        </ComboboxList>
        <ComboboxEmpty>No display groups found.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}

function DisplayPicker({
  value,
  onChange,
  options,
  disabled = false,
}: DisplayPickerProps): ReactElement {
  const [inputValue, setInputValue] = useState("");
  const anchorRef = useComboboxAnchor();

  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );

  const trimmed = inputValue.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmed) return options;
    return options.filter((option) =>
      option.name.toLowerCase().includes(trimmed),
    );
  }, [options, trimmed]);

  return (
    <Combobox
      multiple
      value={value}
      items={options.map((option) => option.id)}
      filteredItems={filtered.map((option) => option.id)}
      onValueChange={(next) => {
        onChange(Array.isArray(next) ? (next as string[]) : []);
        setInputValue("");
      }}
      inputValue={inputValue}
      onInputValueChange={(v) => setInputValue(v ?? "")}
      disabled={disabled}
    >
      <ComboboxChips ref={anchorRef}>
        {value.map((id) => (
          <ComboboxChip key={id} showRemove={!disabled}>
            {optionsById.get(id)?.name ?? id}
          </ComboboxChip>
        ))}
        <ComboboxChipsInput
          placeholder={value.length === 0 ? "Search displays…" : ""}
          disabled={disabled}
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxList>
          {filtered.map((option) => (
            <ComboboxItem key={option.id} value={option.id}>
              {option.name}
            </ComboboxItem>
          ))}
        </ComboboxList>
        <ComboboxEmpty>No displays found.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}

// ---------------------------------------------------------------------------
// EmptyResourceCta
// ---------------------------------------------------------------------------

function EmptyResourceCta({
  message,
  href,
  onNavigate,
  disabled = false,
}: {
  message: string;
  href: string;
  onNavigate: () => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <p className="text-xs text-muted-foreground">
      {message}{" "}
      <Link
        href={href}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onNavigate();
        }}
        aria-disabled={disabled || undefined}
        className={
          disabled
            ? "pointer-events-none text-muted-foreground no-underline"
            : "text-blue-500 underline underline-offset-2 hover:text-blue-600"
        }
      >
        Create one here.
      </Link>
    </p>
  );
}

// ---------------------------------------------------------------------------
// ScheduleFormFrame
// ---------------------------------------------------------------------------

interface ScheduleFormProps {
  readonly initialData: ScheduleFormData;
  readonly availablePlaylists: readonly { id: string; name: string }[];
  readonly availableFlashContents: readonly { id: string; title: string }[];
  readonly availableDisplays: readonly { id: string; name: string }[];
  readonly availableDisplayGroups?: readonly ScheduleDisplayGroupOption[];
  readonly onSubmit: (data: ScheduleFormData) => Promise<void> | void;
  readonly onCancel: () => void;
  readonly submitLabel: string;
  readonly isCreate?: boolean;
  readonly lockedKind?: "PLAYLIST" | "FLASH";
  /** Notifies parent dialogs when a save/create request is in flight (for close guards). */
  readonly onSubmittingChange?: (submitting: boolean) => void;
}

function resolveDisplayIdsFromGroups(
  groupIds: readonly string[],
  groups: readonly ScheduleDisplayGroupOption[],
): string[] {
  const byId = new Map(groups.map((g) => [g.id, g]));
  const out = new Set<string>();
  for (const gid of groupIds) {
    const g = byId.get(gid);
    if (!g) continue;
    for (const id of g.displayIds) {
      out.add(id);
    }
  }
  return [...out];
}

function ScheduleFormFrame({
  initialData,
  availablePlaylists,
  availableFlashContents,
  availableDisplays,
  availableDisplayGroups = [],
  onSubmit,
  onCancel,
  submitLabel,
  isCreate = false,
  lockedKind,
  onSubmittingChange,
}: ScheduleFormProps): ReactElement {
  const [formData, setFormData] = useState<ScheduleFormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetMode, setTargetMode] = useState<"displays" | "display-groups">(
    "displays",
  );
  const [targetDisplayGroupIds, setTargetDisplayGroupIds] = useState<string[]>(
    [],
  );

  const resolvedTargetDisplayIds = useMemo(() => {
    if (!isCreate || targetMode === "displays") {
      return formData.targetDisplayIds;
    }
    return resolveDisplayIdsFromGroups(
      targetDisplayGroupIds,
      availableDisplayGroups,
    );
  }, [
    isCreate,
    targetMode,
    formData.targetDisplayIds,
    targetDisplayGroupIds,
    availableDisplayGroups,
  ]);

  const isEndTimeBeforeStartTime = useMemo(() => {
    if (!formData.startTime || !formData.endTime) return false;
    return formData.endTime <= formData.startTime;
  }, [formData.startTime, formData.endTime]);

  const canSubmit = useMemo(() => {
    const hasTargets =
      isCreate && targetMode === "display-groups"
        ? targetDisplayGroupIds.length > 0 &&
          resolvedTargetDisplayIds.length > 0
        : formData.targetDisplayIds.length > 0;
    if (!formData.name.trim() || !hasTargets) {
      return false;
    }
    if (isEndTimeBeforeStartTime) {
      return false;
    }
    if (formData.kind === "PLAYLIST") {
      return Boolean(formData.playlistId);
    }
    return Boolean(formData.contentId);
  }, [
    formData,
    isEndTimeBeforeStartTime,
    isCreate,
    targetMode,
    targetDisplayGroupIds.length,
    resolvedTargetDisplayIds.length,
  ]);

  async function handleSubmit(): Promise<void> {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    onSubmittingChange?.(true);
    try {
      const payload: ScheduleFormData =
        isCreate && targetMode === "display-groups"
          ? { ...formData, targetDisplayIds: resolvedTargetDisplayIds }
          : formData;
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
      onSubmittingChange?.(false);
    }
  }

  return (
    <>
      <div className="space-y-4">
        {!lockedKind && (
          <div className="space-y-2">
            <Label>Schedule Type</Label>
            <Tabs
              value={formData.kind}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  kind: value as ScheduleKind,
                  playlistId: value === "PLAYLIST" ? prev.playlistId : null,
                  contentId: value === "FLASH" ? prev.contentId : null,
                }))
              }
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="PLAYLIST" disabled={isSubmitting}>
                  Playlist
                </TabsTrigger>
                <TabsTrigger value="FLASH" disabled={isSubmitting}>
                  Flash Overlay
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="schedule-name">Name</Label>
          <Input
            id="schedule-name"
            placeholder="Lobby daytime"
            value={formData.name}
            disabled={isSubmitting}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, name: event.target.value }))
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="schedule-start-date">Start Date</Label>
            <Input
              id="schedule-start-date"
              type="date"
              value={formData.startDate}
              disabled={isSubmitting}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  startDate: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-end-date">End Date</Label>
            <Input
              id="schedule-end-date"
              type="date"
              value={formData.endDate}
              disabled={isSubmitting}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  endDate: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="schedule-start-time">Start Time</Label>
            <Input
              id="schedule-start-time"
              type="time"
              value={formData.startTime}
              disabled={isSubmitting}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  startTime: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-end-time">End Time</Label>
            <Input
              id="schedule-end-time"
              type="time"
              value={formData.endTime}
              disabled={isSubmitting}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  endTime: event.target.value,
                }))
              }
              aria-invalid={isEndTimeBeforeStartTime}
            />
          </div>
        </div>
        {isEndTimeBeforeStartTime ? (
          <p className="text-xs text-destructive">
            End time must be later than start time.
          </p>
        ) : null}

        {formData.kind === "PLAYLIST" ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Playlist</Label>
              {isCreate && availablePlaylists.length === 0 ? (
                <EmptyResourceCta
                  message="No playlists yet."
                  href="/admin/playlists/create"
                  onNavigate={onCancel}
                  disabled={isSubmitting}
                />
              ) : (
                <Select
                  value={formData.playlistId ?? ""}
                  disabled={isSubmitting}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      playlistId: value,
                      contentId: null,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a playlist" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlaylists.map((playlist) => (
                      <SelectItem key={playlist.id} value={playlist.id}>
                        {playlist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Flash Content</Label>
            {isCreate && availableFlashContents.length === 0 ? (
              <EmptyResourceCta
                message="No flash content yet."
                href="/admin/content?create=flash"
                onNavigate={onCancel}
                disabled={isSubmitting}
              />
            ) : (
              <Select
                value={formData.contentId ?? ""}
                disabled={isSubmitting}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    contentId: value,
                    playlistId: null,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select flash content" />
                </SelectTrigger>
                <SelectContent>
                  {availableFlashContents.map((content) => (
                    <SelectItem key={content.id} value={content.id}>
                      {content.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Target</Label>
          {isCreate ? (
            <>
              <Tabs
                value={targetMode}
                onValueChange={(value) => {
                  const mode = value as "displays" | "display-groups";
                  setTargetMode(mode);
                  setTargetDisplayGroupIds([]);
                  setFormData((prev) => ({ ...prev, targetDisplayIds: [] }));
                }}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="displays" disabled={isSubmitting}>
                    Displays
                  </TabsTrigger>
                  <TabsTrigger value="display-groups" disabled={isSubmitting}>
                    Display groups
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {targetMode === "displays" ? (
                <DisplayPicker
                  value={formData.targetDisplayIds}
                  onChange={(ids) =>
                    setFormData((prev) => ({ ...prev, targetDisplayIds: ids }))
                  }
                  options={availableDisplays}
                  disabled={isSubmitting}
                />
              ) : availableDisplayGroups.length === 0 ? (
                <EmptyResourceCta
                  message="No display groups yet."
                  href="/admin/displays"
                  onNavigate={onCancel}
                  disabled={isSubmitting}
                />
              ) : (
                <DisplayGroupPicker
                  value={targetDisplayGroupIds}
                  onChange={setTargetDisplayGroupIds}
                  options={availableDisplayGroups}
                  disabled={isSubmitting}
                />
              )}
              {targetMode === "display-groups" &&
              targetDisplayGroupIds.length > 0 &&
              resolvedTargetDisplayIds.length === 0 ? (
                <p className="text-xs text-destructive">
                  Selected groups have no displays. Add displays to those groups
                  first.
                </p>
              ) : null}
            </>
          ) : (
            <Select
              value={formData.targetDisplayIds[0] ?? ""}
              disabled={isSubmitting}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, targetDisplayIds: [value] }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a display" />
              </SelectTrigger>
              <SelectContent>
                {availableDisplays.map((display) => (
                  <SelectItem key={display.id} value={display.id}>
                    {display.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={() => void handleSubmit()}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </>
  );
}

type CreateScheduleFormProps = Omit<
  ScheduleFormProps,
  "initialData" | "submitLabel" | "isCreate" | "lockedKind"
> & {
  readonly kind?: "PLAYLIST" | "FLASH";
};

interface EditScheduleFormProps extends Omit<ScheduleFormProps, "submitLabel"> {
  readonly initialData: ScheduleFormData;
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Defaults end time to 3 hours after the current local time. Clamps at 23:59
// because the schedule model rejects endTime <= startTime, so wrapping past
// midnight would produce an invalid form on open.
function getDefaultEndTimeString(): string {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes() + 3 * 60;
  const clamped = Math.min(totalMinutes, 23 * 60 + 59);
  const hours = String(Math.floor(clamped / 60)).padStart(2, "0");
  const minutes = String(clamped % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function CreateScheduleForm({
  kind,
  ...props
}: CreateScheduleFormProps): ReactElement {
  return (
    <ScheduleFormFrame
      initialData={{
        name: "",
        kind: kind ?? "PLAYLIST",
        startDate: getTodayDateString(),
        endDate: getTodayDateString(),
        startTime: getCurrentTimeString(),
        endTime: getDefaultEndTimeString(),
        playlistId: null,
        contentId: null,
        targetDisplayIds: [],
      }}
      submitLabel="Create"
      isCreate={true}
      lockedKind={kind}
      {...props}
    />
  );
}

export function EditScheduleForm(props: EditScheduleFormProps): ReactElement {
  return (
    <ScheduleFormFrame
      submitLabel="Save"
      lockedKind={props.initialData.kind}
      {...props}
    />
  );
}
