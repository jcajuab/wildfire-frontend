"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { IconCalendar, IconClock } from "@tabler/icons-react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ScheduleFormData } from "@/types/schedule";

interface ScheduleFormProps {
  readonly initialData: ScheduleFormData;
  readonly availablePlaylists: readonly { id: string; name: string }[];
  readonly availableFlashContents: readonly { id: string; title: string }[];
  readonly availableDisplays: readonly { id: string; name: string }[];
  readonly onSubmit: (data: ScheduleFormData) => Promise<void> | void;
  readonly onCancel: () => void;
  readonly submitLabel: string;
  readonly isCreate?: boolean;
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
}: ScheduleFormProps): ReactElement {
  const [formData, setFormData] = useState<ScheduleFormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (!formData.name.trim() || !formData.targetDisplayId) {
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
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Flash Content</Label>
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
          </div>
        )}

        <div className="space-y-2">
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
  "initialData" | "submitLabel" | "isCreate"
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

export function CreateScheduleForm(
  props: CreateScheduleFormProps,
): ReactElement {
  return (
    <ScheduleFormFrame
      initialData={{
        name: "",
        kind: "PLAYLIST",
        startDate: getTodayDateString(),
        endDate: getTodayDateString(),
        startTime: getCurrentTimeRoundedUp5Min(),
        endTime: "17:00",
        playlistId: null,
        contentId: null,
        targetDisplayId: "",
        isActive: true,
      }}
      submitLabel="Create"
      isCreate={true}
      {...props}
    />
  );
}

export function EditScheduleForm(props: EditScheduleFormProps): ReactElement {
  return <ScheduleFormFrame submitLabel="Save" {...props} />;
}
