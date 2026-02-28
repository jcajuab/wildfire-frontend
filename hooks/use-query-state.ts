"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface QueryStateOptions<T> {
  readonly key: string;
  readonly defaultValue: T;
  readonly parse: (raw: string | null) => T;
  readonly serialize: (value: T) => string;
}

export function useQueryState<T>({
  key,
  defaultValue,
  parse,
  serialize,
}: QueryStateOptions<T>): readonly [T, (nextValue: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const readValue = useCallback((): T => {
    return parse(searchParams.get(key));
  }, [key, parse, searchParams]);

  const [value, setValue] = useState<T>(readValue);

  useEffect(() => {
    setValue(readValue());
  }, [readValue]);

  const setQueryValue = useCallback(
    (nextValue: T): void => {
      setValue(nextValue);

      const params = new URLSearchParams(searchParams.toString());
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
    [defaultValue, key, pathname, router, serialize, searchParams],
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
