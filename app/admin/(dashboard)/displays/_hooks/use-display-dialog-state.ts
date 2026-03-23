"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useLazyGetDisplayQuery } from "@/lib/api/displays-api";
import {
  mapDisplayApiToDisplay,
  withDisplayGroups,
} from "@/lib/mappers/display-mapper";
import type { Display } from "@/types/display";

export function useDisplayDialogState() {
  const [isAddInfoDialogOpen, setIsAddInfoDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  const [isUnregisterDialogOpen, setIsUnregisterDialogOpen] = useState(false);
  const [selectedDisplay, setSelectedDisplay] = useState<Display | null>(null);
  const [displayToUnregister, setDisplayToUnregister] =
    useState<Display | null>(null);
  const [getDisplayById] = useLazyGetDisplayQuery();

  const refreshSelectedDisplay = useCallback(
    async (display: Display): Promise<void> => {
      try {
        const freshDisplay = await getDisplayById(display.id, true).unwrap();
        setSelectedDisplay(
          withDisplayGroups(mapDisplayApiToDisplay(freshDisplay), [
            ...display.groups,
          ]),
        );
      } catch {
        // Keep current row data when hydration fails.
      }
    },
    [getDisplayById],
  );

  const handleViewDetails = useCallback(
    (display: Display) => {
      setSelectedDisplay(display);
      setIsViewDialogOpen(true);
      void refreshSelectedDisplay(display);
    },
    [refreshSelectedDisplay],
  );

  const handleViewPage = useCallback((display: Display) => {
    const slug = display.slug.trim();
    if (!slug) {
      toast.error(
        "Display page is unavailable because display slug is missing.",
      );
      return;
    }
    window.open(
      `/displays/${encodeURIComponent(slug)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, []);

  const handleUnregisterDisplay = useCallback((display: Display) => {
    setDisplayToUnregister(display);
    setIsUnregisterDialogOpen(true);
  }, []);

  const handleUnregisterDialogOpenChange = useCallback((open: boolean) => {
    setIsUnregisterDialogOpen(open);
    if (!open) {
      setDisplayToUnregister(null);
    }
  }, []);

  const handleEditDisplay = useCallback(
    (display: Display) => {
      setSelectedDisplay(display);
      setIsEditDialogOpen(true);
      void refreshSelectedDisplay(display);
    },
    [refreshSelectedDisplay],
  );

  const handleEditFromView = useCallback(
    (display: Display) => {
      setSelectedDisplay(display);
      setIsViewDialogOpen(false);
      setIsEditDialogOpen(true);
      void refreshSelectedDisplay(display);
    },
    [refreshSelectedDisplay],
  );

  const handleEditDialogOpenChange = useCallback((open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setSelectedDisplay(null);
    }
  }, []);

  return {
    isAddInfoDialogOpen,
    setIsAddInfoDialogOpen,
    isViewDialogOpen,
    setIsViewDialogOpen,
    isEditDialogOpen,
    isGroupManagerOpen,
    setIsGroupManagerOpen,
    isUnregisterDialogOpen,
    selectedDisplay,
    displayToUnregister,
    handleViewDetails,
    handleViewPage,
    handleUnregisterDisplay,
    handleUnregisterDialogOpenChange,
    handleEditDisplay,
    handleEditFromView,
    handleEditDialogOpenChange,
  };
}
