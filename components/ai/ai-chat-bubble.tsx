"use client";

import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IconMessageChatbot, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { AIChat } from "@/components/ai/ai-chat";

export function AIChatBubble(): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl sm:w-[420px]"
            style={{ height: "600px" }}
            {...panelMotionProps}
            role="dialog"
            aria-label="AI Assistant"
            aria-modal="true"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">AI Assistant</span>
              <Button
                ref={closeButtonRef}
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close AI Assistant"
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
        aria-label="Open AI Assistant"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="size-14 rounded-full shadow-lg"
      >
        <IconMessageChatbot className="size-6" />
      </Button>
    </div>
  );
}
