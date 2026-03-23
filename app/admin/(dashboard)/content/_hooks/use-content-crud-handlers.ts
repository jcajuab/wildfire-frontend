"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  useCreateFlashContentMutation,
  useCreateTextContentMutation,
  useDeleteContentMutation,
  useLazyGetContentFileUrlQuery,
  useReplaceContentFileMutation,
  useUpdateContentMutation,
  useUploadContentMutation,
} from "@/lib/api/content-api";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import type { Content } from "@/types/content";
import type { EditContentDialogSaveInput } from "../_components/content-page-dialogs";

export interface ContentCrudHandlers {
  readonly handleUploadFile: (name: string, file: File) => Promise<void>;
  readonly handleCreateFlash: (input: {
    title: string;
    message: string;
    tone: "INFO" | "WARNING" | "CRITICAL";
  }) => Promise<void>;
  readonly handleCreateText: (input: {
    title: string;
    jsonContent: string;
    htmlContent: string;
  }) => Promise<void>;
  readonly handleDownload: (content: Content) => Promise<void>;
  readonly handleSaveContent: (
    input: EditContentDialogSaveInput,
  ) => Promise<void>;
  readonly handleConfirmDelete: () => Promise<void>;
}

export interface UseContentCrudHandlersInput {
  readonly contentToEdit: Content | null;
  readonly contentToDelete: Content | null;
  readonly trackContentJob: (job: {
    jobId: string;
    contentId: string;
    successMessage: string;
    failureMessage: string;
  }) => void;
}

/**
 * Provides CRUD handlers for content operations (Upload, Create, Update, Delete, Download).
 * Business logic with injected API layer and dependencies.
 */
export function useContentCrudHandlers(
  input: UseContentCrudHandlersInput,
): ContentCrudHandlers {
  const { contentToEdit, contentToDelete, trackContentJob } = input;

  const [uploadContent] = useUploadContentMutation();
  const [createFlashContent] = useCreateFlashContentMutation();
  const [createTextContent] = useCreateTextContentMutation();
  const [deleteContent] = useDeleteContentMutation();
  const [updateContent] = useUpdateContentMutation();
  const [replaceContentFile] = useReplaceContentFileMutation();
  const [getContentFileUrl] = useLazyGetContentFileUrlQuery();

  const handleUploadFile = useCallback(
    async (name: string, file: File) => {
      try {
        const accepted = await uploadContent({
          title: name,
          file,
        }).unwrap();
        toast.message("Content upload queued.");
        trackContentJob({
          jobId: accepted.job.id,
          contentId: accepted.content.id,
          successMessage: "Content uploaded.",
          failureMessage: "Content ingestion failed.",
        });
      } catch (error) {
        notifyApiError(error, "Failed to upload content.");
      }
    },
    [trackContentJob, uploadContent],
  );

  const handleCreateFlash = useCallback(
    async (flashInput: {
      title: string;
      message: string;
      tone: "INFO" | "WARNING" | "CRITICAL";
    }) => {
      try {
        await createFlashContent(flashInput).unwrap();
        toast.success("Flash content created.");
      } catch (error) {
        notifyApiError(error, "Failed to create flash content.");
      }
    },
    [createFlashContent],
  );

  const handleCreateText = useCallback(
    async (textInput: {
      title: string;
      jsonContent: string;
      htmlContent: string;
    }) => {
      try {
        await createTextContent(textInput).unwrap();
        toast.success("Text content created.");
      } catch (error) {
        notifyApiError(error, "Failed to create text content.");
      }
    },
    [createTextContent],
  );

  const handleDownload = useCallback(
    async (content: Content) => {
      try {
        const { downloadUrl } = await getContentFileUrl(content.id).unwrap();
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.rel = "noopener noreferrer";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) {
        notifyApiError(error, "Failed to get download URL.");
      }
    },
    [getContentFileUrl],
  );

  const handleSaveContent = useCallback(
    async ({
      contentId,
      title,
      file,
      flashMessage,
      flashTone,
      textJsonContent,
      textHtmlContent,
    }: EditContentDialogSaveInput) => {
      try {
        if (file) {
          const accepted = await replaceContentFile({
            id: contentId,
            file,
            title,
          }).unwrap();
          toast.message("Content replacement queued.");
          trackContentJob({
            jobId: accepted.job.id,
            contentId: accepted.content.id,
            successMessage: "Content file replaced.",
            failureMessage: "Content replacement ingestion failed.",
          });
          return;
        }

        await updateContent({
          id: contentId,
          title,
          ...(contentToEdit?.type === "FLASH"
            ? {
                flashMessage: flashMessage ?? "",
                flashTone: flashTone ?? "INFO",
              }
            : contentToEdit?.type === "TEXT"
              ? {
                  textJsonContent: textJsonContent ?? "",
                  textHtmlContent: textHtmlContent ?? "",
                }
              : {}),
        }).unwrap();
        toast.success("Content updated.");
      } catch (error) {
        notifyApiError(
          error,
          file
            ? "Failed to replace content file."
            : "Failed to update content.",
        );
        throw error;
      }
    },
    [contentToEdit, trackContentJob, replaceContentFile, updateContent],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!contentToDelete) {
      return;
    }
    try {
      await deleteContent(contentToDelete.id).unwrap();
      toast.success("Content deleted.");
    } catch (error) {
      notifyApiError(error, "Failed to delete content.");
    }
  }, [contentToDelete, deleteContent]);

  return {
    handleUploadFile,
    handleCreateFlash,
    handleCreateText,
    handleDownload,
    handleSaveContent,
    handleConfirmDelete,
  };
}
