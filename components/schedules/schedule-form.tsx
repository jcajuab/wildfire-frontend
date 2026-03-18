"use client";

import type { ReactElement } from "react";
import { useId, useMemo, useRef, useState } from "react";
import { IconCalendar, IconCheck, IconClock, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { ScheduleFormData } from "@/types/schedule";

// ---------------------------------------------------------------------------
// DisplayMultiSelect — pill input with searchable dropdown
// ---------------------------------------------------------------------------

interface DisplayMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  options: readonly { id: string; name: string }[];
}

function DisplayMultiSelect({
  value,
  onChange,
  options,
}: DisplayMultiSelectProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((d) => d.name.toLowerCase().includes(q));
  }, [options, search]);

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
    setSearch("");
    inputRef.current?.focus();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        {/* Pill container */}
        <div
          ref={containerRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          className={cn(
            "flex min-h-7 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-input/20 px-2 py-1 text-xs/relaxed transition-colors cursor-text dark:bg-input/30",
            open ? "border-ring ring-2 ring-ring/30" : "hover:border-ring/50",
          )}
          onClick={() => {
            setOpen(true);
            inputRef.current?.focus();
          }}
        >
          {value.map((id) => {
            const display = options.find((d) => d.id === id);
            return (
              <span
                key={id}
                className="inline-flex h-[1.125rem] items-center gap-0.5 rounded-sm bg-muted-foreground/10 pl-1.5 pr-0.5 text-xs font-medium text-foreground whitespace-nowrap"
              >
                {display?.name ?? id}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(value.filter((v) => v !== id));
                  }}
                  className="flex items-center justify-center rounded-sm p-0.5 opacity-50 hover:opacity-100 focus:outline-none"
                  aria-label={`Remove ${display?.name ?? id}`}
                >
                  <IconX className="size-2.5" />
                </button>
              </span>
            );
          })}
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !search && value.length > 0) {
                onChange(value.slice(0, -1));
              }
              if (e.key === "Escape") {
                setOpen(false);
                setSearch("");
              }
            }}
            placeholder={value.length === 0 ? "Search displays…" : ""}
            className="min-w-24 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </PopoverAnchor>

      {/* Portal dropdown — renders at document.body, never clipped by the dialog */}
      <PopoverContent
        className="w-[var(--radix-popover-anchor-width)] p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Don't close when the interaction is on the pill container itself
          if (containerRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
      >
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          className="no-scrollbar max-h-60 overflow-y-auto p-1"
        >
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-xs/relaxed text-muted-foreground">
              No displays found.
            </p>
          ) : (
            filtered.map((display) => {
              const selected = value.includes(display.id);
              return (
                <button
                  key={display.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(e) => {
                    e.preventDefault(); // keep search input focused
                    toggle(display.id);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs/relaxed select-none cursor-default hover:bg-accent hover:text-accent-foreground"
                >
                  {selected && <IconCheck className="size-3.5 shrink-0" />}
                  {display.name}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
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
                  kind: value as "PLAYLIST" | "FLASH",
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
            <DisplayMultiSelect
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
