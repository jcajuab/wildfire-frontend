"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseInfiniteScrollSentinelOptions {
  readonly hasMore: boolean;
  readonly isFetching: boolean;
  readonly onIntersect: () => void;
  readonly rootMargin?: string;
}

/**
 * Returns a `ref` callback to attach to a sentinel element. When the sentinel
 * scrolls into view AND `hasMore && !isFetching`, `onIntersect` fires.
 *
 * Uses an IntersectionObserver under the hood. The observer is created in a
 * mount-only effect (rule §4 of the local useEffect guardrails: external/DOM
 * sync). The latest `hasMore` / `isFetching` / `onIntersect` values are read
 * via a ref so the observer never has to be torn down on prop changes.
 */
export function useInfiniteScrollSentinel({
  hasMore,
  isFetching,
  onIntersect,
  rootMargin = "200px",
}: UseInfiniteScrollSentinelOptions): (node: HTMLElement | null) => void {
  const stateRef = useRef({ hasMore, isFetching, onIntersect });
  stateRef.current = { hasMore, isFetching, onIntersect };

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLElement | null>(null);

  // Mount-only: create the observer once, dispose on unmount. The callback
  // reads from stateRef so we never need to recreate the observer when the
  // hook's inputs change.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const { hasMore: hm, isFetching: f, onIntersect: cb } =
            stateRef.current;
          if (hm && !f) cb();
        }
      },
      { rootMargin },
    );
    observerRef.current = observer;
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
    // rootMargin is treated as static — pass a stable value at the call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useCallback((node: HTMLElement | null) => {
    const observer = observerRef.current;
    const previous = sentinelRef.current;
    if (previous && observer) observer.unobserve(previous);
    sentinelRef.current = node;
    if (node && observer) observer.observe(node);
  }, []);
}
