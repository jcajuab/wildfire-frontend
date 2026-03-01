"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { IconCalendar, IconClock } from "@tabler/icons-react";
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
import { Switch } from "@/components/ui/switch";
import type { ScheduleFormData } from "@/types/schedule";

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

  const canSubmit =
    formData.name.trim().length > 0 &&
    formData.playlistId.length > 0 &&
    formData.targetDisplayId.length > 0;

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
        <div className="flex items-center gap-2">
          <Switch
            id="schedule-active"
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, isActive: checked }))
            }
          />
          <Label htmlFor="schedule-active">Active</Label>
        </div>

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
                value={formData.startDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startDate: e.target.value,
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
                value={formData.endDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endDate: e.target.value,
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
          <Label>Target Display</Label>
          <Select
            value={formData.targetDisplayId}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, targetDisplayId: value }))
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
          {formData.targetDisplayId ? (
            <Badge variant="secondary" className="w-fit">
              {availableDisplays.find((d) => d.id === formData.targetDisplayId)
                ?.name ?? formData.targetDisplayId}
            </Badge>
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

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
        startDate: getTodayDateString(),
        endDate: getTodayDateString(),
        startTime: "08:00",
        endTime: "17:00",
        playlistId: "",
        targetDisplayId: "",
        priority: 1,
        isActive: true,
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
