"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  type BackendContent,
  type BackendContentJob,
} from "@/lib/api/content-api";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  mergeEnrichedContentIntoCaches,
  patchContentStatusInCaches,
} from "@/lib/api/merge-enriched-content-into-caches";
import { useAppDispatch, useAppStore } from "@/lib/hooks";
import { waitForContentJob } from "./content-job-sse-client";

export interface UseContentJobMonitorInput {
  fetchJob: (jobId: string) => Promise<BackendContentJob>;
  fetchContent: (contentId: string) => Promise<BackendContent>;
}

export interface ContentJobMonitor {
  trackContentJob: (job: {
    jobId: string;
    contentId: string;
    successMessage: string;
    failureMessage: string;
  }) => void;
}

/**
 * React hook for monitoring content jobs using SSE.
 * On success, refetches full content (thumbnailUrl, dimensions) and merges into cache.
 */
export function useContentJobMonitor(
  input: UseContentJobMonitorInput,
): ContentJobMonitor {
  const dispatch = useAppDispatch();
  const store = useAppStore();

  const trackContentJob = useCallback(
    (job: {
      jobId: string;
      contentId: string;
      successMessage: string;
      failureMessage: string;
    }) => {
      void waitForContentJob({
        jobId: job.jobId,
        fetchJob: input.fetchJob,
      })
        .then(() => {
          void input
            .fetchContent(job.contentId)
            .then((full) => {
              mergeEnrichedContentIntoCaches(dispatch, store.getState, full);
            })
            .catch(() => {
              patchContentStatusInCaches(
                dispatch,
                store.getState,
                job.contentId,
                "READY",
              );
            })
            .finally(() => {
              toast.success(job.successMessage);
            });
        })
        .catch((error) => {
          notifyApiError(error, job.failureMessage);
        });
    },
    [dispatch, input, store],
  );

  return {
    trackContentJob,
  };
}
