"use client";

import type { ChangeEvent, DragEvent, ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { IconLoader2, IconUpload, IconX } from "@tabler/icons-react";
import {
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
import { FlashTonePreview } from "@/components/content/flash-tone-preview";
import {
  FLASH_MESSAGE_MAX_LENGTH,
  type Content,
  type FlashTone,
} from "@/types/content";

const FLASH_PREVIEW_DEBOUNCE_MS = 500;

export interface EditContentDialogSaveInput {
  readonly contentId: string;
  readonly title: string;
  readonly file: File | null;
  readonly flashMessage: string | null;
  readonly flashTone: FlashTone | null;
  readonly textJsonContent: string | null;
  readonly textHtmlContent: string | null;
}

interface EditContentDialogProps {
  readonly content: Content | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (input: EditContentDialogSaveInput) => Promise<void>;
}

export function EditContentDialog({
  content,
  open,
  onOpenChange,
  onSave,
}: EditContentDialogProps): ReactElement | null {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!content) {
    return null;
  }

  const dialogWidth =
    content.type === "FLASH"
      ? "max-h-[calc(100dvh-2rem)] overflow-hidden sm:max-w-2xl"
      : content.type === "TEXT"
        ? "max-h-[calc(100dvh-2rem)] overflow-hidden sm:max-w-4xl"
        : "sm:max-w-lg";

  const guardedOnOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={guardedOnOpenChange}>
      <DialogContent
        className={dialogWidth}
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <EditContentDialogForm
          key={content.id}
          content={content}
          onOpenChange={guardedOnOpenChange}
          onSave={onSave}
          onSubmittingChange={setIsSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}

interface EditContentDialogFormProps {
  readonly content: Content;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (input: EditContentDialogSaveInput) => Promise<void>;
  readonly onSubmittingChange?: (submitting: boolean) => void;
}

function EditContentDialogForm({
  content,
  onOpenChange,
  onSave,
  onSubmittingChange,
}: EditContentDialogFormProps): ReactElement {
  const [title, setTitle] = useState(content.title);
  const [flashMessage, setFlashMessage] = useState(content.flashMessage ?? "");
  const [debouncedFlashMessage, setDebouncedFlashMessage] = useState(
    content.flashMessage ?? "",
  );
  const [flashTone, setFlashTone] = useState<FlashTone>(
    content.flashTone ?? "INFO",
  );
  const [textJsonContent, setTextJsonContent] = useState(
    content.textJsonContent ?? "",
  );
  const [textHtmlContent, setTextHtmlContent] = useState(
    content.textHtmlContent ?? "",
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedFlashMessage(flashMessage);
    }, FLASH_PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [flashMessage]);

  const canReplaceFile = content.status !== "PROCESSING";
  const isFlashContent = content.type === "FLASH";
  const isTextContent = content.type === "TEXT";

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Content</DialogTitle>
        {isFlashContent ? (
          <DialogDescription>
            Update the flash message used for display playback.
          </DialogDescription>
        ) : isTextContent ? (
          <DialogDescription>
            Update formatted text content for display playback.
          </DialogDescription>
        ) : (
          <DialogDescription>
            Update the content title or replace the uploaded file.
          </DialogDescription>
        )}
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-content-title">
            {isFlashContent
              ? "Flash Content Title"
              : isTextContent
                ? "Text Content Title"
                : "Content Title"}
          </Label>
          <Input
            id="edit-content-title"
            placeholder={
              isFlashContent ? "Enter flash content title" : undefined
            }
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        {isFlashContent ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="edit-flash-message">Flash Content Message</Label>
              <Textarea
                id="edit-flash-message"
                value={flashMessage}
                onChange={(event) => setFlashMessage(event.target.value)}
                placeholder="Enter the flash message to display"
                maxLength={FLASH_MESSAGE_MAX_LENGTH}
                className="min-h-28 resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-flash-tone">Flash Content Tone</Label>
              <Select
                value={flashTone}
                onValueChange={(value: FlashTone) => setFlashTone(value)}
              >
                <SelectTrigger id="edit-flash-tone" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preview</Label>
              <FlashTonePreview
                tone={flashTone}
                message={debouncedFlashMessage}
                fallbackMessage="Flash content preview"
              />
            </div>
          </>
        ) : isTextContent ? (
          <div className="space-y-2">
            <Label>Text Content Message</Label>
            <TiptapEditor
              content={textJsonContent}
              onChange={(json, html) => {
                setTextJsonContent(json);
                setTextHtmlContent(html);
              }}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {canReplaceFile ? (
              <div
                className={`flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-8 transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
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
                      htmlFor={`edit-content-file-${content.id}`}
                      className="cursor-pointer font-medium text-primary hover:underline"
                    >
                      Choose a file
                    </label>{" "}
                    or drag it here.
                  </p>
                  <input
                    id={`edit-content-file-${content.id}`}
                    type="file"
                    className="sr-only"
                    accept={SUPPORTED_CONTENT_FILE_MIME_TYPES}
                    onChange={handleFileInputChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    {SUPPORTED_CONTENT_FILE_LABELS}
                  </p>
                  <p className="text-xs text-muted-foreground">Max 10 MB</p>
                </div>
                {selectedFile ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium leading-none text-primary">
                      Selected: {selectedFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-primary transition-colors hover:text-destructive"
                      aria-label="Remove selected file"
                    >
                      <IconX className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Processing content cannot be replaced right now.
              </p>
            )}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          onClick={async () => {
            setIsSaving(true);
            onSubmittingChange?.(true);
            try {
              await onSave({
                contentId: content.id,
                title: title.trim(),
                file: selectedFile,
                flashMessage: isFlashContent ? flashMessage.trim() : null,
                flashTone: isFlashContent ? flashTone : null,
                textJsonContent: isTextContent ? textJsonContent : null,
                textHtmlContent: isTextContent ? textHtmlContent : null,
              });
              onOpenChange(false);
            } finally {
              setIsSaving(false);
              onSubmittingChange?.(false);
            }
          }}
          disabled={
            title.trim().length === 0 ||
            (isFlashContent && flashMessage.trim().length === 0) ||
            isSaving
          }
        >
          {isSaving ? (
            <>
              <IconLoader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
