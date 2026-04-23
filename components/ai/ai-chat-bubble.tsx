"use client";

import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { IconMessageChatbot, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { useGetAICredentialsQuery } from "@/lib/api/ai-credentials-api";

const AIChat = dynamic(
  () => import("@/components/ai/ai-chat").then((m) => m.AIChat),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading chat…</span>
      </div>
    ),
  },
);

const PANEL_HEIGHT_MAX = 600;
const GAP = 12;
const BUTTON_H = 56;
const BOTTOM_M = 24;
const TOP_PAD = 16;

export function AIChatBubble(): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(PANEL_HEIGHT_MAX);
  const { data: credentials = [], isFetching } = useGetAICredentialsQuery(
    undefined,
    { skip: !shouldFetch },
  );
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-open after credentials load on first click
  useEffect(() => {
    if (!pendingOpen || isFetching) return;
    setPendingOpen(false);
    if (credentials.length === 0) {
      toast.error("Please provide an API key in Settings first.", {
        description: "Go to Settings > AI Provider Credentials to configure.",
        duration: 5000,
      });
      return;
    }
    setIsOpen(true);
  }, [pendingOpen, isFetching, credentials]);

  useEffect(() => {
    function update() {
      const vh = window.innerHeight;
      const available = vh - BOTTOM_M - GAP - BUTTON_H - TOP_PAD;
      setPanelHeight(Math.max(0, Math.min(PANEL_HEIGHT_MAX, available)));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div
          className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl duration-150 ease-out animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none sm:w-[420px]"
          style={{ height: panelHeight }}
          role="dialog"
          aria-label="WILDFIRE AI"
          aria-modal="true"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">WILDFIRE AI</span>
            <Button
              ref={closeButtonRef}
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close WILDFIRE AI"
              onClick={() => setIsOpen(false)}
            >
              <IconX className="size-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <AIChat />
          </div>
        </div>
      )}

      <Button
        type="button"
        aria-label="Open WILDFIRE AI"
        aria-expanded={isOpen}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            return;
          }
          if (!shouldFetch) {
            setShouldFetch(true);
            setPendingOpen(true);
            return;
          }
          if (credentials.length === 0) {
            toast.error("Please provide an API key in Settings first.", {
              description:
                "Go to Settings > AI Provider Credentials to configure.",
              duration: 5000,
            });
            return;
          }
          setIsOpen(true);
        }}
        className="size-14 rounded-full shadow-lg"
      >
        <IconMessageChatbot className="size-6" />
      </Button>
    </div>
  );
}
