"use client";

import { useState, useCallback } from "react";
import {
  IconCalendar,
  IconClock,
  IconRepeat,
  IconX,
  IconSquareCheck,
  IconDeviceFloppy,
} from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import type {
  Schedule,
  RecurrenceType,
  ScheduleFormData,
} from "@/types/schedule";

interface EditScheduleDialogProps {
  readonly schedule: Schedule | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (scheduleId: string, data: ScheduleFormData) => void;
  readonly availablePlaylists: readonly { id: string; name: string }[];
  readonly availableDisplays: readonly { id: string; name: string }[];
}

function createFormDataFromSchedule(schedule: Schedule): ScheduleFormData {
  return {
    name: schedule.name,
    startDate: new Date(schedule.startDate),
    endDate: new Date(schedule.endDate),
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    playlistId: schedule.playlist.id,
    targetDisplayIds: schedule.targetDisplays.map((d) => d.id),
    recurrenceEnabled: schedule.recurrence !== "NONE",
    recurrence: schedule.recurrence === "NONE" ? "DAILY" : schedule.recurrence,
  };
}

interface EditScheduleFormProps {
  readonly schedule: Schedule;
  readonly onClose: () => void;
  readonly onSave: (scheduleId: string, data: ScheduleFormData) => void;
  readonly availablePlaylists: readonly { id: string; name: string }[];
  readonly availableDisplays: readonly { id: string; name: string }[];
}

function EditScheduleForm({
  schedule,
  onClose,
  onSave,
  availablePlaylists,
  availableDisplays,
}: EditScheduleFormProps): React.ReactElement {
  const [formData, setFormData] = useState<ScheduleFormData>(() =>
    createFormDataFromSchedule(schedule),
  );

  const handleSave = useCallback(() => {
    if (!formData.name.trim()) return;
    onSave(schedule.id, formData);
    onClose();
  }, [schedule.id, formData, onSave, onClose]);

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

  const canSave = formData.name.trim().length > 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Schedule</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        {/* Schedule Name */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-schedule-name">Schedule Name</Label>
          <Input
            id="edit-schedule-name"
            placeholder="Demo Schedule"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </div>

        {/* Date Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Start Date</Label>
            <div className="relative">
              <IconCalendar className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
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
            <Label>End Date</Label>
            <div className="relative">
              <IconCalendar className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
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

        {/* Time Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Start Time</Label>
            <div className="relative">
              <IconClock className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
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
            <Label>End Time</Label>
            <div className="relative">
              <IconClock className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
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

        {/* Playlist */}
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

        {/* Target Displays */}
        <div className="flex flex-col gap-1.5">
          <Label>Target Displays</Label>
          <Select onValueChange={handleAddDisplay}>
            <SelectTrigger>
              <SelectValue placeholder="Add individual or display groups" />
            </SelectTrigger>
            <SelectContent>
              {availableDisplays
                .filter((d) => !formData.targetDisplayIds.includes(d.id))
                .map((display) => (
                  <SelectItem key={display.id} value={display.id}>
                    {display.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {formData.targetDisplayIds.length > 0 && (
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
                    >
                      <IconX className="size-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Recurrence */}
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
            >
              <IconSquareCheck
                className={`size-4 ${
                  formData.recurrenceEnabled
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              />
              Enable
            </button>
          </div>

          {formData.recurrenceEnabled && (
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
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSave}>
          <IconDeviceFloppy className="size-4" />
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

export function EditScheduleDialog({
  schedule,
  open,
  onOpenChange,
  onSave,
  availablePlaylists,
  availableDisplays,
}: EditScheduleDialogProps): React.ReactElement | null {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <EditScheduleForm
          key={schedule.id}
          schedule={schedule}
          onClose={handleClose}
          onSave={onSave}
          availablePlaylists={availablePlaylists}
          availableDisplays={availableDisplays}
        />
      </DialogContent>
    </Dialog>
  );
}
