"use client";

import { useState, useCallback } from "react";
import { IconUpload, IconSparkles } from "@tabler/icons-react";

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
  readonly onCreateFromScratch: (name: string) => void;
  readonly onUploadFile: (name: string, file: File) => void;
}

const SUPPORTED_FILE_TYPES = ".docx, .odt, .odp, .ods, .pdf, .txt";

export function CreateContentDialog({
  open,
  onOpenChange,
  onCreateFromScratch,
  onUploadFile,
}: CreateContentDialogProps): React.ReactElement {
  const [name, setName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleClose = useCallback(() => {
    setName("");
    setSelectedFile(null);
    setIsDragging(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleCreateFromScratch = useCallback(() => {
    if (name.trim()) {
      if (selectedFile) {
        onUploadFile(name.trim(), selectedFile);
      } else {
        onCreateFromScratch(name.trim());
      }
      handleClose();
    }
  }, [name, selectedFile, onCreateFromScratch, onUploadFile, handleClose]);

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
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
            Upload a document to parse and style it in the editor, or start
            fresh with a blank canvas
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
                accept={SUPPORTED_FILE_TYPES}
                onChange={handleFileInputChange}
              />
              <p className="text-xs text-muted-foreground">
                Supported files types:
              </p>
              <p className="text-xs text-muted-foreground">
                {SUPPORTED_FILE_TYPES}
              </p>
            </div>
            {selectedFile && (
              <p className="text-xs font-medium text-primary">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">Or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleCreateFromScratch}
            disabled={!name.trim()}
            className="flex-1"
          >
            <IconSparkles className="size-4" />
            {selectedFile ? "Upload file" : "Start from scratch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
