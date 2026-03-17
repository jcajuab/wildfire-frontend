"use client";

import type { ReactElement } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  PdfCropEditor,
  type CropRegion,
} from "@/components/content/pdf-crop-editor";
import type {
  PdfUploadAcceptedResponse,
  PdfCropRegion,
} from "@/lib/api/content-api";

interface PdfCropDialogProps {
  readonly session: PdfUploadAcceptedResponse | null;
  readonly onSubmit: (regions: readonly PdfCropRegion[]) => Promise<void>;
  readonly onCancel: () => Promise<void>;
}

export function PdfCropDialog({
  session,
  onSubmit,
  onCancel,
}: PdfCropDialogProps): ReactElement | null {
  if (!session) {
    return null;
  }

  const handleSubmit = async (regions: CropRegion[]) => {
    await onSubmit(regions);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) void onCancel();
      }}
    >
      <DialogContent className="flex h-[90vh] w-[95vw] max-w-[1400px] flex-col p-6">
        <DialogTitle className="sr-only">
          Crop PDF — {session.filename}
        </DialogTitle>
        <PdfCropEditor
          pdfUrl={session.pdfUrl}
          pages={[...session.pages]}
          filename={session.filename}
          onSubmit={(regions) => {
            void handleSubmit(regions);
          }}
          onCancel={() => {
            void onCancel();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
