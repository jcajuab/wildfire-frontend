"use client";

import {
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  GlobalWorkerOptions,
  getDocument,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCrop,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url,
).toString();

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
  contentName?: string;
  onSubmit: (regions: CropRegion[]) => void;
  onCancel: () => void;
}

interface CollectedCrop extends CropRegion {
  id: string;
  previewDataUrl: string;
}

/* ------------------------------------------------------------------ */
/*  State machine types                                                */
/* ------------------------------------------------------------------ */

type Corner = "tl" | "tr" | "bl" | "br";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type CropMode =
  | { mode: "idle" }
  | {
      mode: "drawing";
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
    }
  | {
      mode: "editing";
      rect: Rect;
      drag:
        | null
        | { type: "move"; offsetX: number; offsetY: number }
        | {
            type: "resize";
            corner: Corner;
            anchorX: number;
            anchorY: number;
            initialAspectRatio: number;
          };
    };

type CropAction =
  | { type: "START_DRAW"; x: number; y: number }
  | { type: "UPDATE_DRAW"; x: number; y: number }
  | {
      type: "FINISH_DRAW";
      containerWidth: number;
      containerHeight: number;
    }
  | { type: "START_MOVE"; offsetX: number; offsetY: number }
  | {
      type: "START_RESIZE";
      corner: Corner;
      anchorX: number;
      anchorY: number;
      initialAspectRatio: number;
    }
  | {
      type: "UPDATE_DRAG";
      x: number;
      y: number;
      containerWidth: number;
      containerHeight: number;
      shiftKey: boolean;
    }
  | { type: "FINISH_DRAG" }
  | { type: "CONFIRM" }
  | { type: "DISCARD" }
  | { type: "PAGE_CHANGE" };

function cropReducer(state: CropMode, action: CropAction): CropMode {
  switch (action.type) {
    case "START_DRAW": {
      if (state.mode !== "idle") return state;
      return {
        mode: "drawing",
        startX: action.x,
        startY: action.y,
        currentX: action.x,
        currentY: action.y,
      };
    }
    case "UPDATE_DRAW": {
      if (state.mode !== "drawing") return state;
      return { ...state, currentX: action.x, currentY: action.y };
    }
    case "FINISH_DRAW": {
      if (state.mode !== "drawing") return state;
      const rect = computeConstrainedRect(
        state.startX,
        state.startY,
        state.currentX,
        state.currentY,
        action.containerWidth,
        action.containerHeight,
        false,
      );
      if (!rect) return { mode: "idle" };
      return { mode: "editing", rect, drag: null };
    }
    case "START_MOVE": {
      if (state.mode !== "editing") return state;
      return {
        ...state,
        drag: {
          type: "move",
          offsetX: action.offsetX,
          offsetY: action.offsetY,
        },
      };
    }
    case "START_RESIZE": {
      if (state.mode !== "editing") return state;
      return {
        ...state,
        drag: {
          type: "resize",
          corner: action.corner,
          anchorX: action.anchorX,
          anchorY: action.anchorY,
          initialAspectRatio: action.initialAspectRatio,
        },
      };
    }
    case "UPDATE_DRAG": {
      if (state.mode !== "editing" || !state.drag) return state;
      if (state.drag.type === "move") {
        const newX = Math.max(
          0,
          Math.min(
            action.x - state.drag.offsetX,
            action.containerWidth - state.rect.width,
          ),
        );
        const newY = Math.max(
          0,
          Math.min(
            action.y - state.drag.offsetY,
            action.containerHeight - state.rect.height,
          ),
        );
        return {
          ...state,
          rect: { ...state.rect, x: newX, y: newY },
        };
      }
      // resize
      const newRect = computeConstrainedRect(
        state.drag.anchorX,
        state.drag.anchorY,
        action.x,
        action.y,
        action.containerWidth,
        action.containerHeight,
        true,
        action.shiftKey ? state.drag.initialAspectRatio : undefined,
      );
      if (!newRect) return state; // keep previous rect
      return { ...state, rect: newRect };
    }
    case "FINISH_DRAG": {
      if (state.mode !== "editing") return state;
      return { ...state, drag: null };
    }
    case "CONFIRM":
    case "DISCARD":
    case "PAGE_CHANGE": {
      return { mode: "idle" };
    }
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

function computeConstrainedRect(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  containerWidth: number,
  containerHeight: number,
  skipMinDelta: boolean,
  lockAspectRatio?: number,
): Rect | null {
  const rawDx = currentX - startX;
  const rawDy = currentY - startY;

  if (!skipMinDelta && Math.abs(rawDx) < 4 && Math.abs(rawDy) < 4) return null;

  let width: number;
  let height: number;

  if (lockAspectRatio != null && lockAspectRatio > 0) {
    // Constrain to the locked aspect ratio
    if (Math.abs(rawDx) >= Math.abs(rawDy) * lockAspectRatio) {
      width = Math.abs(rawDx);
      height = width / lockAspectRatio;
    } else {
      height = Math.abs(rawDy);
      width = height * lockAspectRatio;
    }
  } else {
    // Free-form: use raw deltas
    width = Math.abs(rawDx);
    height = Math.abs(rawDy);
  }

  const x = rawDx >= 0 ? startX : startX - width;
  const y = rawDy >= 0 ? startY : startY - height;

  const clampedX = Math.max(0, Math.min(x, containerWidth - width));
  const clampedY = Math.max(0, Math.min(y, containerHeight - height));
  const clampedWidth = Math.min(width, containerWidth - clampedX);
  const clampedHeight = Math.min(height, containerHeight - clampedY);

  if (clampedWidth < 16 || clampedHeight < 16) return null;

  return {
    x: clampedX,
    y: clampedY,
    width: clampedWidth,
    height: clampedHeight,
  };
}

function makeCropId(): string {
  return `crop-${crypto.randomUUID()}`;
}

/* ------------------------------------------------------------------ */
/*  PDF rendering helpers                                              */
/* ------------------------------------------------------------------ */

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

async function renderThumbnail(
  pdfUrl: string,
  pageNumber: number,
): Promise<string | null> {
  const result = await renderPageToCanvas(pdfUrl, pageNumber, 120, 160);
  if (!result) return null;
  return result.canvas.toDataURL("image/jpeg", 0.6);
}

function extractCropPreview(
  canvas: HTMLCanvasElement,
  rect: Rect,
): string | null {
  try {
    const offscreen = document.createElement("canvas");
    offscreen.width = Math.round(rect.width);
    offscreen.height = Math.round(rect.height);
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(
      canvas,
      Math.round(rect.x),
      Math.round(rect.y),
      Math.round(rect.width),
      Math.round(rect.height),
      0,
      0,
      offscreen.width,
      offscreen.height,
    );
    return offscreen.toDataURL("image/jpeg", 0.8);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Handle hit-testing                                                 */
/* ------------------------------------------------------------------ */

const HANDLE_SIZE = 12;
const HANDLE_HIT = 14; // slightly larger for easier clicking
const CROP_PADDING = 40; // px of interactive padding around the PDF page

function getCornerPositions(
  rect: Rect,
): Record<Corner, { cx: number; cy: number }> {
  return {
    tl: { cx: rect.x, cy: rect.y },
    tr: { cx: rect.x + rect.width, cy: rect.y },
    bl: { cx: rect.x, cy: rect.y + rect.height },
    br: { cx: rect.x + rect.width, cy: rect.y + rect.height },
  };
}

function getAnchorForCorner(
  rect: Rect,
  corner: Corner,
): { anchorX: number; anchorY: number } {
  const opposite: Record<Corner, Corner> = {
    tl: "br",
    tr: "bl",
    bl: "tr",
    br: "tl",
  };
  const positions = getCornerPositions(rect);
  const opp = positions[opposite[corner]];
  return { anchorX: opp.cx, anchorY: opp.cy };
}

function hitTestCorner(x: number, y: number, rect: Rect): Corner | null {
  const corners = getCornerPositions(rect);
  const half = HANDLE_HIT / 2;
  for (const [corner, pos] of Object.entries(corners) as [
    Corner,
    { cx: number; cy: number },
  ][]) {
    if (Math.abs(x - pos.cx) <= half && Math.abs(y - pos.cy) <= half) {
      return corner;
    }
  }
  return null;
}

function isInsideRect(x: number, y: number, rect: Rect): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

const CORNER_CURSORS: Record<Corner, string> = {
  tl: "nwse-resize",
  tr: "nesw-resize",
  bl: "nesw-resize",
  br: "nwse-resize",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PdfCropEditor({
  pdfUrl,
  pages,
  filename,
  contentName,
  onSubmit,
  onCancel,
}: PdfCropEditorProps): ReactElement {
  const maskId = useId();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [collectedCrops, setCollectedCrops] = useState<CollectedCrop[]>([]);
  const [cropMode, dispatch] = useReducer(cropReducer, { mode: "idle" });
  const [lightboxCropId, setLightboxCropId] = useState<string | null>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});

  const currentPage = pages[currentPageIndex];
  const canSubmit = collectedCrops.length > 0;

  // Auto-discard editing crop on page change
  useEffect(() => {
    dispatch({ type: "PAGE_CHANGE" });
  }, [currentPageIndex]);

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
        mainCanvasRef.current = canvas;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- thumbnails is the state being set; including it would cause an infinite loop
  }, [pdfUrl, pages]);

  // Escape key closes lightbox
  useEffect(() => {
    if (!lightboxCropId) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxCropId(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    // Focus close button for accessibility
    lightboxCloseRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxCropId]);

  const getRelativeCoords = useCallback(
    (event: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
      const el = overlayRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const clientX =
        "touches" in event ? event.touches[0].clientX : event.clientX;
      const clientY =
        "touches" in event ? event.touches[0].clientY : event.clientY;
      // Subtract padding offset so coordinates are relative to the canvas,
      // then clamp to valid canvas bounds.
      return {
        x: Math.max(
          0,
          Math.min(clientX - rect.left - CROP_PADDING, canvasSize.width),
        ),
        y: Math.max(
          0,
          Math.min(clientY - rect.top - CROP_PADDING, canvasSize.height),
        ),
      };
    },
    [canvasSize],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const { x, y } = getRelativeCoords(event);

      if (cropMode.mode === "idle") {
        dispatch({ type: "START_DRAW", x, y });
        return;
      }

      if (cropMode.mode === "editing") {
        // Hit-test corner handles first
        const corner = hitTestCorner(x, y, cropMode.rect);
        if (corner) {
          const { anchorX, anchorY } = getAnchorForCorner(
            cropMode.rect,
            corner,
          );
          dispatch({
            type: "START_RESIZE",
            corner,
            anchorX,
            anchorY,
            initialAspectRatio: cropMode.rect.width / cropMode.rect.height,
          });
          return;
        }
        // Hit-test body for move
        if (isInsideRect(x, y, cropMode.rect)) {
          dispatch({
            type: "START_MOVE",
            offsetX: x - cropMode.rect.x,
            offsetY: y - cropMode.rect.y,
          });
          return;
        }
        // Click outside rect: no-op (user must use discard button)
      }
    },
    [getRelativeCoords, cropMode],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const { x, y } = getRelativeCoords(event);

      if (cropMode.mode === "drawing") {
        dispatch({ type: "UPDATE_DRAW", x, y });
        return;
      }

      if (cropMode.mode === "editing" && cropMode.drag) {
        dispatch({
          type: "UPDATE_DRAG",
          x,
          y,
          containerWidth: canvasSize.width,
          containerHeight: canvasSize.height,
          shiftKey: "shiftKey" in event ? event.shiftKey : false,
        });
      }
    },
    [getRelativeCoords, cropMode, canvasSize],
  );

  const handleMouseUp = useCallback(() => {
    if (cropMode.mode === "drawing") {
      dispatch({
        type: "FINISH_DRAW",
        containerWidth: canvasSize.width,
        containerHeight: canvasSize.height,
      });
      return;
    }
    if (cropMode.mode === "editing" && cropMode.drag) {
      dispatch({ type: "FINISH_DRAG" });
    }
  }, [cropMode, canvasSize]);

  const handleMouseLeave = useCallback(() => {
    // Finish the current operation instead of discarding. The padded overlay
    // gives enough room for edge-to-edge cropping, so leaving the overlay
    // means the user went well beyond the page — treat it like mouseup.
    if (cropMode.mode === "drawing") {
      dispatch({
        type: "FINISH_DRAW",
        containerWidth: canvasSize.width,
        containerHeight: canvasSize.height,
      });
      return;
    }
    if (cropMode.mode === "editing" && cropMode.drag) {
      dispatch({ type: "FINISH_DRAG" });
    }
  }, [cropMode, canvasSize]);

  const handleConfirm = useCallback(() => {
    if (cropMode.mode !== "editing" || !currentPage) return;
    const { rect } = cropMode;

    const canvas = mainCanvasRef.current;
    const previewDataUrl = canvas ? extractCropPreview(canvas, rect) : null;
    if (!previewDataUrl) {
      dispatch({ type: "DISCARD" });
      return;
    }

    const scaleX = currentPage.width / canvasSize.width;
    const scaleY = currentPage.height / canvasSize.height;

    const newCrop: CollectedCrop = {
      id: makeCropId(),
      pageNumber: currentPage.pageNumber,
      x: rect.x * scaleX,
      y: rect.y * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY,
      previewDataUrl,
    };

    setCollectedCrops((prev) => [...prev, newCrop]);
    dispatch({ type: "CONFIRM" });
  }, [cropMode, currentPage, canvasSize]);

  const handleDiscard = useCallback(() => {
    dispatch({ type: "DISCARD" });
  }, []);

  const handleDeleteCrop = useCallback((cropId: string) => {
    setCollectedCrops((prev) => prev.filter((c) => c.id !== cropId));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    const regions: CropRegion[] = collectedCrops.map((c) => ({
      pageNumber: c.pageNumber,
      x: c.x,
      y: c.y,
      width: c.width,
      height: c.height,
    }));
    onSubmit(regions);
  }, [canSubmit, collectedCrops, onSubmit]);

  // Compute the visual draft rect for the drawing state
  const draftRect =
    cropMode.mode === "drawing" && canvasSize.width > 0
      ? computeConstrainedRect(
          cropMode.startX,
          cropMode.startY,
          cropMode.currentX,
          cropMode.currentY,
          canvasSize.width,
          canvasSize.height,
          false,
        )
      : null;

  // Determine active rect for SVG overlay (drawing or editing)
  const activeRect = cropMode.mode === "editing" ? cropMode.rect : draftRect;
  const isEditing = cropMode.mode === "editing";

  // Cursor logic for the overlay
  const overlayCursor = (() => {
    if (cropMode.mode === "editing") {
      if (cropMode.drag?.type === "move") return "grabbing";
      if (cropMode.drag?.type === "resize")
        return CORNER_CURSORS[cropMode.drag.corner];
      return "default";
    }
    return "crosshair";
  })();

  // Lightbox crop
  const lightboxCrop = lightboxCropId
    ? (collectedCrops.find((c) => c.id === lightboxCropId) ?? null)
    : null;

  if (!currentPage) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No pages available.
      </div>
    );
  }

  // Edge-aware button positioning for confirm/discard
  const renderActionButtons = (rect: Rect) => {
    const nearBottom = rect.y + rect.height > canvasSize.height - 40;
    const nearRight = rect.x + rect.width > canvasSize.width - 40;
    const renderInside = nearBottom || nearRight;

    const style: React.CSSProperties = renderInside
      ? {
          position: "absolute",
          top: rect.y + 4 + CROP_PADDING,
          left: rect.x + rect.width - 60 + CROP_PADDING,
        }
      : {
          position: "absolute",
          top: rect.y + rect.height + 4 + CROP_PADDING,
          left: rect.x + rect.width - 56 + CROP_PADDING,
        };

    return (
      <div style={style} className="flex items-center gap-1 z-10">
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleConfirm();
          }}
          className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          aria-label="Confirm crop"
        >
          <IconCheck className="size-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleDiscard();
          }}
          className="flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
          aria-label="Discard crop"
        >
          <IconX className="size-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header using admin layout pattern */}
      <header className="flex flex-col gap-2 border-b border-border bg-muted/20 px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
            {contentName || filename}
          </h1>
          <p className="text-sm text-muted-foreground">
            Draw crop regions on each page. Confirm each crop before drawing the
            next.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            <IconCrop className="size-4" />
            Create
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-4 p-4">
        {/* Left panel: Page thumbnails */}
        {pages.length > 1 && (
          <div className="flex w-24 shrink-0 flex-col gap-2 overflow-y-auto">
            {pages.map((page, index) => {
              const isActive = index === currentPageIndex;
              const thumb = thumbnails[page.pageNumber];
              const cropsOnPage = collectedCrops.filter(
                (c) => c.pageNumber === page.pageNumber,
              ).length;
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
                      /* eslint-disable-next-line @next/next/no-img-element -- data URL from canvas */
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
                  {cropsOnPage > 0 && (
                    <div className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {cropsOnPage}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Center panel: PDF canvas */}
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
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconCrop className="size-3.5" />
              Click and drag to crop
            </div>
          </div>

          {/* PDF canvas + crop overlay */}
          <div
            ref={canvasAreaRef}
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-border bg-neutral-700"
          >
            <div className="relative inline-block">
              <div ref={canvasContainerRef} className="relative" />

              {canvasSize.width > 0 && (
                <div
                  ref={overlayRef}
                  className="absolute select-none"
                  style={{
                    /* Extend the interactive overlay beyond the canvas by
                       CROP_PADDING on each side so users can start cropping
                       from outside the page for reliable edge-to-edge selection. */
                    top: -CROP_PADDING,
                    left: -CROP_PADDING,
                    width: canvasSize.width + CROP_PADDING * 2,
                    height: canvasSize.height + CROP_PADDING * 2,
                    cursor: overlayCursor,
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                >
                  {activeRect && (
                    <svg
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      viewBox={`${-CROP_PADDING} ${-CROP_PADDING} ${canvasSize.width + CROP_PADDING * 2} ${canvasSize.height + CROP_PADDING * 2}`}
                    >
                      <defs>
                        <mask id={maskId}>
                          <rect
                            x={-CROP_PADDING}
                            y={-CROP_PADDING}
                            width={canvasSize.width + CROP_PADDING * 2}
                            height={canvasSize.height + CROP_PADDING * 2}
                            fill="white"
                          />
                          <rect
                            x={activeRect.x}
                            y={activeRect.y}
                            width={activeRect.width}
                            height={activeRect.height}
                            fill="black"
                          />
                        </mask>
                      </defs>
                      <rect
                        x={-CROP_PADDING}
                        y={-CROP_PADDING}
                        width={canvasSize.width + CROP_PADDING * 2}
                        height={canvasSize.height + CROP_PADDING * 2}
                        fill="rgba(0,0,0,0.4)"
                        mask={`url(#${maskId})`}
                      />
                      <rect
                        x={activeRect.x}
                        y={activeRect.y}
                        width={activeRect.width}
                        height={activeRect.height}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        {...(isEditing ? {} : { strokeDasharray: "6 3" })}
                      />
                    </svg>
                  )}

                  {/* Corner handles in editing mode */}
                  {isEditing &&
                    cropMode.mode === "editing" &&
                    (() => {
                      const corners = getCornerPositions(cropMode.rect);
                      return (
                        Object.entries(corners) as [
                          Corner,
                          { cx: number; cy: number },
                        ][]
                      ).map(([corner, pos]) => (
                        <div
                          key={corner}
                          className="pointer-events-auto absolute border-2 border-primary bg-white"
                          style={{
                            width: HANDLE_SIZE,
                            height: HANDLE_SIZE,
                            left: pos.cx - HANDLE_SIZE / 2 + CROP_PADDING,
                            top: pos.cy - HANDLE_SIZE / 2 + CROP_PADDING,
                            cursor: CORNER_CURSORS[corner],
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const { anchorX, anchorY } = getAnchorForCorner(
                              cropMode.rect,
                              corner,
                            );
                            dispatch({
                              type: "START_RESIZE",
                              corner,
                              anchorX,
                              anchorY,
                              initialAspectRatio:
                                cropMode.rect.width / cropMode.rect.height,
                            });
                          }}
                        />
                      ));
                    })()}

                  {/* Confirm/Discard buttons in editing mode */}
                  {isEditing &&
                    cropMode.mode === "editing" &&
                    renderActionButtons(cropMode.rect)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panel: Cropped content */}
        <div className="flex w-56 shrink-0 flex-col gap-3">
          <h3 className="text-sm font-semibold">
            Cropped Content
            {collectedCrops.length > 0 && (
              <span className="ml-1.5 font-normal text-muted-foreground">
                ({collectedCrops.length})
              </span>
            )}
          </h3>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
            {collectedCrops.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Draw a crop region on the PDF to add content items here.
              </p>
            ) : (
              collectedCrops.map((crop, index) => (
                <div
                  key={crop.id}
                  className="group relative cursor-pointer overflow-hidden rounded-md border border-border bg-card"
                  onClick={() => setLightboxCropId(crop.id)}
                >
                  <div className="relative h-28 w-full bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element -- data URL from canvas */}
                    <img
                      src={crop.previewDataUrl}
                      alt={`Crop ${index + 1}`}
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-xs text-muted-foreground">
                      {contentName
                        ? `${contentName} - ${index + 1}`
                        : `Page ${crop.pageNumber} \u00B7 Crop ${index + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCrop(crop.id);
                      }}
                      className="flex items-center justify-center rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      aria-label={`Delete crop ${index + 1}`}
                    >
                      <IconTrash className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxCrop && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setLightboxCropId(null)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL from canvas */}
            <img
              src={lightboxCrop.previewDataUrl}
              alt="Crop preview"
              className="max-h-[80vh] max-w-[80vw] object-contain"
            />
            <button
              ref={lightboxCloseRef}
              type="button"
              onClick={() => setLightboxCropId(null)}
              className="absolute -top-3 -right-3 flex size-7 items-center justify-center rounded-full bg-card text-foreground shadow-md hover:bg-accent"
              aria-label="Close preview"
            >
              <IconX className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
