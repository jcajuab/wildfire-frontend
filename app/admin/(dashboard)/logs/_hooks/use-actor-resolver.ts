"use client";

import { useCallback, useMemo } from "react";

interface ActorUser {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl?: string | null;
}

interface ActorDisplay {
  readonly id: string;
  readonly name: string;
}

interface UseActorResolverProps {
  readonly users: readonly ActorUser[];
  readonly displays: readonly ActorDisplay[];
}

export function useActorResolver({ users, displays }: UseActorResolverProps) {
  const userMap = useMemo(
    () => new Map(users.map((u) => [u.id, u.name])),
    [users],
  );

  const avatarUrlByUserId = useMemo(
    () => new Map(users.map((u) => [u.id, u.avatarUrl ?? null])),
    [users],
  );

  const displayMap = useMemo(
    () => new Map(displays.map((d) => [d.id, d.name])),
    [displays],
  );

  const getActorName = useCallback(
    (actorId: string, actorType: string | null): string => {
      if (actorType === "user") {
        return userMap.get(actorId) ?? "Unknown user";
      }
      if (actorType === "display") {
        return displayMap.get(actorId) ?? "Display";
      }
      return actorType ?? "Unknown";
    },
    [userMap, displayMap],
  );

  const getActorAvatarUrl = useCallback(
    (actorId: string, actorType: string | null): string | null => {
      if (actorType === "user") {
        return avatarUrlByUserId.get(actorId) ?? null;
      }
      return null;
    },
    [avatarUrlByUserId],
  );

  return {
    getActorName,
    getActorAvatarUrl,
  };
}
