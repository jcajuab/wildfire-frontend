"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface QueryStateOptions<T> {
  readonly key: string;
  readonly defaultValue: T;
  readonly parse: (raw: string | null) => T;
  readonly serialize: (value: T) => string;
  readonly isEqual?: (left: T, right: T) => boolean;
}

export function useQueryState<T>({
  key,
  defaultValue,
  parse,
  serialize,
  isEqual,
}: QueryStateOptions<T>): readonly [T, (nextValue: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawValue = searchParams.get(key);
  const parsedValue = useMemo(() => parse(rawValue), [parse, rawValue]);

  const setQueryValue = useCallback(
    (nextValue: T): void => {
      if (
        isEqual ? isEqual(parsedValue, nextValue) : parsedValue === nextValue
      ) {
        return;
      }

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
      const currentQuery = searchParams.toString();
      if (query === currentQuery) {
        return;
      }
      const nextPath = query.length > 0 ? `${pathname}?${query}` : pathname;
      router.replace(nextPath, { scroll: false });
    },
    [
      defaultValue,
      isEqual,
      key,
      parsedValue,
      pathname,
      router,
      searchParams,
      serialize,
    ],
  );

  return [parsedValue, setQueryValue] as const;
}

export function useQueryStringState(
  key: string,
  defaultValue = "",
): readonly [string, (nextValue: string) => void] {
  const parse = useCallback(
    (raw: string | null) => raw ?? defaultValue,
    [defaultValue],
  );
  const serialize = useCallback((value: string) => value, []);

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

function normalizeQueryList(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const normalizedValues: string[] = [];

  for (const value of values) {
    const trimmedValue = value.trim();
    if (trimmedValue.length === 0 || seen.has(trimmedValue)) {
      continue;
    }
    seen.add(trimmedValue);
    normalizedValues.push(trimmedValue);
  }

  return normalizedValues;
}

function areStringArraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

export function useQueryListState(
  key: string,
  defaultValue: readonly string[] = [],
): readonly [readonly string[], (nextValue: readonly string[]) => void] {
  const normalizedDefaultValue = useMemo(
    () => normalizeQueryList(defaultValue),
    [defaultValue],
  );

  const parse = useCallback(
    (raw: string | null): readonly string[] => {
      if (raw == null || raw.length === 0) {
        return normalizedDefaultValue;
      }
      return normalizeQueryList(raw.split(","));
    },
    [normalizedDefaultValue],
  );

  const serialize = useCallback((value: readonly string[]): string => {
    return normalizeQueryList(value).join(",");
  }, []);

  return useQueryState<readonly string[]>({
    key,
    defaultValue: normalizedDefaultValue,
    parse,
    serialize,
    isEqual: areStringArraysEqual,
  });
}
