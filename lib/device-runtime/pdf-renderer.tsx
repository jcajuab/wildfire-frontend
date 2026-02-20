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
  readonly onMeasuredHeight: (height: number) => void;
}

export function PdfRenderer({
  src,
  viewportWidth,
  onMeasuredHeight,
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
      let totalHeight = 0;

      for (
        let pageNumber = 1;
        pageNumber <= pdfDocument.numPages;
        pageNumber += 1
      ) {
        const page = await pdfDocument.getPage(pageNumber);
        const initialViewport = page.getViewport({ scale: 1 });
        const scale = viewportWidth / initialViewport.width;
        const viewport = page.getViewport({ scale });
        const canvas = window.document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          continue;
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
        totalHeight += viewport.height;
        container.append(canvas);
      }

      if (!cancelled) {
        onMeasuredHeight(Math.ceil(totalHeight));
      }
    };

    void render().catch(() => {
      if (!cancelled) {
        onMeasuredHeight(0);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [onMeasuredHeight, src, viewportWidth]);

  return (
    <div
      ref={containerRef}
      className="w-full pointer-events-none select-none"
    />
  );
}
