"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { type BackendContentJob, contentApi } from "@/lib/api/content-api";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import { useAppDispatch } from "@/lib/hooks";
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
 * Handles cache invalidation and user notifications on job completion.
 */
export function useContentJobMonitor(
  input: UseContentJobMonitorInput,
): ContentJobMonitor {
  const dispatch = useAppDispatch();

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
          dispatch(
            contentApi.util.invalidateTags([
              { type: "Content", id: "LIST" },
              { type: "Content", id: job.contentId },
            ]),
          );
          toast.success(job.successMessage);
        })
        .catch((error) => {
          notifyApiError(error, job.failureMessage);
        });
    },
    [dispatch, input.fetchJob],
  );

  return {
    trackContentJob,
  };
}
