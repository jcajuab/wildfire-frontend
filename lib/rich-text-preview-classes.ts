/**
 * Shared Tailwind class string for rendering rich text HTML previews in cards.
 * Applies minimal styling to block elements, tables, and inline formatting.
 * Combine with size-specific overrides (text-xs, text-[6px], etc.) at call site.
 */
export const RICH_TEXT_PREVIEW_CLASSES =
  "w-full break-words text-foreground [&_p]:my-0 [&_strong]:font-semibold [&_em]:italic [&_i]:italic [&_u]:underline [&_s]:line-through [&_li]:list-item [&_ul]:list-disc [&_ol]:list-decimal [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted/60 [&_th]:font-semibold";
