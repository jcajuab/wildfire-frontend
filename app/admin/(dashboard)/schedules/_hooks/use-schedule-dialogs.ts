"use client";

import { useState, useCallback } from "react";
import type { Schedule } from "@/types/schedule";

export interface UseScheduleDialogsResult {
  createDialogKind: "PLAYLIST" | "FLASH" | null;
  setCreateDialogKind: (kind: "PLAYLIST" | "FLASH" | null) => void;
  viewDialogOpen: boolean;
  setViewDialogOpen: (open: boolean) => void;
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  selectedSchedule: Schedule | null;
  handleScheduleClick: (schedule: Schedule) => void;
  handleEditFromView: (schedule: Schedule) => void;
}

export function useScheduleDialogs(): UseScheduleDialogsResult {
  const [createDialogKind, setCreateDialogKind] = useState<
    "PLAYLIST" | "FLASH" | null
  >(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null,
  );

  const handleScheduleClick = useCallback((schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setViewDialogOpen(true);
  }, []);

  const handleEditFromView = useCallback((schedule: Schedule) => {
    setViewDialogOpen(false);
    setSelectedSchedule(schedule);
    setEditDialogOpen(true);
  }, []);

  return {
    createDialogKind,
    setCreateDialogKind,
    viewDialogOpen,
    setViewDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    selectedSchedule,
    handleScheduleClick,
    handleEditFromView,
  };
}
