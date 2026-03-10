"use client";

import type { ChangeEvent, DragEvent, ReactElement } from "react";
import { useCallback, useState } from "react";
import { IconEye, IconUpload } from "@tabler/icons-react";
import {
  SUPPORTED_CONTENT_FILE_LABELS,
  SUPPORTED_CONTENT_FILE_MIME_TYPES,
} from "@/components/content/content-file-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { formatContentStatus, formatFileSize } from "@/lib/formatters";
import type { Content, FlashTone } from "@/types/content";

export interface EditContentDialogSaveInput {
  readonly contentId: string;
  readonly title: string;
  readonly file: File | null;
  readonly flashMessage: string | null;
  readonly flashTone: FlashTone | null;
  readonly scrollPxPerSecond: number | null;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
  const [flashTone, setFlashTone] = useState<FlashTone>(
    content.flashTone ?? "INFO",
  );
  const [scrollPxPerSecond, setScrollPxPerSecond] = useState(
    content.scrollPxPerSecond?.toString() ?? "",
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canReplaceFile =
    content.kind === "ROOT" && content.status !== "PROCESSING";
  const isFlashContent = content.type === "FLASH";
  const supportsScrollSpeed =
    content.type === "IMAGE" || content.type === "PDF";

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
          </>
        ) : (
          <div className="space-y-2">
            {supportsScrollSpeed ? (
              <div className="space-y-2">
                <Label htmlFor="edit-content-scroll-speed">
                  Scroll Speed (px/s)
                </Label>
                <Input
                  id="edit-content-scroll-speed"
                  type="number"
                  min={1}
                  value={scrollPxPerSecond}
                  onChange={(event) => setScrollPxPerSecond(event.target.value)}
                  placeholder="Leave empty to use default"
                />
              </div>
            ) : null}
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
                {content.kind === "PAGE"
                  ? "Page items can be renamed but cannot replace files directly."
                  : "Processing content cannot be replaced right now."}
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
                scrollPxPerSecond: supportsScrollSpeed
                  ? (() => {
                      if (scrollPxPerSecond.trim().length === 0) {
                        return null;
                      }
                      const raw = Number(scrollPxPerSecond);
                      if (!Number.isFinite(raw) || raw <= 0) {
                        return null;
                      }
                      return Math.trunc(raw);
                    })()
                  : null,
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
          <DialogTitle className="flex items-center gap-2">
            <IconEye className="size-4" />
            Content Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Title:</span>{" "}
            {content.title}
          </p>
          <p>
            <span className="text-muted-foreground">Type:</span> {content.type}
          </p>
          <p>
            <span className="text-muted-foreground">MIME Type:</span>{" "}
            {content.mimeType || "Unknown"}
          </p>
          <p>
            <span className="text-muted-foreground">Size:</span>{" "}
            {formatFileSize(content.fileSize)}
          </p>
          <p>
            <span className="text-muted-foreground">Status:</span>{" "}
            {formatContentStatus(content.status)}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
