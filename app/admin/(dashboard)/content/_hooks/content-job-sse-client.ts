"use client";

import type { BackendContentJob } from "@/lib/api/content-api";
import { getBaseUrl } from "@/lib/api/base-query";
import {
  ensureFreshAccessToken,
  getAuthorizationHeaders,
} from "@/lib/auth-session";

const CONTENT_JOB_WAIT_TIMEOUT_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 3_000;

const buildContentJobStreamUrl = (jobId: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/content-jobs/${encodeURIComponent(jobId)}/events`;
};

function parseSseChunk(
  buffer: string,
  onParsed: (eventType: string, data: string) => void,
): string {
  const lines = buffer.split("\n");
  const remainder = lines.pop() ?? "";

  let currentEvent = "";
  let currentData = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      currentEvent = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      currentData += (currentData ? "\n" : "") + line.slice(5).trim();
    } else if (line === "") {
      if (currentData) {
        onParsed(currentEvent || "message", currentData);
      }
      currentEvent = "";
      currentData = "";
    }
  }

  return remainder;
}

const settleFromTerminalJob = (
  job: BackendContentJob,
  settled: { current: boolean },
  cleanup: () => void,
  resolve: (job: BackendContentJob) => void,
  reject: (error: Error) => void,
): boolean => {
  if (job.status !== "SUCCEEDED" && job.status !== "FAILED") {
    return false;
  }
  if (settled.current) {
    return true;
  }
  settled.current = true;
  cleanup();
  if (job.status === "FAILED") {
    reject(new Error(job.errorMessage ?? "Content ingestion failed"));
    return true;
  }
  resolve(job);
  return true;
};

const handleJobPayload = (
  payload: unknown,
  settled: { current: boolean },
  cleanup: () => void,
  resolve: (job: BackendContentJob) => void,
  reject: (error: Error) => void,
): void => {
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
  settleFromTerminalJob(
    {
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
    },
    settled,
    cleanup,
    resolve,
    reject,
  );
};

/**
 * Poll the REST endpoint until the job reaches a terminal state.
 * Used as a fallback when the SSE stream is unavailable.
 */
function pollUntilTerminal(
  input: {
    jobId: string;
    fetchJob: (jobId: string) => Promise<BackendContentJob>;
  },
  settled: { current: boolean },
  cleanup: () => void,
  resolve: (job: BackendContentJob) => void,
  reject: (error: Error) => void,
): void {
  if (settled.current) return;

  const poll = () => {
    if (settled.current) return;
    void input
      .fetchJob(input.jobId)
      .then((job) => {
        if (settled.current) return;
        if (!settleFromTerminalJob(job, settled, cleanup, resolve, reject)) {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      })
      .catch(() => {
        if (settled.current) return;
        setTimeout(poll, POLL_INTERVAL_MS);
      });
  };

  poll();
}

/**
 * Wait for a content job to complete using fetch-based SSE with Authorization
 * headers, falling back to REST polling if the stream fails.
 *
 * This is a pure SSE client with no React dependencies.
 */
export const waitForContentJob = async (input: {
  jobId: string;
  fetchJob: (jobId: string) => Promise<BackendContentJob>;
}): Promise<BackendContentJob> => {
  return new Promise<BackendContentJob>((resolve, reject) => {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const settled = { current: false };

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      controller.abort();
    };
    const rejectError = (error: unknown) => {
      if (settled.current) return;
      settled.current = true;
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    timeout = setTimeout(() => {
      rejectError(new Error("Timed out waiting for content ingestion"));
    }, CONTENT_JOB_WAIT_TIMEOUT_MS);

    void (async () => {
      try {
        await ensureFreshAccessToken();
        const url = buildContentJobStreamUrl(input.jobId);
        const response = await fetch(url, {
          headers: { ...getAuthorizationHeaders() },
          credentials: "same-origin",
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          pollUntilTerminal(input, settled, cleanup, resolve, reject);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!controller.signal.aborted && !settled.current) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          buffer = parseSseChunk(buffer, (eventType, data) => {
            if (settled.current) return;
            if (
              eventType === "snapshot" ||
              eventType === "succeeded" ||
              eventType === "failed" ||
              eventType === "queued" ||
              eventType === "processing"
            ) {
              try {
                handleJobPayload(
                  JSON.parse(data),
                  settled,
                  cleanup,
                  resolve,
                  reject,
                );
              } catch {
                // Ignore malformed events
              }
            }
          });
        }

        if (!settled.current) {
          pollUntilTerminal(input, settled, cleanup, resolve, reject);
        }
      } catch {
        if (!settled.current) {
          pollUntilTerminal(input, settled, cleanup, resolve, reject);
        }
      }
    })();
  });
};
