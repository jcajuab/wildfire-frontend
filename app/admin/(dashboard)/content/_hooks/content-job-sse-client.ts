"use client";

import type { BackendContentJob } from "@/lib/api/content-api";
import { getBaseUrl } from "@/lib/api/base-query";

const CONTENT_JOB_WAIT_TIMEOUT_MS = 5 * 60 * 1000;

const buildContentJobStreamUrl = (jobId: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/content-jobs/${encodeURIComponent(jobId)}/events`;
};

/**
 * Wait for a content job to complete using Server-Sent Events (SSE).
 * Returns a promise that resolves when the job succeeds or rejects when it fails.
 *
 * This is a pure SSE client with no React dependencies.
 */
export const waitForContentJob = async (input: {
  jobId: string;
  fetchJob: (jobId: string) => Promise<BackendContentJob>;
}): Promise<BackendContentJob> => {
  return new Promise<BackendContentJob>((resolve, reject) => {
    const streamUrl = buildContentJobStreamUrl(input.jobId);
    const source = new EventSource(streamUrl, { withCredentials: true });
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      source.close();
    };
    const settleFromTerminalJob = (job: BackendContentJob): boolean => {
      if (job.status !== "SUCCEEDED" && job.status !== "FAILED") {
        return false;
      }
      if (settled) {
        return true;
      }
      settled = true;
      cleanup();
      if (job.status === "FAILED") {
        reject(new Error(job.errorMessage ?? "Content ingestion failed"));
        return true;
      }
      resolve(job);
      return true;
    };
    const rejectError = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const handleJobPayload = (payload: unknown) => {
      if (payload == null || typeof payload !== "object") {
        return;
      }
      const maybeJob = payload as Partial<BackendContentJob>;
      const maybeJobId =
        typeof maybeJob.id === "string"
          ? maybeJob.id
          : typeof (payload as { jobId?: unknown }).jobId === "string"
            ? String((payload as { jobId?: unknown }).jobId)
            : null;
      if (
        typeof maybeJob.status !== "string" ||
        maybeJobId === null ||
        typeof maybeJob.contentId !== "string"
      ) {
        return;
      }
      settleFromTerminalJob({
        id: maybeJobId,
        contentId: maybeJob.contentId,
        operation: maybeJob.operation ?? "UPLOAD",
        status: maybeJob.status as BackendContentJob["status"],
        errorMessage: maybeJob.errorMessage ?? null,
        ownerId: maybeJob.ownerId ?? "",
        createdAt: maybeJob.createdAt ?? "",
        updatedAt: maybeJob.updatedAt ?? "",
        startedAt: maybeJob.startedAt ?? null,
        completedAt: maybeJob.completedAt ?? null,
      });
    };

    timeout = setTimeout(() => {
      rejectError(new Error("Timed out waiting for content ingestion"));
    }, CONTENT_JOB_WAIT_TIMEOUT_MS);

    source.addEventListener("snapshot", (event) => {
      try {
        handleJobPayload(JSON.parse(event.data));
      } catch {
        // Ignore malformed events; terminal fallback is timeout polling.
      }
    });
    source.addEventListener("succeeded", (event) => {
      try {
        handleJobPayload(JSON.parse(event.data));
      } catch {
        void input
          .fetchJob(input.jobId)
          .then((job) => {
            settleFromTerminalJob(job);
          })
          .catch((error) => rejectError(error));
      }
    });
    source.addEventListener("failed", (event) => {
      try {
        handleJobPayload(JSON.parse(event.data));
      } catch {
        void input
          .fetchJob(input.jobId)
          .then((job) => {
            settleFromTerminalJob(job);
          })
          .catch((error) => rejectError(error));
      }
    });
    source.onerror = () => {
      void input
        .fetchJob(input.jobId)
        .then((job) => {
          settleFromTerminalJob(job);
        })
        .catch((error) => rejectError(error));
    };
  });
};
