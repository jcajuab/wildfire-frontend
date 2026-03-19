import type { ReactElement } from "react";
import { getFlashBadgeClassName } from "@/lib/display-runtime/flash-ticker";
import type { FlashTone } from "@/types/content";
import { cn } from "@/lib/utils";

interface FlashTonePreviewProps {
  readonly tone: FlashTone | null | undefined;
  readonly message: string;
  readonly fallbackMessage?: string;
  readonly className?: string;
}

export function FlashTonePreview({
  tone,
  message,
  fallbackMessage = "Ticker preview",
  className,
}: FlashTonePreviewProps): ReactElement {
  const normalizedTone = tone ?? "INFO";
  const normalizedMessage =
    message.trim().length > 0 ? message.trim() : fallbackMessage;

  return (
    <div
      className={cn(
        "flex h-full w-full min-w-0 max-w-full items-center justify-center py-2",
        className,
      )}
    >
      <div className="flex h-10 min-w-0 w-full max-w-full overflow-hidden border border-black/20 bg-white sm:h-11">
        <div
          className={cn(
            "flex h-full shrink-0 items-center justify-center px-2 text-[10px] font-extrabold leading-none tracking-[0.14em] sm:px-3 sm:text-xs",
            getFlashBadgeClassName(normalizedTone),
          )}
        >
          {normalizedTone}
        </div>
        <div className="flex min-w-0 flex-1 items-center overflow-hidden bg-white px-2 sm:px-3">
          <p className="w-full truncate text-xs font-semibold leading-tight text-black sm:text-sm">
            {normalizedMessage}
          </p>
        </div>
      </div>
    </div>
  );
}
