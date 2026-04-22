"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { IconCalendar, IconClock } from "@tabler/icons-react";
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
}

function DisplayPicker({
  value,
  onChange,
  options,
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
      onValueChange={(next) => {
        onChange(Array.isArray(next) ? (next as string[]) : []);
        setInputValue("");
      }}
      inputValue={inputValue}
      onInputValueChange={(v) => setInputValue(v ?? "")}
    >
      <ComboboxChips ref={anchorRef}>
        {value.map((id) => (
          <ComboboxChip key={id}>{optionsById.get(id)?.name ?? id}</ComboboxChip>
        ))}
        <ComboboxChipsInput
          placeholder={value.length === 0 ? "Search displays…" : ""}
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
}: {
  message: string;
  href: string;
  onNavigate: () => void;
}): ReactElement {
  return (
    <p className="text-xs text-muted-foreground">
      {message}{" "}
      <Link
        href={href}
        onClick={onNavigate}
        className="text-blue-500 underline underline-offset-2 hover:text-blue-600"
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
  readonly onSubmit: (data: ScheduleFormData) => Promise<void> | void;
  readonly onCancel: () => void;
  readonly submitLabel: string;
  readonly isCreate?: boolean;
  readonly lockedKind?: "PLAYLIST" | "FLASH";
}

function ScheduleFormFrame({
  initialData,
  availablePlaylists,
  availableFlashContents,
  availableDisplays,
  onSubmit,
  onCancel,
  submitLabel,
  isCreate = false,
  lockedKind,
}: ScheduleFormProps): ReactElement {
  const [formData, setFormData] = useState<ScheduleFormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (!formData.name.trim() || formData.targetDisplayIds.length === 0) {
      return false;
    }
    if (isCreate && formData.startDate && formData.startTime) {
      const startDateTime = new Date(
        `${formData.startDate}T${formData.startTime}`,
      );
      if (startDateTime < new Date()) {
        return false;
      }
    }
    if (formData.kind === "PLAYLIST") {
      return Boolean(formData.playlistId);
    }
    return Boolean(formData.contentId);
  }, [formData, isCreate]);

  async function handleSubmit(): Promise<void> {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
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
                <TabsTrigger value="PLAYLIST">Playlist</TabsTrigger>
                <TabsTrigger value="FLASH">Flash Overlay</TabsTrigger>
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
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, name: event.target.value }))
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="schedule-start-date">Start Date</Label>
            <div className="relative">
              <IconCalendar className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="schedule-start-date"
                type="date"
                value={formData.startDate}
                min={isCreate ? getTodayDateString() : undefined}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    startDate: event.target.value,
                  }))
                }
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-end-date">End Date</Label>
            <div className="relative">
              <IconCalendar className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="schedule-end-date"
                type="date"
                value={formData.endDate}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    endDate: event.target.value,
                  }))
                }
                className="pl-8"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="schedule-start-time">Start Time</Label>
            <div className="relative">
              <IconClock className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="schedule-start-time"
                type="time"
                value={formData.startTime}
                min={
                  isCreate && formData.startDate === getTodayDateString()
                    ? getCurrentTimeString()
                    : undefined
                }
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    startTime: event.target.value,
                  }))
                }
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-end-time">End Time</Label>
            <div className="relative">
              <IconClock className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="schedule-end-time"
                type="time"
                value={formData.endTime}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    endTime: event.target.value,
                  }))
                }
                className="pl-8"
              />
            </div>
          </div>
        </div>

        {formData.kind === "PLAYLIST" ? (
          <div className="space-y-2">
            <Label>Playlist</Label>
            {isCreate && availablePlaylists.length === 0 ? (
              <EmptyResourceCta
                message="No playlists yet."
                href="/admin/playlists/create"
                onNavigate={onCancel}
              />
            ) : (
              <Select
                value={formData.playlistId ?? ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    playlistId: value,
                    contentId: null,
                  }))
                }
              >
                <SelectTrigger>
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
        ) : (
          <div className="space-y-2">
            <Label>Flash Content</Label>
            {isCreate && availableFlashContents.length === 0 ? (
              <EmptyResourceCta
                message="No flash content yet."
                href="/admin/content?create=flash"
                onNavigate={onCancel}
              />
            ) : (
              <Select
                value={formData.contentId ?? ""}
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
          <Label>Target Display</Label>
          {isCreate ? (
            <DisplayPicker
              value={formData.targetDisplayIds}
              onChange={(ids) =>
                setFormData((prev) => ({ ...prev, targetDisplayIds: ids }))
              }
              options={availableDisplays}
            />
          ) : (
            <Select
              value={formData.targetDisplayIds[0] ?? ""}
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

function getCurrentTimeRoundedUp5Min(): string {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const roundedMinutes = Math.ceil(totalMinutes / 5) * 5;
  const hours = Math.floor(roundedMinutes / 60) % 24;
  const minutes = roundedMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
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
        startTime: getCurrentTimeRoundedUp5Min(),
        endTime: "17:00",
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
