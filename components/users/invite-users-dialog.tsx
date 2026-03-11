"use client";

import type { ChangeEvent, FormEvent, ReactElement } from "react";
import { useState, useRef } from "react";
import {
  IconPlus,
  IconDownload,
  IconUpload,
  IconX,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";

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
import { Separator } from "@/components/ui/separator";

interface InviteUsersDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onInvite: (emails: readonly string[]) => Promise<string | null>;
}

interface InviteResult {
  readonly inviteUrl: string;
}

function CopyButton({ text }: { readonly text: string }): ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleCopy}
      aria-label="Copy invite link"
    >
      {copied ? (
        <IconCheck className="size-4 text-green-600" />
      ) : (
        <IconCopy className="size-4" />
      )}
    </Button>
  );
}

function InviteUsersDialogContent({
  onInvite,
  onOpenChange,
}: Omit<InviteUsersDialogProps, "open">): ReactElement {
  const [emails, setEmails] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
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
      const inviteUrl = await onInvite(validEmails);
      if (inviteUrl) {
        setInviteResult({ inviteUrl });
      } else {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasValidEmail = emails.some(
    (email) => email.trim() && email.includes("@"),
  );

  // Show invite URL result view
  if (inviteResult) {
    return (
      <div className="flex min-h-0 flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Invitation Created</DialogTitle>
          <DialogDescription>
            Share this link with the invitee. The link expires after use.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
          <span className="flex-1 truncate font-mono text-xs">
            {inviteResult.inviteUrl}
          </span>
          <CopyButton text={inviteResult.inviteUrl} />
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </div>
    );
  }

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
          <Label>Email</Label>
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
                      <IconX className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add another email link */}
        <button
          type="button"
          onClick={handleAddEmail}
          className="focus-visible:ring-ring inline-flex w-fit items-center gap-1 rounded-sm px-1 py-0.5 text-sm text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2"
        >
          <IconPlus className="size-4" />
          Add another email
        </button>

        {/* Divider with "Or" */}
        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">Or</span>
          <Separator className="flex-1" />
        </div>

        {/* CSV buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadSample}
          >
            <IconDownload className="size-4" />
            Download a sample CSV file
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUploadClick}
          >
            <IconUpload className="size-4" />
            Upload CSV file
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
          {isSubmitting ? "Inviting…" : "Invite"}
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
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-md">
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
