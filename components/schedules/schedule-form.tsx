"use client";

import type { ReactElement } from "react";
import { useCallback, useState } from "react";
import {
  IconCalendar,
  IconClock,
  IconRepeat,
  IconSquareCheck,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RecurrenceType, ScheduleFormData } from "@/types/schedule";

interface ScheduleFormProps {
  readonly initialData: ScheduleFormData;
  readonly availablePlaylists: readonly { id: string; name: string }[];
  readonly availableDisplays: readonly { id: string; name: string }[];
  readonly onSubmit: (data: ScheduleFormData) => Promise<void> | void;
  readonly onCancel: () => void;
  readonly submitLabel: string;
}

function ScheduleFormFrame({
  initialData,
  availablePlaylists,
  availableDisplays,
  onSubmit,
  onCancel,
  submitLabel,
}: ScheduleFormProps): ReactElement {
  const [formData, setFormData] = useState<ScheduleFormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddDisplay = useCallback(
    (displayId: string) => {
      if (!formData.targetDisplayIds.includes(displayId)) {
        setFormData((prev) => ({
          ...prev,
          targetDisplayIds: [...prev.targetDisplayIds, displayId],
        }));
      }
    },
    [formData.targetDisplayIds],
  );

  const handleRemoveDisplay = useCallback((displayId: string) => {
    setFormData((prev) => ({
      ...prev,
      targetDisplayIds: prev.targetDisplayIds.filter((id) => id !== displayId),
    }));
  }, []);

  const canSubmit =
    formData.name.trim().length > 0 &&
    formData.playlistId.length > 0 &&
    formData.targetDisplayIds.length > 0;

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
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-name">Name</Label>
            <Input
              id="schedule-name"
              placeholder="Demo Schedule"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-priority">Priority</Label>
            <Input
              id="schedule-priority"
              type="number"
              min={1}
              max={100}
              value={formData.priority}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  priority: Math.max(
                    1,
                    Math.min(100, Number.parseInt(e.target.value) || 1),
                  ),
                }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-start-date">Start Date</Label>
            <div className="relative">
              <IconCalendar className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="schedule-start-date"
                type="date"
                value={formData.startDate.toISOString().split("T")[0]}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startDate: new Date(e.target.value),
                  }))
                }
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-end-date">End Date</Label>
            <div className="relative">
              <IconCalendar className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="schedule-end-date"
                type="date"
                value={formData.endDate.toISOString().split("T")[0]}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endDate: new Date(e.target.value),
                  }))
                }
                className="pl-8"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-start-time">Start Time</Label>
            <div className="relative">
              <IconClock className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="schedule-start-time"
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startTime: e.target.value,
                  }))
                }
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-end-time">End Time</Label>
            <div className="relative">
              <IconClock className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="schedule-end-time"
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, endTime: e.target.value }))
                }
                className="pl-8"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Playlist</Label>
          <Select
            value={formData.playlistId}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, playlistId: value }))
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
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Target Displays</Label>
          <Select onValueChange={handleAddDisplay}>
            <SelectTrigger>
              <SelectValue placeholder="Add individual or display groups" />
            </SelectTrigger>
            <SelectContent>
              {availableDisplays
                .filter(
                  (display) => !formData.targetDisplayIds.includes(display.id),
                )
                .map((display) => (
                  <SelectItem key={display.id} value={display.id}>
                    {display.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {formData.targetDisplayIds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {formData.targetDisplayIds.map((displayId) => {
                const display = availableDisplays.find(
                  (d) => d.id === displayId,
                );
                return (
                  <Badge
                    key={displayId}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {display?.name ?? displayId}
                    <button
                      type="button"
                      onClick={() => handleRemoveDisplay(displayId)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      aria-label={`Remove ${display?.name ?? "display"}`}
                    >
                      <IconX className="size-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconRepeat className="size-4" />
              <span className="text-sm font-medium">Recurrence</span>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  recurrenceEnabled: !prev.recurrenceEnabled,
                }))
              }
              className="flex items-center gap-1.5 text-sm"
              aria-label="Toggle recurrence"
            >
              <IconSquareCheck
                className={`size-4 ${formData.recurrenceEnabled ? "text-primary" : "text-muted-foreground"}`}
              />
              Enable
            </button>
          </div>

          {formData.recurrenceEnabled ? (
            <div className="flex flex-col gap-1.5">
              <Label>Repeat</Label>
              <Select
                value={formData.recurrence}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    recurrence: value as RecurrenceType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
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
  "initialData" | "submitLabel"
>;

interface EditScheduleFormProps extends Omit<ScheduleFormProps, "submitLabel"> {
  readonly initialData: ScheduleFormData;
}

export function CreateScheduleForm({
  availablePlaylists,
  availableDisplays,
  onSubmit,
  onCancel,
}: CreateScheduleFormProps): ReactElement {
  return (
    <ScheduleFormFrame
      initialData={{
        name: "",
        startDate: new Date(),
        endDate: new Date(),
        startTime: "08:00",
        endTime: "17:00",
        playlistId: "",
        targetDisplayIds: [],
        recurrenceEnabled: false,
        recurrence: "DAILY",
        priority: 1,
      }}
      availablePlaylists={availablePlaylists}
      availableDisplays={availableDisplays}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel="Create"
    />
  );
}

export function EditScheduleForm({
  initialData,
  availablePlaylists,
  availableDisplays,
  onSubmit,
  onCancel,
}: EditScheduleFormProps): ReactElement {
  return (
    <ScheduleFormFrame
      initialData={initialData}
      availablePlaylists={availablePlaylists}
      availableDisplays={availableDisplays}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel="Save"
    />
  );
}
