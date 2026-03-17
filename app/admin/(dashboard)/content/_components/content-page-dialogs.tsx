"use client";

import type { ChangeEvent, DragEvent, ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { IconUpload } from "@tabler/icons-react";
import {
  SUPPORTED_CONTENT_FILE_LABELS,
  SUPPORTED_CONTENT_FILE_MIME_TYPES,
} from "@/components/content/content-file-types";
import { TiptapEditor } from "@/components/content/tiptap-editor";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import {
  formatContentStatus,
  formatFileSize,
  getContentStatusBadgeClassName,
} from "@/lib/formatters";
import type { Content, FlashTone } from "@/types/content";

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
  if (!content) {
    return null;
  }

  const dialogWidth = content.type === "TEXT" ? "sm:max-w-2xl" : "sm:max-w-md";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogWidth}>
        <EditContentDialogForm
          key={content.id}
          content={content}
          onOpenChange={onOpenChange}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  );
}

interface EditContentDialogFormProps {
  readonly content: Content;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (input: EditContentDialogSaveInput) => Promise<void>;
}

function EditContentDialogForm({
  content,
  onOpenChange,
  onSave,
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
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="edit-content-title">Title</Label>
          <Input
            id="edit-content-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        {isFlashContent ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="edit-flash-message">Ticker Message</Label>
              <Textarea
                id="edit-flash-message"
                value={flashMessage}
                onChange={(event) => setFlashMessage(event.target.value)}
                maxLength={240}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-flash-tone">Tone</Label>
              <Select
                value={flashTone}
                onValueChange={(value) => setFlashTone(value as FlashTone)}
              >
                <SelectTrigger id="edit-flash-tone">
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
              />
            </div>
          </>
        ) : isTextContent ? (
          <div className="space-y-2">
            <Label>Rich Text Content</Label>
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
            <Label>Replace File</Label>
            <p className="text-xs text-muted-foreground">
              Current file type: {content.type} ({content.mimeType || "Unknown"}
              )
            </p>
            {canReplaceFile ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Optional: choose a new file to replace it.
                </p>
                <div
                  className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                    <IconUpload className="size-5 text-muted-foreground" />
                  </div>
                  <div className="text-center">
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
                      Supported files: {SUPPORTED_CONTENT_FILE_LABELS}
                    </p>
                  </div>
                  {selectedFile ? (
                    <p className="text-xs font-medium text-primary">
                      Selected: {selectedFile.name}
                    </p>
                  ) : null}
                </div>
              </>
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
            }
          }}
          disabled={
            title.trim().length === 0 ||
            (isFlashContent && flashMessage.trim().length === 0) ||
            isSaving
          }
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

interface PreviewContentDialogProps {
  readonly content: Content | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function PreviewContentDialog({
  content,
  open,
  onOpenChange,
}: PreviewContentDialogProps): ReactElement | null {
  if (!content) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Content Details</DialogTitle>
          <DialogDescription>
            File details, type, and processing status for this content item.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
          <span className="text-muted-foreground">Title</span>
          <span>{content.title}</span>
          <span className="text-muted-foreground">Type</span>
          <span>{content.type}</span>
          <span className="text-muted-foreground">MIME Type</span>
          <span>{content.mimeType || "Unknown"}</span>
          <span className="text-muted-foreground">Size</span>
          <span>{formatFileSize(content.fileSize)}</span>
          <span className="text-muted-foreground">Status</span>
          <Badge
            variant="outline"
            className={cn(getContentStatusBadgeClassName(content.status))}
          >
            {formatContentStatus(content.status)}
          </Badge>
        </div>
        <DialogFooter className="pt-4 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
