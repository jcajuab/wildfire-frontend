"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  useActivateGlobalEmergencyMutation,
  useDeactivateGlobalEmergencyMutation,
  useGetRuntimeOverridesQuery,
} from "@/lib/api/displays-api";

interface UseGlobalEmergencyReturn {
  isActive: boolean;
  isBusy: boolean;
  canRead: boolean;
  canUpdate: boolean;
  handleToggle: () => Promise<void>;
}

export function useGlobalEmergency(): UseGlobalEmergencyReturn {
  const { can, isInitialized } = useAuth();

  const canRead = isInitialized && can("displays:read");
  const canUpdate = isInitialized && can("displays:update");

  const { data: runtimeOverrides } = useGetRuntimeOverridesQuery(undefined, {
    pollingInterval: 120_000,
    skipPollingIfUnfocused: true,
    skip: !canRead,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });

  const [activateGlobalEmergency] = useActivateGlobalEmergencyMutation();
  const [deactivateGlobalEmergency] = useDeactivateGlobalEmergencyMutation();

  const serverActive = runtimeOverrides?.globalEmergency.active ?? false;
  const [optimisticActive, setOptimisticActive] = useState<boolean | null>(
    null,
  );
  const [isBusy, setIsBusy] = useState(false);

  const isActive = optimisticActive ?? serverActive;

  const handleToggle = useCallback(async () => {
    if (!canUpdate || isBusy) return;
    setIsBusy(true);
    try {
      if (isActive) {
        await deactivateGlobalEmergency({}).unwrap();
        setOptimisticActive(false);
        toast.success("Global emergency mode stopped.");
      } else {
        await activateGlobalEmergency({}).unwrap();
        setOptimisticActive(true);
        toast.success("Global emergency mode activated.");
      }
    } catch (error) {
      notifyApiError(error, "Failed to update global emergency mode.");
    } finally {
      setIsBusy(false);
      // Clear optimistic state after a short delay to let the cache refetch
      setTimeout(() => setOptimisticActive(null), 3000);
    }
  }, [
    canUpdate,
    isBusy,
    isActive,
    activateGlobalEmergency,
    deactivateGlobalEmergency,
  ]);

  return { isActive, isBusy, canRead, canUpdate, handleToggle };
}
