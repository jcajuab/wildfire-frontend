"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useDeferredDashboardStartup } from "@/hooks/use-deferred-dashboard-startup";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  useActivateGlobalEmergencyMutation,
  useDeactivateGlobalEmergencyMutation,
  useGetRuntimeOverridesQuery,
} from "@/lib/api/displays-api";

export interface UseGlobalEmergencyReturn {
  isActive: boolean;
  isBusy: boolean;
  canRead: boolean;
  canUpdate: boolean;
  activate: (slotIndex: number) => Promise<void>;
  deactivate: () => Promise<void>;
}

export function useGlobalEmergency(): UseGlobalEmergencyReturn {
  const { can, isInitialized } = useAuth();

  const canRead = isInitialized && can("displays:read");
  const canUpdate = isInitialized && can("displays:update");
  const canStartRuntimeOverrides = useDeferredDashboardStartup(canRead);

  const { data: runtimeOverrides } = useGetRuntimeOverridesQuery(undefined, {
    pollingInterval: 120_000,
    skipPollingIfUnfocused: true,
    skip: !canRead || !canStartRuntimeOverrides,
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

  const activate = useCallback(
    async (slotIndex: number) => {
      if (!canUpdate || isBusy) return;
      setIsBusy(true);
      try {
        await activateGlobalEmergency({ slotIndex }).unwrap();
        setOptimisticActive(true);
        toast.success("Global emergency mode activated.");
      } catch (error) {
        notifyApiError(error, "Failed to activate global emergency mode.");
      } finally {
        setIsBusy(false);
        setTimeout(() => setOptimisticActive(null), 3000);
      }
    },
    [activateGlobalEmergency, canUpdate, isBusy],
  );

  const deactivate = useCallback(async () => {
    if (!canUpdate || isBusy) return;
    setIsBusy(true);
    try {
      await deactivateGlobalEmergency({}).unwrap();
      setOptimisticActive(false);
      toast.success("Global emergency mode stopped.");
    } catch (error) {
      notifyApiError(error, "Failed to stop global emergency mode.");
    } finally {
      setIsBusy(false);
      setTimeout(() => setOptimisticActive(null), 3000);
    }
  }, [canUpdate, deactivateGlobalEmergency, isBusy]);

  return { isActive, isBusy, canRead, canUpdate, activate, deactivate };
}
