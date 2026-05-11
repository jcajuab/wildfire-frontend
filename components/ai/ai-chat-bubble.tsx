"use client";

import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
} from "react";
import { useEffect, useRef, useState } from "react";
import { IconMessageChatbot, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/use-can";
import { useLazyGetAICredentialsQuery } from "@/lib/api/ai-credentials-api";

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
const DEFAULT_OFFSET_Y = 88;
const MIN_OFFSET_Y = 24;
const TOP_PAD = 16;
const PANEL_MIN_HEIGHT = 280;
const STORAGE_KEY = "wildfire:ai-chat-bubble-y:v2";

interface DragState {
  readonly pointerId: number;
  readonly startY: number;
  readonly startOffsetY: number;
  moved: boolean;
}

interface PanelLayout {
  readonly placement: "above" | "below";
  readonly height: number;
}

function clampOffsetY(offsetY: number): number {
  if (typeof window === "undefined") return DEFAULT_OFFSET_Y;
  const maxOffsetY = Math.max(
    MIN_OFFSET_Y,
    window.innerHeight - BUTTON_H - TOP_PAD,
  );
  return Math.min(Math.max(offsetY, MIN_OFFSET_Y), maxOffsetY);
}

function getPanelLayout(offsetY: number): PanelLayout {
  if (typeof window === "undefined") {
    return { placement: "above", height: PANEL_HEIGHT_MAX };
  }

  const buttonTop = window.innerHeight - offsetY - BUTTON_H;
  const spaceAbove = buttonTop - TOP_PAD - GAP;
  const spaceBelow = offsetY - TOP_PAD - GAP;
  const placement =
    spaceAbove >= PANEL_MIN_HEIGHT || spaceAbove >= spaceBelow
      ? "above"
      : "below";
  const available = Math.max(
    0,
    placement === "above" ? spaceAbove : spaceBelow,
  );

  return {
    placement,
    height: Math.max(PANEL_MIN_HEIGHT, Math.min(PANEL_HEIGHT_MAX, available)),
  };
}

function showMissingCredentialsToast(): void {
  toast.error("Please provide an API key in Settings first.", {
    description: "Go to Settings > AI Provider Credentials to configure.",
    duration: 5000,
  });
}

export function AIChatBubble(): ReactElement {
  const canUseAI = useCan("ai:access");
  const [isOpen, setIsOpen] = useState(false);
  const [offsetY, setOffsetY] = useState(DEFAULT_OFFSET_Y);
  const [triggerGetCredentials, { isFetching }] =
    useLazyGetAICredentialsQuery();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const stored = Number(window.localStorage.getItem(STORAGE_KEY));
      if (Number.isFinite(stored)) {
        setOffsetY(clampOffsetY(stored));
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    function update(): void {
      setOffsetY((current) => {
        const next = clampOffsetY(current);
        window.localStorage.setItem(STORAGE_KEY, String(next));
        return next;
      });
    }
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

  if (!canUseAI) return <></>;

  const updateOffsetY = (nextOffsetY: number): void => {
    const clamped = clampOffsetY(nextOffsetY);
    setOffsetY(clamped);
    window.localStorage.setItem(STORAGE_KEY, String(clamped));
  };

  const moveOffsetY = (delta: number): void => {
    updateOffsetY(offsetY + delta);
  };

  const panelLayout = getPanelLayout(offsetY);
  const panelStyle: CSSProperties =
    panelLayout.placement === "above"
      ? { bottom: BUTTON_H + GAP, height: panelLayout.height }
      : { top: BUTTON_H + GAP, height: panelLayout.height };

  const handleKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ): void => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveOffsetY(16);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveOffsetY(-16);
    }
  };

  return (
    <div
      className="fixed right-6 z-50"
      style={{ bottom: offsetY }}
      aria-label="AI assistant"
    >
      {isOpen && (
        <div
          className="absolute right-0 flex w-[calc(100vw-3rem)] max-w-[420px] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl duration-150 ease-out animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none"
          style={panelStyle}
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
        disabled={isFetching}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          dragStateRef.current = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startOffsetY: offsetY,
            moved: false,
          };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const dragState = dragStateRef.current;
          if (!dragState || dragState.pointerId !== event.pointerId) return;
          const deltaY = dragState.startY - event.clientY;
          if (Math.abs(deltaY) > 3) {
            dragState.moved = true;
          }
          updateOffsetY(dragState.startOffsetY + deltaY);
        }}
        onPointerUp={(event) => {
          const dragState = dragStateRef.current;
          if (!dragState || dragState.pointerId !== event.pointerId) return;
          event.currentTarget.releasePointerCapture?.(event.pointerId);
          dragStateRef.current = null;
          if (dragState.moved) {
            suppressClickRef.current = true;
            window.setTimeout(() => {
              suppressClickRef.current = false;
            }, 0);
          }
        }}
        onPointerCancel={(event) => {
          event.currentTarget.releasePointerCapture?.(event.pointerId);
          dragStateRef.current = null;
        }}
        onClick={async () => {
          if (suppressClickRef.current) return;
          if (isOpen) {
            setIsOpen(false);
            return;
          }
          try {
            const credentials = await triggerGetCredentials(
              undefined,
              true,
            ).unwrap();
            if (credentials.length === 0) {
              showMissingCredentialsToast();
              return;
            }
            setIsOpen(true);
          } catch {
            showMissingCredentialsToast();
          }
        }}
        className="size-14 rounded-full shadow-lg"
        style={{ touchAction: "none" }}
      >
        <IconMessageChatbot className="size-6" />
      </Button>
    </div>
  );
}
