"use client";

import type { ChangeEvent, ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { IconBolt, IconUpload } from "@tabler/icons-react";
import {
  SUPPORTED_CONTENT_FILE_LABELS,
  SUPPORTED_CONTENT_FILE_MIME_TYPES,
} from "@/components/content/content-file-types";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { FlashTone } from "@/types/content";

interface CreateContentDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
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
}

export function CreateContentDialog({
  open,
  onOpenChange,
  onUploadFile,
  onCreateFlash,
}: CreateContentDialogProps): ReactElement {
  const [mode, setMode] = useState<"upload" | "flash">("upload");
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scrollPxPerSecond, setScrollPxPerSecond] = useState("");
  const [flashMessage, setFlashMessage] = useState("");
  const [flashTone, setFlashTone] = useState<FlashTone>("INFO");
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const VIDEO_MAX_BYTES = 10 * 1024 * 1024;

  const resetState = useCallback(() => {
    setMode("upload");
    setTitle("");
    setSelectedFile(null);
    setScrollPxPerSecond("");
    setFlashMessage("");
    setFlashTone("INFO");
    setIsDragging(false);
    setFileError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [onOpenChange, resetState]);

  const isUploadMode = mode === "upload";
  const canSubmit = useMemo(() => {
    if (isUploadMode) {
      return title.trim().length > 0 && selectedFile !== null;
    }
    return title.trim().length > 0 && flashMessage.trim().length > 0;
  }, [flashMessage, isUploadMode, selectedFile, title]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;

    if (isUploadMode && selectedFile) {
      const rawScrollPxPerSecond = Number(scrollPxPerSecond);
      const parsedScrollPxPerSecond =
        scrollPxPerSecond.trim().length > 0
          ? Number.isFinite(rawScrollPxPerSecond) && rawScrollPxPerSecond > 0
            ? Math.trunc(rawScrollPxPerSecond)
            : undefined
          : undefined;
      onUploadFile(title.trim(), selectedFile, parsedScrollPxPerSecond);
    } else if (!isUploadMode) {
      onCreateFlash({
        title: title.trim(),
        message: flashMessage.trim(),
        tone: flashTone,
      });
    }

    handleClose();
  }, [
    canSubmit,
    flashMessage,
    flashTone,
    handleClose,
    isUploadMode,
    onCreateFlash,
    onUploadFile,
    selectedFile,
    scrollPxPerSecond,
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

  const supportsScrollSpeed = useMemo(() => {
    if (!selectedFile) {
      return false;
    }
    return (
      selectedFile.type.startsWith("image/") ||
      selectedFile.type === "application/pdf"
    );
  }, [selectedFile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Content</DialogTitle>
          <DialogDescription>
            Upload media for playlist playback or generate a flash ticker item
            for scheduling as an overlay.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as "upload" | "flash")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload Content</TabsTrigger>
              <TabsTrigger value="flash">Generate Flash Content</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="content-title">
              {isUploadMode ? "Content Name" : "Flash Title"}
            </Label>
            <Input
              id="content-title"
              placeholder={isUploadMode ? "Lobby PDF" : "Ticker: hello world"}
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
                  <p className="text-xs font-medium text-primary">
                    Selected: {selectedFile.name}
                  </p>
                ) : null}
              </div>

              {supportsScrollSpeed ? (
                <div className="space-y-2">
                  <Label htmlFor="content-scroll-speed">
                    Scroll Speed (px/s)
                  </Label>
                  <Input
                    id="content-scroll-speed"
                    type="number"
                    min={1}
                    value={scrollPxPerSecond}
                    onChange={(event) =>
                      setScrollPxPerSecond(event.target.value)
                    }
                    placeholder="Leave empty to use default"
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
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
              <div className="overflow-hidden rounded-md border border-border bg-background">
                <div className="flex h-12 items-center gap-3 whitespace-nowrap bg-foreground px-4 text-sm font-medium text-background">
                  <IconBolt className="size-4 shrink-0" />
                  <div className="animate-[marquee_14s_linear_infinite] pr-8 motion-reduce:animate-none">
                    {(flashMessage.trim() || "Ticker preview") + "   "}
                    .repeat(4)
                  </div>
                </div>
              </div>
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
            ) : (
              <>
                <IconBolt className="size-4" />
                Create flash
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
