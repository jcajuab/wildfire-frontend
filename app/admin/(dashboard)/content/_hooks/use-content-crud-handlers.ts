"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  contentApi,
  useCreateFlashContentMutation,
  useCreateTextContentMutation,
  useDeleteContentMutation,
  useLazyGetContentFileUrlQuery,
  useReplaceContentFileMutation,
  useUpdateContentMutation,
  useUploadContentMutation,
} from "@/lib/api/content-api";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import { useAppDispatch } from "@/lib/hooks";
import { mapBackendContentToContent } from "@/lib/mappers/content-mapper";
import type { Content } from "@/types/content";
import type { EditContentDialogSaveInput } from "../_components/content-page-dialogs";
import type { PageCollectionState } from "./use-pdf-page-collection";

export interface ContentCrudHandlers {
  readonly handleUploadFile: (
    name: string,
    file: File,
    scrollPxPerSecond?: number,
  ) => Promise<void>;
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
  readonly pageCollectionsByParentId: Record<string, PageCollectionState>;
  readonly updatePageCollection: (
    parentId: string,
    updater: (current: PageCollectionState) => PageCollectionState,
  ) => void;
  readonly setPageCollection: (
    parentId: string,
    nextCollection: PageCollectionState,
  ) => void;
}

/**
 * Provides CRUD handlers for content operations (Upload, Create, Update, Delete, Download).
 * Business logic with injected API layer and dependencies.
 */
export function useContentCrudHandlers(
  input: UseContentCrudHandlersInput,
): ContentCrudHandlers {
  const dispatch = useAppDispatch();
  const [uploadContent] = useUploadContentMutation();
  const [createFlashContent] = useCreateFlashContentMutation();
  const [createTextContent] = useCreateTextContentMutation();
  const [deleteContent] = useDeleteContentMutation();
  const [updateContent] = useUpdateContentMutation();
  const [replaceContentFile] = useReplaceContentFileMutation();
  const [getContentFileUrl] = useLazyGetContentFileUrlQuery();

  const handleUploadFile = useCallback(
    async (name: string, file: File, scrollPxPerSecond?: number) => {
      try {
        const accepted = await uploadContent({
          title: name,
          file,
          scrollPxPerSecond,
        }).unwrap();
        toast.message("Content upload queued.");
        input.trackContentJob({
          jobId: accepted.job.id,
          contentId: accepted.content.id,
          successMessage: "Content uploaded.",
          failureMessage: "Content ingestion failed.",
        });
      } catch (error) {
        notifyApiError(error, "Failed to upload content.");
      }
    },
    [input, uploadContent],
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
      scrollPxPerSecond,
      textJsonContent,
      textHtmlContent,
    }: EditContentDialogSaveInput) => {
      const editedContent = input.contentToEdit;
      const parentContentIdForRollback =
        editedContent?.id === contentId ? editedContent.parentContentId : null;
      const previousCollection = parentContentIdForRollback
        ? input.pageCollectionsByParentId[parentContentIdForRollback]
        : undefined;

      try {
        if (file) {
          const accepted = await replaceContentFile({
            id: contentId,
            file,
            title,
          }).unwrap();
          toast.message("Content replacement queued.");
          input.trackContentJob({
            jobId: accepted.job.id,
            contentId: accepted.content.id,
            successMessage: "Content file replaced.",
            failureMessage: "Content replacement ingestion failed.",
          });
          return;
        }

        if (parentContentIdForRollback !== null && previousCollection) {
          input.updatePageCollection(parentContentIdForRollback, (current) => ({
            ...current,
            items: current.items.map((item) =>
              item.id === contentId ? { ...item, title } : item,
            ),
          }));
        }

        const updated = mapBackendContentToContent(
          await updateContent({
            id: contentId,
            title,
            ...(editedContent?.type === "FLASH"
              ? {
                  flashMessage: flashMessage ?? "",
                  flashTone: flashTone ?? "INFO",
                }
              : editedContent?.type === "TEXT"
                ? {
                    textJsonContent: textJsonContent ?? "",
                    textHtmlContent: textHtmlContent ?? "",
                  }
                : editedContent?.type === "IMAGE" ||
                    editedContent?.type === "PDF"
                  ? {
                      scrollPxPerSecond,
                    }
                  : {}),
          }).unwrap(),
        );
        const updatedParentContentId = updated.parentContentId;
        if (updatedParentContentId) {
          input.updatePageCollection(updatedParentContentId, (current) => ({
            ...current,
            items: current.items.map((item) =>
              item.id === updated.id ? updated : item,
            ),
          }));
        }
        dispatch(
          contentApi.util.invalidateTags([
            { type: "Content", id: "LIST" },
            { type: "Content", id: updated.id },
            ...(updatedParentContentId !== null
              ? [{ type: "Content" as const, id: updatedParentContentId }]
              : []),
          ]),
        );
        toast.success("Content updated.");
      } catch (error) {
        if (input.contentToEdit?.id === contentId) {
          const parentContentId = input.contentToEdit.parentContentId;
          if (parentContentId && previousCollection) {
            input.setPageCollection(parentContentId, previousCollection);
          }
        }
        notifyApiError(
          error,
          file
            ? "Failed to replace content file."
            : "Failed to update content.",
        );
        throw error;
      }
    },
    [dispatch, input, replaceContentFile, updateContent],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!input.contentToDelete) {
      return;
    }
    await deleteContent(input.contentToDelete.id).unwrap();
    toast.success("Content deleted.");
  }, [deleteContent, input.contentToDelete]);

  return {
    handleUploadFile,
    handleCreateFlash,
    handleCreateText,
    handleDownload,
    handleSaveContent,
    handleConfirmDelete,
  };
}
