"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  filterCommands,
  groupByCategory,
  type SlashCommand,
} from "@/lib/slash-commands";

interface SlashCommandMenuProps {
  query: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  visible: boolean;
}

export function SlashCommandMenu({
  query,
  onSelect,
  onClose,
  visible,
}: SlashCommandMenuProps) {
  // activeIndex resets to 0 whenever query changes by pairing them in state
  const [{ activeIndex, indexedQuery }, setIndexState] = useState({
    activeIndex: 0,
    indexedQuery: query,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = filterCommands(query);
  const grouped = groupByCategory(filtered);
  const flatList = filtered;

  // When query changes, derive reset during render (not in effect)
  const resolvedIndex = indexedQuery !== query ? 0 : activeIndex;

  useEffect(() => {
    if (!visible) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndexState((prev) => ({
          activeIndex: (prev.activeIndex + 1) % flatList.length,
          indexedQuery: query,
        }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndexState((prev) => ({
          activeIndex:
            (prev.activeIndex - 1 + flatList.length) % flatList.length,
          indexedQuery: query,
        }));
      } else if (e.key === "Enter" && flatList.length > 0) {
        e.preventDefault();
        onSelect(flatList[resolvedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, resolvedIndex, flatList, onSelect, onClose, query]);

  // Scroll active item into view
  useEffect(() => {
    if (!visible || !menuRef.current) return;
    const active = menuRef.current.querySelector<HTMLElement>(
      `[data-index="${String(resolvedIndex)}"]`,
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [visible, resolvedIndex]);

  if (!visible || flatList.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 z-50 mb-1 max-h-64 w-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md"
      role="listbox"
    >
      {Object.entries(grouped).map(([category, commands]) => (
        <div key={category}>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            {category}
          </div>
          {commands.map((cmd) => {
            const globalIdx = flatList.indexOf(cmd);
            return (
              <button
                key={cmd.id}
                type="button"
                role="option"
                data-index={globalIdx}
                aria-selected={globalIdx === resolvedIndex}
                className={cn(
                  "flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm",
                  globalIdx === resolvedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50",
                )}
                onClick={() => onSelect(cmd)}
                onMouseEnter={() =>
                  setIndexState({ activeIndex: globalIdx, indexedQuery: query })
                }
              >
                <span className="font-medium">/{cmd.id}</span>
                <span className="text-xs text-muted-foreground">
                  {cmd.description}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
