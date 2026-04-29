"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { type BackendContentJob, contentApi } from "@/lib/api/content-api";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import { useAppDispatch, useAppStore } from "@/lib/hooks";
import { waitForContentJob } from "./content-job-sse-client";

export interface UseContentJobMonitorInput {
  fetchJob: (jobId: string) => Promise<BackendContentJob>;
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
 * Patches cached content rows to READY on success (avoids broad LIST invalidation).
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
          const state = store.getState();
          const listArgs = contentApi.util.selectCachedArgsForQuery(
            state,
            "listContent",
          );
          for (const args of listArgs) {
            dispatch(
              contentApi.util.updateQueryData("listContent", args, (draft) => ({
                ...draft,
                items: draft.items.map((c) =>
                  c.id === job.contentId
                    ? { ...c, status: "READY" as const }
                    : c,
                ),
              })),
            );
          }
          dispatch(
            contentApi.util.updateQueryData(
              "getContent",
              job.contentId,
              (draft) => ({ ...draft, status: "READY" as const }),
            ),
          );
          toast.success(job.successMessage);
        })
        .catch((error) => {
          notifyApiError(error, job.failureMessage);
        });
    },
    [dispatch, input.fetchJob, store],
  );

  return {
    trackContentJob,
  };
}
