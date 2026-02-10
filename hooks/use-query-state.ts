"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface QueryStateOptions<T> {
  readonly key: string;
  readonly defaultValue: T;
  readonly parse: (raw: string | null) => T;
  readonly serialize: (value: T) => string;
}

function getSearchParamsFromLocation(): URLSearchParams {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

export function useQueryState<T>({
  key,
  defaultValue,
  parse,
  serialize,
}: QueryStateOptions<T>): readonly [T, (nextValue: T) => void] {
  const router = useRouter();
  const pathname = usePathname();

  const readValue = useCallback((): T => {
    const params = getSearchParamsFromLocation();
    return parse(params.get(key));
  }, [key, parse]);

  const [value, setValue] = useState<T>(readValue);

  useEffect(() => {
    setValue(readValue());
  }, [readValue]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePopstate = (): void => {
      setValue(readValue());
    };

    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, [readValue]);

  const setQueryValue = useCallback(
    (nextValue: T): void => {
      setValue(nextValue);

      if (typeof window === "undefined") {
        return;
      }

      const params = getSearchParamsFromLocation();
      const serializedValue = serialize(nextValue);
      const defaultSerializedValue = serialize(defaultValue);

      if (
        serializedValue.length === 0 ||
        serializedValue === defaultSerializedValue
      ) {
        params.delete(key);
      } else {
        params.set(key, serializedValue);
      }

      const query = params.toString();
      const nextPath = query.length > 0 ? `${pathname}?${query}` : pathname;
      router.replace(nextPath, { scroll: false });
    },
    [defaultValue, key, pathname, router, serialize],
  );

  return [value, setQueryValue] as const;
}

export function useQueryStringState(
  key: string,
  defaultValue = "",
): readonly [string, (nextValue: string) => void] {
  const parse = useCallback(
    (raw: string | null) => raw ?? defaultValue,
    [defaultValue],
  );
  const serialize = useCallback((value: string) => value.trim(), []);

  return useQueryState<string>({
    key,
    defaultValue,
    parse,
    serialize,
  });
}

export function useQueryNumberState(
  key: string,
  defaultValue = 1,
): readonly [number, (nextValue: number) => void] {
  const parse = useCallback(
    (raw: string | null) => {
      const parsed = raw == null ? Number.NaN : Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        return defaultValue;
      }
      return parsed;
    },
    [defaultValue],
  );
  const serialize = useCallback(
    (value: number) => String(Math.max(1, value)),
    [],
  );

  return useQueryState<number>({
    key,
    defaultValue,
    parse,
    serialize,
  });
}

export function useQueryEnumState<T extends string>(
  key: string,
  defaultValue: T,
  allowedValues: readonly T[],
): readonly [T, (nextValue: T) => void] {
  const allowedSet = useMemo(() => new Set(allowedValues), [allowedValues]);
  const parse = useCallback(
    (raw: string | null) => {
      if (raw != null && allowedSet.has(raw as T)) {
        return raw as T;
      }
      return defaultValue;
    },
    [allowedSet, defaultValue],
  );
  const serialize = useCallback((value: T) => value, []);

  return useQueryState<T>({
    key,
    defaultValue,
    parse,
    serialize,
  });
}
