"use client";

import type { UIEvent, ReactElement } from "react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TERMS_AND_CONDITIONS_SECTIONS,
  TERMS_AND_CONDITIONS_VERSION,
} from "@/lib/terms-and-conditions";

interface TermsAndConditionsDialogProps {
  readonly open: boolean;
  readonly required: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onAccept: () => void;
}

const isScrolledToEnd = (element: HTMLElement): boolean =>
  element.scrollTop + element.clientHeight >= element.scrollHeight - 4;

export function TermsAndConditionsDialog({
  open,
  required,
  onOpenChange,
  onAccept,
}: TermsAndConditionsDialogProps): ReactElement {
  const [readToEnd, setReadToEnd] = useState(false);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (required && !nextOpen) {
        return;
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, required],
  );

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    if (isScrolledToEnd(event.currentTarget)) {
      setReadToEnd(true);
    }
  }, []);

  const handleAccept = useCallback(() => {
    if (required && !readToEnd) {
      return;
    }
    setReadToEnd(false);
    onAccept();
  }, [onAccept, readToEnd, required]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={!required}
        onEscapeKeyDown={(event) => {
          if (required) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (required) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="px-4 pb-3 pt-4">
          <DialogTitle>Terms and Conditions</DialogTitle>
          <DialogDescription>
            Review the department-wide signage policy before continuing.
          </DialogDescription>
        </DialogHeader>

        <div className="border-t border-border" aria-hidden="true" />

        <div
          data-testid="terms-scroll-area"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm/6"
          onScroll={handleScroll}
        >
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs/5 text-muted-foreground">
            Version {TERMS_AND_CONDITIONS_VERSION}. These terms explain proper
            system use, content expectations, auditing, and cleanup behavior.
          </div>

          {TERMS_AND_CONDITIONS_SECTIONS.map((section) => (
            <section key={section.title} className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                {section.title}
              </h3>
              <div className="space-y-2 text-muted-foreground">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <DialogFooter className="items-center border-t border-border px-4 py-3 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {required && !readToEnd
              ? "Read to the end to continue."
              : "You can reopen these terms from the account menu."}
          </p>
          {required ? (
            <Button onClick={handleAccept} disabled={!readToEnd}>
              Accept and Continue
            </Button>
          ) : (
            <Button
              onClick={() => {
                setReadToEnd(false);
                onOpenChange(false);
              }}
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
