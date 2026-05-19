"use client";

import type { ReactElement, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { TermsAndConditionsDialog } from "@/components/legal/terms-and-conditions-dialog";
import { useAuth } from "@/context/auth-context";
import {
  readTermsAcceptance,
  TERMS_ACCEPTANCE_CHANGE_EVENT,
  writeTermsAcceptance,
} from "@/lib/terms-and-conditions";

interface TermsAndConditionsContextValue {
  readonly openTermsAndConditions: () => void;
}

const TermsAndConditionsContext =
  createContext<TermsAndConditionsContextValue | null>(null);

function subscribeToTermsAcceptance(callback: () => void): () => void {
  window.addEventListener(TERMS_ACCEPTANCE_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(TERMS_ACCEPTANCE_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function TermsAndConditionsProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const { user, isAuthenticated, isInitialized } = useAuth();
  const [manualOpen, setManualOpen] = useState(false);
  const [acceptedFallbackUserId, setAcceptedFallbackUserId] = useState<
    string | null
  >(null);
  const userId = user?.id ?? null;
  const getAcceptanceSnapshot = useCallback(
    () => (userId ? readTermsAcceptance(userId)?.version ?? null : null),
    [userId],
  );
  const acceptedVersion = useSyncExternalStore(
    subscribeToTermsAcceptance,
    getAcceptanceSnapshot,
    () => null,
  );
  const isAcceptedForSession =
    acceptedVersion != null ||
    (userId != null && acceptedFallbackUserId === userId);
  const isRequired =
    isInitialized && isAuthenticated && user != null && !isAcceptedForSession;
  const open = (user != null && manualOpen) || isRequired;

  const openTermsAndConditions = useCallback(() => {
    setManualOpen(true);
  }, []);

  const handleAccept = useCallback(() => {
    if (!user) {
      setManualOpen(false);
      return;
    }

    writeTermsAcceptance(user.id);
    setAcceptedFallbackUserId(user.id);
    setManualOpen(false);
  }, [user]);

  const value = useMemo(
    () => ({ openTermsAndConditions }),
    [openTermsAndConditions],
  );

  return (
    <TermsAndConditionsContext.Provider value={value}>
      {children}
      <TermsAndConditionsDialog
        open={open}
        required={isRequired}
        onOpenChange={setManualOpen}
        onAccept={handleAccept}
      />
    </TermsAndConditionsContext.Provider>
  );
}

export function useTermsAndConditions(): TermsAndConditionsContextValue {
  const context = useContext(TermsAndConditionsContext);
  if (context) {
    return context;
  }
  return {
    openTermsAndConditions: () => undefined,
  };
}
