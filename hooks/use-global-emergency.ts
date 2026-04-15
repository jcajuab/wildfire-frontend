"use client";

import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
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
    pollingInterval: 30_000,
    skip: !canRead,
  });

  const [activateGlobalEmergency, { isLoading: isActivatingEmergency }] =
    useActivateGlobalEmergencyMutation();
  const [deactivateGlobalEmergency, { isLoading: isDeactivatingEmergency }] =
    useDeactivateGlobalEmergencyMutation();

  const isActive = runtimeOverrides?.globalEmergency.active ?? false;
  const isBusy = isActivatingEmergency || isDeactivatingEmergency;

  const handleToggle = async () => {
    if (!canUpdate || isBusy) {
      return;
    }
    try {
      if (isActive) {
        await deactivateGlobalEmergency({}).unwrap();
        toast.success("Global emergency mode stopped.");
      } else {
        await activateGlobalEmergency({}).unwrap();
        toast.success("Global emergency mode activated.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update global emergency mode.",
      );
    }
  };

  return { isActive, isBusy, canRead, canUpdate, handleToggle };
}
