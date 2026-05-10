"use client";

import type { ChangeEvent, ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconLoader2, IconUpload, IconX } from "@tabler/icons-react";
import { FlashTonePreview } from "@/components/content/flash-tone-preview";
import {
  CONTENT_FILE_MAX_LABEL,
  getContentFileValidationError,
  SUPPORTED_CONTENT_FILE_LABELS,
  SUPPORTED_CONTENT_FILE_MIME_TYPES,
} from "@/components/content/content-file-types";
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(
  () =>
    import("@/components/content/tiptap-editor").then((m) => m.TiptapEditor),
  {
    ssr: false,
    loading: () => <div className="h-48 animate-pulse rounded-md bg-muted" />,
  },
);
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FLASH_MESSAGE_MAX_LENGTH, type FlashTone } from "@/types/content";

const FLASH_PREVIEW_DEBOUNCE_MS = 500;

interface CreateContentDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: "upload" | "flash" | "text";
  readonly onUploadFile: (name: string, file: File) => void | Promise<void>;
  readonly onCreateFlash: (input: {
    title: string;
    message: string;
    tone: FlashTone;
  }) => void | Promise<void>;
  readonly onCreateText: (input: {
    title: string;
    jsonContent: string;
    htmlContent: string;
  }) => void | Promise<void>;
}

export function CreateContentDialog({
  open,
  onOpenChange,
  mode,
  onUploadFile,
  onCreateFlash,
  onCreateText,
}: CreateContentDialogProps): ReactElement {
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [flashMessage, setFlashMessage] = useState("");
  const [debouncedFlashMessage, setDebouncedFlashMessage] = useState("");
  const [flashTone, setFlashTone] = useState<FlashTone>("INFO");
  const [textJsonContent, setTextJsonContent] = useState("");
  const [textHtmlContent, setTextHtmlContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const resetState = useCallback(() => {
    setTitle("");
    setSelectedFile(null);
    setFlashMessage("");
    setDebouncedFlashMessage("");
    setFlashTone("INFO");
    setTextJsonContent("");
    setTextHtmlContent("");
    setIsDragging(false);
    setFileError(null);
    setIsSubmitting(false);
    submittingRef.current = false;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [onOpenChange, resetState]);

  const isUploadMode = mode === "upload";
  const isFlashMode = mode === "flash";
  const isTextMode = mode === "text";
  const dialogSizeClass = isFlashMode
    ? "max-h-[calc(100dvh-2rem)] overflow-hidden sm:max-w-2xl"
    : isTextMode
      ? "max-h-[calc(100dvh-2rem)] overflow-hidden sm:max-w-4xl"
      : "sm:max-w-lg";
  const canSubmit = useMemo(() => {
    if (title.trim().length === 0) return false;
    if (isUploadMode) {
      return selectedFile !== null;
    }
    if (isFlashMode) {
      return flashMessage.trim().length > 0;
    }
    if (isTextMode) {
      return textJsonContent.length > 0 && textHtmlContent.length > 0;
    }
    return false;
  }, [
    flashMessage,
    isFlashMode,
    isTextMode,
    isUploadMode,
    selectedFile,
    textHtmlContent,
    textJsonContent,
    title,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submittingRef.current) return;

    if (isUploadMode && selectedFile) {
      const validationError = getContentFileValidationError(selectedFile);
      if (validationError) {
        setFileError(validationError);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (isUploadMode && selectedFile) {
        await onUploadFile(title.trim(), selectedFile);
      } else if (isFlashMode) {
        await onCreateFlash({
          title: title.trim(),
          message: flashMessage.trim(),
          tone: flashTone,
        });
      } else if (isTextMode) {
        await onCreateText({
          title: title.trim(),
          jsonContent: textJsonContent,
          htmlContent: textHtmlContent,
        });
      }

      handleClose();
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    flashMessage,
    flashTone,
    handleClose,
    isFlashMode,
    isTextMode,
    isUploadMode,
    onCreateFlash,
    onCreateText,
    onUploadFile,
    selectedFile,
    textHtmlContent,
    textJsonContent,
    title,
  ]);

  const handleFileSelect = useCallback((file: File) => {
    const validationError = getContentFileValidationError(file);
    if (validationError) {
      setFileError(validationError);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setFileError(null);
    setSelectedFile(file);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      const file = event.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  useEffect(() => {
    resetState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedFlashMessage(flashMessage);
    }, FLASH_PREVIEW_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [flashMessage]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={dialogSizeClass}
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {isUploadMode
              ? "Upload File"
              : isFlashMode
                ? "Create Flash Content"
                : "Create Text Content"}
          </DialogTitle>
          <DialogDescription>
            {isUploadMode
              ? "Add a media file for display playback."
              : isFlashMode
                ? "Create a short flash message for display playback."
                : "Create formatted text content for display playback."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content-title">
              {isUploadMode
                ? "Content Title"
                : isFlashMode
                  ? "Flash Content Title"
                  : "Text Content Title"}
            </Label>
            <Input
              id="content-title"
              placeholder={
                isUploadMode
                  ? "Enter content title"
                  : isFlashMode
                    ? "Enter flash content title"
                    : "Enter text content title"
              }
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          {isUploadMode ? (
            <div className="space-y-4">
              <div
                className={`flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-8 transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : selectedFile
                      ? "border-blue-500 bg-blue-50"
                      : "border-muted-foreground/25"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex size-12 items-center justify-center rounded-md bg-muted">
                  <IconUpload className="size-6 text-muted-foreground" />
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-sm">
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer font-medium text-primary hover:underline"
                    >
                      Choose a file
                    </label>{" "}
                    or drag it here.
                  </p>
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    className="sr-only"
                    accept={SUPPORTED_CONTENT_FILE_MIME_TYPES}
                    onChange={handleFileInputChange}
                    aria-invalid={fileError ? true : undefined}
                    aria-describedby={
                      fileError ? "file-upload-error" : undefined
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {SUPPORTED_CONTENT_FILE_LABELS}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Max {CONTENT_FILE_MAX_LABEL}
                  </p>
                </div>
                {fileError ? (
                  <p
                    id="file-upload-error"
                    role="alert"
                    className="text-xs font-medium text-destructive"
                  >
                    {fileError}
                  </p>
                ) : null}
                {selectedFile ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-primary leading-none">
                      Selected: {selectedFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={clearSelectedFile}
                      className="text-primary hover:text-destructive transition-colors"
                      aria-label="Remove selected file"
                    >
                      <IconX className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : isFlashMode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="flash-message">Flash Content Message</Label>
                <Textarea
                  id="flash-message"
                  value={flashMessage}
                  onChange={(event) => setFlashMessage(event.target.value)}
                  placeholder="Enter the flash message to display"
                  maxLength={FLASH_MESSAGE_MAX_LENGTH}
                  className="min-h-28 resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  {flashMessage.length}/{FLASH_MESSAGE_MAX_LENGTH} characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="flash-tone">Flash Content Tone</Label>
                <Select
                  value={flashTone}
                  onValueChange={(value: FlashTone) => setFlashTone(value)}
                >
                  <SelectTrigger id="flash-tone" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARNING">Warning</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FlashTonePreview
                tone={flashTone}
                message={debouncedFlashMessage}
                fallbackMessage="Flash content preview"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Text Content Message</Label>
              <TiptapEditor
                onChange={(json, html) => {
                  setTextJsonContent(json);
                  setTextHtmlContent(html);
                }}
                placeholder="Write your rich text content here..."
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? (
              <>
                <IconLoader2
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
