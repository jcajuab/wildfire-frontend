"use client";

import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { IconMessageChatbot, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAICredentials } from "@/hooks/use-ai-credentials";
import { AIChat } from "@/components/ai/ai-chat";

const PANEL_HEIGHT_MAX = 600;
const GAP = 12; // Tailwind gap-3
const BUTTON_H = 56; // Tailwind size-14
const BOTTOM_M = 24; // Tailwind bottom-6
const TOP_PAD = 16; // breathing room at top

export function AIChatBubble(): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(PANEL_HEIGHT_MAX);
  const y = useMotionValue(0);
  const { refetch: refetchCredentials } = useAICredentials();
  const prefersReducedMotion = useReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const draggedRef = useRef(false);
  const [dragConstraints, setDragConstraints] = useState({
    top: -500,
    bottom: 0,
  });

  useEffect(() => {
    function update() {
      const vh = window.innerHeight;
      // Max panel height that fits on screen with zero drag
      const available = vh - BOTTOM_M - GAP - BUTTON_H - TOP_PAD;
      const ph = Math.max(0, Math.min(PANEL_HEIGHT_MAX, available));
      setPanelHeight(ph);

      const maxUp = isOpen
        ? -(vh - ph - GAP - BUTTON_H - BOTTOM_M - TOP_PAD) // ≥ 0 when panel fills screen
        : -(vh - BUTTON_H - BOTTOM_M - TOP_PAD); // full range while closed

      const top = Math.min(0, maxUp); // never positive
      setDragConstraints({ top, bottom: 0 });

      // Clamp current position into new bounds (e.g. bubble was near top, chat just opened)
      if (y.get() < top) {
        void animate(y, top, { type: "spring", stiffness: 400, damping: 30 });
      }
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [isOpen, y]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  const panelMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        transition: { duration: 0.15, ease: "easeOut" as const },
      };

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
      drag="y"
      dragConstraints={dragConstraints}
      dragElastic={0.1}
      dragTransition={{
        power: 0.08,
        timeConstant: 120,
        bounceStiffness: 400,
        bounceDamping: 25,
      }}
      style={{ y, touchAction: "none" }}
      onDragStart={() => {
        draggedRef.current = false;
      }}
      onDrag={(_, info) => {
        if (Math.abs(info.offset.y) > 5) draggedRef.current = true;
      }}
      onDragEnd={() => {
        requestAnimationFrame(() => {
          draggedRef.current = false;
        });
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl sm:w-[420px]"
            style={{ height: panelHeight }}
            {...panelMotionProps}
            role="dialog"
            aria-label="WILDFIRE AI"
            aria-modal="true"
            onPointerDown={(e) => e.stopPropagation()}
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
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="button"
        aria-label="Open WILDFIRE AI"
        aria-expanded={isOpen}
        onClick={() => {
          if (draggedRef.current) return;
          if (isOpen) {
            setIsOpen(false);
            return;
          }
          void refetchCredentials().then((fresh) => {
            if (fresh.length === 0) {
              toast.error("Please provide an API key in Settings first.", {
                description:
                  "Go to Settings > AI Provider Credentials to configure.",
                duration: 5000,
              });
              return;
            }
            setIsOpen(true);
          });
        }}
        className="size-14 rounded-full shadow-lg"
      >
        <IconMessageChatbot className="size-6" />
      </Button>
    </motion.div>
  );
}
