"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconAlertTriangle } from "@tabler/icons-react";
import { toast } from "sonner";
import {
  useSubmitPdfCropsMutation,
  useCancelPdfUploadMutation,
  type PdfUploadAcceptedResponse,
  type PdfCropRegion,
} from "@/lib/api/content-api";
import dynamic from "next/dynamic";
import type { CropRegion } from "@/components/content/pdf-crop-editor";

const PdfCropEditor = dynamic(
  () =>
    import("@/components/content/pdf-crop-editor").then((m) => m.PdfCropEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  },
);
import { Button } from "@/components/ui/button";

const SESSION_KEY_PREFIX = "wildfire:pdf-crop:";

type SubmitPdfCrops = ReturnType<
  typeof useSubmitPdfCropsMutation
>[0];
type CancelPdfUpload = ReturnType<
  typeof useCancelPdfUploadMutation
>[0];

type AppRouter = ReturnType<typeof useRouter>;

interface PdfCropSessionProps {
  readonly uploadId: string;
  readonly session: PdfUploadAcceptedResponse;
  readonly contentName: string | undefined;
  readonly router: AppRouter;
  readonly submitPdfCrops: SubmitPdfCrops;
  readonly cancelPdfUpload: CancelPdfUpload;
}

/**
 * Owns submit/cancel ref guards. Remounted via `key={uploadId}` on the parent
 * so each PDF session gets fresh refs (parent page can stay mounted across navigations).
 */
function PdfCropSession({
  uploadId,
  session,
  contentName,
  router,
  submitPdfCrops,
  cancelPdfUpload,
}: PdfCropSessionProps) {
  const submittedRef = useRef(false);
  const cancelStartedRef = useRef(false);

  const handleSubmit = useCallback(
    (regions: CropRegion[]) => {
      if (submittedRef.current) return;
      submittedRef.current = true;

      const mapped: PdfCropRegion[] = regions.map((r) => ({
        pageNumber: r.pageNumber,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      }));
      submitPdfCrops({ uploadId, regions: mapped, contentName });
      sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${uploadId}`);
      toast.message(
        "Processing PDF crops. You'll be notified when they're ready.",
      );
      router.push("/admin/content");
    },
    [uploadId, submitPdfCrops, router, contentName],
  );

  const handleCancel = useCallback(() => {
    if (cancelStartedRef.current) return;
    cancelStartedRef.current = true;
    void (async () => {
      try {
        await cancelPdfUpload(uploadId).unwrap();
      } catch {
        // best-effort cleanup
      } finally {
        sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${uploadId}`);
        router.push("/admin/content");
      }
    })();
  }, [uploadId, cancelPdfUpload, router]);

  return (
    <>
      <h1 className="sr-only">Crop PDF</h1>
      <PdfCropEditor
        key={uploadId}
        pdfUrl={session.pdfUrl}
        pages={[...session.pages]}
        filename={session.filename}
        contentName={contentName}
        isSubmitting={false}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </>
  );
}

export default function PdfCropPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("uploadId");

  const [session, setSession] = useState<PdfUploadAcceptedResponse | null>(
    null,
  );
  const [contentName, setContentName] = useState<string | undefined>(undefined);
  const [error, setError] = useState(false);

  const [submitPdfCrops] = useSubmitPdfCropsMutation();
  const [cancelPdfUpload] = useCancelPdfUploadMutation();

  useEffect(() => {
    if (!uploadId) {
      router.replace("/admin/content");
      return;
    }

    try {
      setError(false);
      const raw = sessionStorage.getItem(`${SESSION_KEY_PREFIX}${uploadId}`);
      if (!raw) {
        setError(true);
        return;
      }
      const parsed = JSON.parse(raw) as PdfUploadAcceptedResponse & {
        contentName?: string;
      };
      setSession(parsed);
      if (parsed.contentName) setContentName(parsed.contentName);
    } catch {
      setError(true);
    }
  }, [uploadId, router]);

  if (error || (!session && uploadId)) {
    if (error) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
          <IconAlertTriangle className="size-10" />
          <p className="text-sm">PDF crop session not found or expired.</p>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/content")}
          >
            Return to content
          </Button>
        </div>
      );
    }
    return null;
  }

  if (!session || !uploadId) return null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <PdfCropSession
        key={uploadId}
        uploadId={uploadId}
        session={session}
        contentName={contentName}
        router={router}
        submitPdfCrops={submitPdfCrops}
        cancelPdfUpload={cancelPdfUpload}
      />
    </div>
  );
}
