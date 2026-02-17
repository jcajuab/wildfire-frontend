"use client";

import type { ChangeEvent, ReactElement } from "react";
import { useState, useCallback } from "react";
import { IconUpload } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateContentDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onUploadFile: (name: string, file: File) => void;
}

const SUPPORTED_FILE_MIME_TYPES =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,application/pdf";
const SUPPORTED_FILE_LABELS = "JPG, PNG, WEBP, GIF, MP4, PDF";

export function CreateContentDialog({
  open,
  onOpenChange,
  onUploadFile,
}: CreateContentDialogProps): ReactElement {
  const [name, setName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleClose = useCallback(() => {
    setName("");
    setSelectedFile(null);
    setIsDragging(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleUpload = useCallback(() => {
    if (!name.trim() || !selectedFile) return;
    onUploadFile(name.trim(), selectedFile);
    handleClose();
  }, [name, selectedFile, onUploadFile, handleClose]);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Create New Content</DialogTitle>
          <DialogDescription>
            Upload a supported media file to add it to the content library.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Name input */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="content-name">Name</Label>
            <Input
              id="content-name"
              placeholder="Enter content name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* File upload area */}
          <div
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
              <IconUpload className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
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
                accept={SUPPORTED_FILE_MIME_TYPES}
                onChange={handleFileInputChange}
              />
              <p className="text-xs text-muted-foreground">
                Supported files types:
              </p>
              <p className="text-xs text-muted-foreground">
                {SUPPORTED_FILE_LABELS}
              </p>
            </div>
            {selectedFile && (
              <p className="text-xs font-medium text-primary">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!name.trim() || selectedFile === null}
            className="flex-1"
          >
            <IconUpload className="size-4" />
            Upload file
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
