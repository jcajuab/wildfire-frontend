"use client";

import {
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  GlobalWorkerOptions,
  getDocument,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCrop,
  IconTrash,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url,
).toString();

const ASPECT_RATIO = 16 / 9;

export interface PdfPageMeta {
  pageNumber: number;
  width: number;
  height: number;
}

export interface CropRegion {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfCropEditorProps {
  pdfUrl: string;
  pages: PdfPageMeta[];
  filename: string;
  onSubmit: (regions: CropRegion[]) => void;
  onCancel: () => void;
}

interface DraftRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface PageCropRegion extends CropRegion {
  id: string;
}

function computeConstrainedRect(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  containerWidth: number,
  containerHeight: number,
): { x: number; y: number; width: number; height: number } | null {
  const rawDx = currentX - startX;
  const rawDy = currentY - startY;

  if (Math.abs(rawDx) < 4 && Math.abs(rawDy) < 4) return null;

  let width: number;
  let height: number;

  if (Math.abs(rawDx) >= Math.abs(rawDy) * ASPECT_RATIO) {
    width = Math.abs(rawDx);
    height = width / ASPECT_RATIO;
  } else {
    height = Math.abs(rawDy);
    width = height * ASPECT_RATIO;
  }

  const x = rawDx >= 0 ? startX : startX - width;
  const y = rawDy >= 0 ? startY : startY - height;

  const clampedX = Math.max(0, Math.min(x, containerWidth - width));
  const clampedY = Math.max(0, Math.min(y, containerHeight - height));
  const clampedWidth = Math.min(width, containerWidth - clampedX);
  const clampedHeight = Math.min(
    clampedWidth / ASPECT_RATIO,
    containerHeight - clampedY,
  );
  const finalWidth = clampedHeight * ASPECT_RATIO;

  if (finalWidth < 16 || clampedHeight < 9) return null;

  return {
    x: clampedX,
    y: clampedY,
    width: finalWidth,
    height: clampedHeight,
  };
}

let regionIdCounter = 0;
function makeRegionId(): string {
  regionIdCounter += 1;
  return `region-${regionIdCounter}`;
}

/**
 * Renders a single PDF page onto a canvas and returns it.
 */
async function renderPageToCanvas(
  pdfUrl: string,
  pageNumber: number,
  maxWidth: number,
  maxHeight: number,
): Promise<{ canvas: HTMLCanvasElement; scale: number } | null> {
  const loadingTask = getDocument(pdfUrl);
  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(pageNumber);
  const initialViewport = page.getViewport({ scale: 1 });

  // Scale to fit within maxWidth/maxHeight while preserving aspect ratio
  const scaleX = maxWidth / initialViewport.width;
  const scaleY = maxHeight / initialViewport.height;
  const scale = Math.min(scaleX, scaleY);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return null;

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return { canvas, scale };
}

/**
 * Renders a thumbnail-sized canvas for the sidebar.
 */
async function renderThumbnail(
  pdfUrl: string,
  pageNumber: number,
): Promise<string | null> {
  const result = await renderPageToCanvas(pdfUrl, pageNumber, 120, 160);
  if (!result) return null;
  return result.canvas.toDataURL("image/jpeg", 0.6);
}

export function PdfCropEditor({
  pdfUrl,
  pages,
  filename,
  onSubmit,
  onCancel,
}: PdfCropEditorProps): ReactElement {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [regionsByPage, setRegionsByPage] = useState<
    Record<number, PageCropRegion[]>
  >({});
  const [draft, setDraft] = useState<DraftRect | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});

  const currentPage = pages[currentPageIndex];
  const currentPageNumber = currentPage?.pageNumber ?? 1;
  const currentRegions = regionsByPage[currentPageNumber] ?? [];

  const totalRegions = Object.values(regionsByPage).reduce(
    (sum, regions) => sum + regions.length,
    0,
  );
  const canSubmit = totalRegions > 0;

  // Render the current page to canvas
  useEffect(() => {
    let cancelled = false;
    const container = canvasContainerRef.current;
    const area = canvasAreaRef.current;
    if (!container || !area || !currentPage) return;

    const areaRect = area.getBoundingClientRect();
    const maxW = Math.floor(areaRect.width) - 4;
    const maxH = Math.floor(areaRect.height) - 4;

    void renderPageToCanvas(pdfUrl, currentPage.pageNumber, maxW, maxH).then(
      (result) => {
        if (cancelled || !result) return;
        container.replaceChildren();
        const { canvas } = result;
        canvas.style.display = "block";
        canvas.style.pointerEvents = "none";
        container.appendChild(canvas);
        setCanvasSize({ width: canvas.width, height: canvas.height });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, currentPage]);

  // Load thumbnails for sidebar
  useEffect(() => {
    if (pages.length <= 1) return;
    let cancelled = false;
    for (const page of pages) {
      if (thumbnails[page.pageNumber]) continue;
      void renderThumbnail(pdfUrl, page.pageNumber).then((dataUrl) => {
        if (cancelled || !dataUrl) return;
        setThumbnails((prev) => ({ ...prev, [page.pageNumber]: dataUrl }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [pdfUrl, pages, thumbnails]);

  const getRelativeCoords = useCallback(
    (event: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
      const el = overlayRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const clientX =
        "touches" in event ? event.touches[0].clientX : event.clientX;
      const clientY =
        "touches" in event ? event.touches[0].clientY : event.clientY;
      return {
        x: Math.max(0, Math.min(clientX - rect.left, canvasSize.width)),
        y: Math.max(0, Math.min(clientY - rect.top, canvasSize.height)),
      };
    },
    [canvasSize],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const { x, y } = getRelativeCoords(event);
      setDraft({ startX: x, startY: y, endX: x, endY: y });
      setIsDrawing(true);
    },
    [getRelativeCoords],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!isDrawing || !draft) return;
      const { x, y } = getRelativeCoords(event);
      setDraft((prev) => (prev ? { ...prev, endX: x, endY: y } : prev));
    },
    [isDrawing, draft, getRelativeCoords],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !draft || !currentPage) return;
    setIsDrawing(false);

    const rect = computeConstrainedRect(
      draft.startX,
      draft.startY,
      draft.endX,
      draft.endY,
      canvasSize.width,
      canvasSize.height,
    );

    if (!rect) {
      setDraft(null);
      return;
    }

    const scaleX = currentPage.width / canvasSize.width;
    const scaleY = currentPage.height / canvasSize.height;

    const newRegion: PageCropRegion = {
      id: makeRegionId(),
      pageNumber: currentPageNumber,
      x: rect.x * scaleX,
      y: rect.y * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY,
    };

    setRegionsByPage((prev) => ({
      ...prev,
      [currentPageNumber]: [...(prev[currentPageNumber] ?? []), newRegion],
    }));
    setDraft(null);
  }, [isDrawing, draft, currentPage, canvasSize, currentPageNumber]);

  const handleMouseLeave = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      setDraft(null);
    }
  }, [isDrawing]);

  const handleDeleteRegion = useCallback(
    (regionId: string) => {
      setRegionsByPage((prev) => ({
        ...prev,
        [currentPageNumber]: (prev[currentPageNumber] ?? []).filter(
          (r) => r.id !== regionId,
        ),
      }));
    },
    [currentPageNumber],
  );

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    const allRegions: CropRegion[] = Object.values(regionsByPage)
      .flat()
      .map((r) => ({
        pageNumber: r.pageNumber,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      }));
    onSubmit(allRegions);
  }, [canSubmit, regionsByPage, onSubmit]);

  const draftRect =
    draft && canvasSize.width > 0
      ? computeConstrainedRect(
          draft.startX,
          draft.startY,
          draft.endX,
          draft.endY,
          canvasSize.width,
          canvasSize.height,
        )
      : null;

  if (!currentPage) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No pages available.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{filename}</h2>
          <p className="text-sm text-muted-foreground">
            Draw 16:9 crop regions on each page. Each region becomes an
            independent image.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <IconCrop className="size-3.5" />
            Click and drag to crop
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Page thumbnail sidebar */}
        {pages.length > 1 && (
          <div className="flex w-24 shrink-0 flex-col gap-2 overflow-y-auto">
            {pages.map((page, index) => {
              const pageRegions = regionsByPage[page.pageNumber] ?? [];
              const isActive = index === currentPageIndex;
              const thumb = thumbnails[page.pageNumber];
              return (
                <button
                  key={page.pageNumber}
                  type="button"
                  onClick={() => setCurrentPageIndex(index)}
                  className={cn(
                    "relative rounded-md border-2 overflow-hidden transition-colors",
                    isActive
                      ? "border-primary"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="aspect-[3/4] relative w-full bg-muted">
                    {thumb ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- data URL from canvas, not a remote image */
                      <img
                        src={thumb}
                        alt={`Page ${page.pageNumber}`}
                        className="absolute inset-0 h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        Loading...
                      </div>
                    )}
                  </div>
                  <div className="bg-card px-1 py-0.5 text-center text-xs font-medium">
                    {page.pageNumber}
                  </div>
                  {pageRegions.length > 0 && (
                    <div className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {pageRegions.length}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Main canvas area */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Page nav */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setCurrentPageIndex((i) => Math.max(0, i - 1))}
                disabled={currentPageIndex === 0}
              >
                <IconChevronLeft className="size-4" />
              </Button>
              <span className="text-sm font-medium">
                Page {currentPage.pageNumber} of {pages.length}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() =>
                  setCurrentPageIndex((i) => Math.min(pages.length - 1, i + 1))
                }
                disabled={currentPageIndex === pages.length - 1}
              >
                <IconChevronRight className="size-4" />
              </Button>
            </div>
            {currentRegions.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {currentRegions.length} crop
                {currentRegions.length !== 1 ? "s" : ""} on this page
              </span>
            )}
          </div>

          {/* PDF canvas + crop overlay */}
          <div
            ref={canvasAreaRef}
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/50"
          >
            <div className="relative inline-block">
              {/* Canvas container — pdfjs renders into this */}
              <div ref={canvasContainerRef} className="relative" />

              {/* SVG overlay for crop regions — matches canvas size exactly */}
              {canvasSize.width > 0 && (
                <div
                  ref={overlayRef}
                  className="absolute inset-0 cursor-crosshair select-none"
                  style={{
                    width: canvasSize.width,
                    height: canvasSize.height,
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                >
                  <svg className="absolute inset-0 h-full w-full pointer-events-none">
                    {/* Dim mask with cutouts */}
                    <defs>
                      <mask id={`crop-mask-${currentPageNumber}`}>
                        <rect width="100%" height="100%" fill="white" />
                        {currentRegions.map((region) => {
                          const sx = canvasSize.width / currentPage.width;
                          const sy = canvasSize.height / currentPage.height;
                          return (
                            <rect
                              key={region.id}
                              x={region.x * sx}
                              y={region.y * sy}
                              width={region.width * sx}
                              height={region.height * sy}
                              fill="black"
                            />
                          );
                        })}
                        {draftRect && (
                          <rect
                            x={draftRect.x}
                            y={draftRect.y}
                            width={draftRect.width}
                            height={draftRect.height}
                            fill="black"
                          />
                        )}
                      </mask>
                    </defs>

                    {(currentRegions.length > 0 || draftRect) && (
                      <rect
                        width="100%"
                        height="100%"
                        fill="rgba(0,0,0,0.4)"
                        mask={`url(#crop-mask-${currentPageNumber})`}
                      />
                    )}

                    {/* Existing crop borders */}
                    {currentRegions.map((region, index) => {
                      const sx = canvasSize.width / currentPage.width;
                      const sy = canvasSize.height / currentPage.height;
                      const px = region.x * sx;
                      const py = region.y * sy;
                      const pw = region.width * sx;
                      const ph = region.height * sy;
                      return (
                        <g key={region.id}>
                          <rect
                            x={px}
                            y={py}
                            width={pw}
                            height={ph}
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                          />
                          <rect
                            x={px + 2}
                            y={py + 2}
                            width={20}
                            height={20}
                            rx={4}
                            fill="hsl(var(--primary))"
                          />
                          <text
                            x={px + 12}
                            y={py + 15}
                            textAnchor="middle"
                            fontSize={11}
                            fontWeight="bold"
                            fill="hsl(var(--primary-foreground))"
                          >
                            {index + 1}
                          </text>
                        </g>
                      );
                    })}

                    {/* Draft rectangle */}
                    {draftRect && (
                      <rect
                        x={draftRect.x}
                        y={draftRect.y}
                        width={draftRect.width}
                        height={draftRect.height}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                      />
                    )}
                  </svg>

                  {/* Delete buttons */}
                  {currentRegions.map((region) => {
                    const sx = canvasSize.width / currentPage.width;
                    const sy = canvasSize.height / currentPage.height;
                    const px = region.x * sx;
                    const py = region.y * sy;
                    const pw = region.width * sx;
                    return (
                      <button
                        key={`del-${region.id}`}
                        type="button"
                        className="absolute flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow hover:bg-destructive/80 transition-colors pointer-events-auto"
                        style={{
                          left: px + pw - 12,
                          top: py - 12,
                          zIndex: 20,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRegion(region.id);
                        }}
                      >
                        <IconTrash className="size-3" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {totalRegions === 0
            ? "Draw at least one crop region to continue."
            : `${totalRegions} crop region${totalRegions !== 1 ? "s" : ""} total across all pages.`}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            <IconCrop className="size-4" />
            Submit Crops
          </Button>
        </div>
      </div>
    </div>
  );
}
