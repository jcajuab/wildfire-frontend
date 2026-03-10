"use client";

import { useCallback, useState } from "react";
import type { Content } from "@/types/content";

const DEFAULT_PDF_EXPAND_MODE = "single" as const;

type PdfExpandMode = "single" | "multi";

export interface PdfExpansionState {
  readonly expandedPdfParentIds: string[];
  readonly handleTogglePdfExpand: (
    content: Content,
    onExpand?: (parentId: string) => void,
  ) => void;
}

/**
 * Manages PDF expansion state (which PDFs are currently expanded).
 * Supports single and multi-expand modes.
 */
export function usePdfExpansionState(): PdfExpansionState {
  const [expandedPdfParentIds, setExpandedPdfParentIds] = useState<string[]>(
    [],
  );
  const pdfExpandMode: PdfExpandMode = DEFAULT_PDF_EXPAND_MODE;

  const handleTogglePdfExpand = useCallback(
    (content: Content, onExpand?: (parentId: string) => void) => {
      if (
        content.type !== "PDF" ||
        content.kind !== "ROOT" ||
        content.status !== "READY"
      ) {
        return;
      }

      setExpandedPdfParentIds((previous) => {
        const isExpanded = previous.includes(content.id);

        // Call onExpand for newly expanded items
        if (!isExpanded) {
          // Schedule onExpand after state update
          setTimeout(() => onExpand?.(content.id), 0);
        }

        if (isExpanded) {
          return previous.filter((id) => id !== content.id);
        }

        if (pdfExpandMode === "single") {
          return [content.id];
        }
        return [...previous, content.id];
      });
    },
    [pdfExpandMode],
  );

  return {
    expandedPdfParentIds,
    handleTogglePdfExpand,
  };
}
