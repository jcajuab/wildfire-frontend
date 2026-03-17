"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconAlertTriangle } from "@tabler/icons-react";
import {
  useSubmitPdfCropsMutation,
  useCancelPdfUploadMutation,
  type PdfUploadAcceptedResponse,
  type PdfCropRegion,
} from "@/lib/api/content-api";
import { PdfCropEditor, type CropRegion } from "@/components/content";
import { Button } from "@/components/ui/button";

const SESSION_KEY_PREFIX = "wildfire:pdf-crop:";

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

  const handleSubmit = useCallback(
    async (regions: CropRegion[]) => {
      if (!uploadId) return;
      try {
        const mapped: PdfCropRegion[] = regions.map((r) => ({
          pageNumber: r.pageNumber,
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
        }));
        await submitPdfCrops({ uploadId, regions: mapped, contentName }).unwrap();
        sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${uploadId}`);
        router.push("/admin/content");
      } catch {
        // error surfaces via toast in RTK base query
      }
    },
    [uploadId, submitPdfCrops, router],
  );

  const handleCancel = useCallback(async () => {
    if (!uploadId) return;
    try {
      await cancelPdfUpload(uploadId).unwrap();
    } finally {
      sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${uploadId}`);
      router.push("/admin/content");
    }
  }, [uploadId, cancelPdfUpload, router]);

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

  if (!session) return null;

  return (
    <div className="flex h-full flex-col p-4">
      <PdfCropEditor
        pdfUrl={session.pdfUrl}
        pages={[...session.pages]}
        filename={session.filename}
        contentName={contentName}
        onSubmit={(regions) => {
          void handleSubmit(regions);
        }}
        onCancel={() => {
          void handleCancel();
        }}
      />
    </div>
  );
}
