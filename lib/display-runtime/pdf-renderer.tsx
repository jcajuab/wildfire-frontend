"use client";

import { useEffect, useRef } from "react";
import {
  GlobalWorkerOptions,
  getDocument,
} from "pdfjs-dist/legacy/build/pdf.mjs";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url,
).toString();

interface PdfRendererProps {
  readonly src: string;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
}

export function PdfRenderer({
  src,
  viewportWidth,
  viewportHeight,
}: PdfRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container || viewportWidth <= 0) {
      return;
    }

    const render = async () => {
      container.replaceChildren();
      const loadingTask = getDocument(src);
      const pdfDocument = await loadingTask.promise;
      const page = await pdfDocument.getPage(1);
      const initialViewport = page.getViewport({ scale: 1 });
      const scale = viewportWidth / initialViewport.width;
      const viewport = page.getViewport({ scale });
      const canvas = window.document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      canvas.style.display = "block";
      canvas.style.pointerEvents = "none";

      await page.render({
        canvas,
        canvasContext: context,
        viewport,
      }).promise;
      if (cancelled) {
        return;
      }
      container.append(canvas);
    };

    void render().catch(() => {
      if (cancelled) {
        return;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src, viewportWidth]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none w-full select-none overflow-hidden"
      style={{ height: `${viewportHeight}px` }}
    />
  );
}
