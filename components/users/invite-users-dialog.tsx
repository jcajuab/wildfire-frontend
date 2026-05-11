"use client";

import type { ChangeEvent, FormEvent, ReactElement } from "react";
import { useState, useRef } from "react";
import { IconPlus, IconDownload, IconUpload, IconX } from "@tabler/icons-react";
import { toast } from "sonner";

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
import { RequiredLabel } from "@/components/common/required-label";
import { Separator } from "@/components/ui/separator";

interface InviteUsersDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onInvite: (emails: readonly string[]) => Promise<boolean>;
}

function InviteUsersDialogContent({
  onInvite,
  onOpenChange,
}: Omit<InviteUsersDialogProps, "open">): ReactElement {
  const [emails, setEmails] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEmailChange = (index: number, value: string): void => {
    setEmails((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleAddEmail = (): void => {
    setEmails((prev) => [...prev, ""]);
  };

  const handleRemoveEmail = (index: number): void => {
    if (emails.length <= 1) return;
    setEmails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDownloadSample = (): void => {
    const csvContent = "email\njane.doe@example.com\njohn.smith@example.com";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split("\n").filter((line) => line.trim());
      // Skip header if it looks like a header
      const startIndex = lines[0]?.toLowerCase().includes("email") ? 1 : 0;
      const newEmails = lines.slice(startIndex).map((line) => line.trim());
      if (newEmails.length > 0) {
        setEmails(newEmails);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (isSubmitting) return;
    const validEmails = emails.filter(
      (email) => email.trim() && email.includes("@"),
    );
    if (validEmails.length === 0) return;
    setIsSubmitting(true);
    try {
      const didInvite = await onInvite(validEmails);
      if (didInvite) {
        toast.success(
          validEmails.length === 1
            ? "Invitation sent. Use the row menu to copy the link."
            : `${validEmails.length} invitations sent.`,
        );
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasValidEmail = emails.some(
    (email) => email.trim() && email.includes("@"),
  );

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
      <DialogHeader>
        <DialogTitle>Invite New Users</DialogTitle>
        <DialogDescription>
          Invite teammates by email individually or by uploading a CSV file.
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 py-4">
        {/* Email inputs */}
        <div className="flex min-h-0 flex-col gap-2">
          <RequiredLabel>Email</RequiredLabel>
          <div className="max-h-56 overflow-y-auto pr-1">
            <div className="flex flex-col gap-2">
              {emails.map((email, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                    placeholder="jane.doe@example.com"
                  />
                  {emails.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveEmail(index)}
                      aria-label={`Remove email field ${index + 1}`}
                    >
                      <IconX className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAddEmail}
          className="w-fit px-1 text-primary hover:bg-transparent hover:text-primary hover:underline"
        >
          <IconPlus
            className="size-4"
            aria-hidden="true"
            data-icon="inline-start"
          />
          Add Another Email
        </Button>

        {/* Divider with "Or" */}
        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">Or</span>
          <Separator className="flex-1" />
        </div>

        {/* CSV buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadSample}
          >
            <IconDownload className="size-4" aria-hidden="true" />
            Download Sample CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUploadClick}
          >
            <IconUpload className="size-4" aria-hidden="true" />
            Upload CSV File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!hasValidEmail || isSubmitting}>
          {isSubmitting ? "Inviting..." : "Invite"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function InviteUsersDialog({
  open,
  onOpenChange,
  onInvite,
}: InviteUsersDialogProps): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-md">
        {open && (
          <InviteUsersDialogContent
            key="invite-users-form"
            onInvite={onInvite}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
