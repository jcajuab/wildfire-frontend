"use client";

import type { ChangeEvent, ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconBolt, IconFileText, IconUpload, IconX } from "@tabler/icons-react";
import { FlashTonePreview } from "@/components/content/flash-tone-preview";
import {
  SUPPORTED_CONTENT_FILE_LABELS,
  SUPPORTED_CONTENT_FILE_MIME_TYPES,
} from "@/components/content/content-file-types";
import { TiptapEditor } from "@/components/content/tiptap-editor";
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
import type { FlashTone } from "@/types/content";

const FLASH_PREVIEW_DEBOUNCE_MS = 500;

interface CreateContentDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: "upload" | "flash" | "text";
  readonly onUploadFile: (
    name: string,
    file: File,
    scrollPxPerSecond?: number,
  ) => void;
  readonly onCreateFlash: (input: {
    title: string;
    message: string;
    tone: FlashTone;
  }) => void;
  readonly onCreateText: (input: {
    title: string;
    jsonContent: string;
    htmlContent: string;
  }) => void;
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

  const VIDEO_MAX_BYTES = 10 * 1024 * 1024;

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
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [onOpenChange, resetState]);

  const isUploadMode = mode === "upload";
  const isFlashMode = mode === "flash";
  const isTextMode = mode === "text";
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

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;

    if (isUploadMode && selectedFile) {
      onUploadFile(title.trim(), selectedFile);
    } else if (isFlashMode) {
      onCreateFlash({
        title: title.trim(),
        message: flashMessage.trim(),
        tone: flashTone,
      });
    } else if (isTextMode) {
      onCreateText({
        title: title.trim(),
        jsonContent: textJsonContent,
        htmlContent: textHtmlContent,
      });
    }

    handleClose();
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

  const handleFileSelect = useCallback(
    (file: File) => {
      if (file.type === "video/mp4" && file.size > VIDEO_MAX_BYTES) {
        setFileError("Video files cannot exceed 10 MB.");
        setSelectedFile(null);
        return;
      }
      setFileError(null);
      setSelectedFile(file);
    },
    [VIDEO_MAX_BYTES],
  );

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isTextMode ? "sm:max-w-2xl" : "sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle>
            {isUploadMode
              ? "Upload File"
              : isFlashMode
                ? "Create Flash"
                : "Create Text Content"}
          </DialogTitle>
          <DialogDescription>
            {isUploadMode
              ? "Upload an image, video, or PDF to display on your screens."
              : isFlashMode
                ? "Create a flash ticker message to display on your screens."
                : "Create rich text content to display on your screens."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content-title">
              {isUploadMode
                ? "Content Title"
                : isFlashMode
                  ? "Flash Title"
                  : "Text Title"}
            </Label>
            <Input
              id="content-title"
              placeholder={
                isUploadMode
                  ? "Lobby PDF"
                  : isFlashMode
                    ? "Ticker: hello world"
                    : "Announcement"
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
                    id="file-upload"
                    type="file"
                    className="sr-only"
                    accept={SUPPORTED_CONTENT_FILE_MIME_TYPES}
                    onChange={handleFileInputChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    {SUPPORTED_CONTENT_FILE_LABELS}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Videos: max 10 MB · Images/PDFs: max 100 MB
                  </p>
                </div>
                {fileError ? (
                  <p className="text-xs font-medium text-destructive">
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
                      onClick={() => setSelectedFile(null)}
                      className="text-primary hover:text-destructive transition-colors"
                    >
                      <IconX className="size-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : isFlashMode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="flash-message">Ticker Message</Label>
                <Textarea
                  id="flash-message"
                  value={flashMessage}
                  onChange={(event) => setFlashMessage(event.target.value)}
                  placeholder="HELLO WORLD"
                  maxLength={240}
                />
                <p className="text-xs text-muted-foreground">
                  {flashMessage.length}/240 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="flash-tone">Tone</Label>
                <Select
                  value={flashTone}
                  onValueChange={(value) => setFlashTone(value as FlashTone)}
                >
                  <SelectTrigger id="flash-tone">
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
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Content</Label>
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

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1"
          >
            {isUploadMode ? (
              <>
                <IconUpload className="size-4" />
                Upload file
              </>
            ) : isFlashMode ? (
              <>
                <IconBolt className="size-4" />
                Create flash
              </>
            ) : (
              <>
                <IconFileText className="size-4" />
                Create text
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
