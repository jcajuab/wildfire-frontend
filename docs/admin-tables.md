# Admin Tables

This document defines the table system for admin-console pages. Use it with
`docs/admin-page-layout.md` for page framing and `docs/admin-buttons.md` for
row actions, header controls, and destructive menu behavior.

The best reference is `/admin/users`. It shows the intended table frame,
integrated tabs and search, sticky headers, consistent row height, header
sorting/filtering, row action menus, and fixed pagination footer.

## Scope

These rules apply to admin-console data tables. Public display runtime surfaces,
rich editor tables, and special-purpose visual pickers can use different
patterns when their context requires it.

Use the shared table primitives from `components/ui/table.tsx`:

- `Table`
- `TableHeader`
- `TableBody`
- `TableRow`
- `TableHead`
- `TableCell`

Do not create one-off table markup when the shared primitives can express the
layout.

## Table Frame

Admin tables should live inside the standard page body padding from
`docs/admin-page-layout.md`:

```tsx
<div className="flex min-h-0 flex-1 overflow-hidden p-4">
  <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
    <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      {/* tabs, search, or table-scoped controls */}
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto">
      <Table>{/* table */}</Table>
    </div>

    <footer className="border-t border-border bg-background/80">
      <PaginationFooter alwaysShow ... />
    </footer>
  </section>
</div>
```

Frame rules:

- Keep one rounded bordered frame around the table region.
- Keep tabs, search, and table-scoped controls inside the frame header when
  they affect only that table.
- Keep the table body as the scroll region with `min-h-0 flex-1 overflow-y-auto`.
- Keep pagination outside the scrollable table body and separated with
  `border-t border-border`.
- Do not repeat the page title inside the frame when the page header already
  names the page.

## Table Anatomy

Use the primitive defaults unless a column needs explicit width or alignment:

- `Table` provides horizontal overflow through its container.
- `TableHeader` should be sticky for scrollable table frames:
  `className="sticky top-0 z-10 bg-background"`.
- Standard admin rows use `className="h-12"`.
- Standard cells use the primitive `p-2`, `align-middle`, and `whitespace-nowrap`.
- Action columns use `className="w-[48px] text-right"`.
- Use `TableBody className="[&_tr:last-child]:border-b"` inside framed tables so
  the final row is separated from empty frame space.

Do not remove row borders in framed tables. The bottom edge of the final row is
part of the table rhythm, especially when only a few rows are present.

## Headers, Sorting, And Filters

Headers should be compact and consistent:

- Use `SortableHeader` for sortable columns.
- Put `aria-sort` on the matching `TableHead`.
- Use `TableHeaderControl` for clickable header controls.
- Use the same icon treatment for all sortable and filterable headers.
- Keep labels title case: `Name`, `Email`, `Roles`, `Last Seen`, `Invitee`,
  `Status`, `Expires`.
- Header filter menu options should use complete copy such as `All roles` or
  `All statuses`, not just `All`.

Sortable header example:

```tsx
<TableHead
  aria-sort={
    sort.field === "name"
      ? sort.direction === "asc"
        ? "ascending"
        : "descending"
      : "none"
  }
>
  <SortableHeader
    label="Name"
    field="name"
    currentSort={sort}
    onSort={(field, direction) => onSortChange({ field, direction })}
  />
</TableHead>
```

Column filters belong in the header cell for the column they affect. Table-wide
search belongs in the table frame toolbar.

## Rows And Cells

Rows should be scan-friendly and stable:

- Use `h-12` for standard data rows.
- Primary identity cells can stack a primary value and a muted secondary value,
  such as `Admin` and `@admin`.
- Use `font-medium` for the primary value in an identity cell.
- Use `text-muted-foreground` for secondary values and empty placeholders.
- Use `tabular-nums` for dates, counts, status codes, and other numeric values.
- Truncate long values with explicit max widths instead of allowing row height
  to grow unexpectedly.
- Align numeric count columns to the center only when the header is also
  centered.

Badge usage:

- Badges should support scanning without overpowering row content.
- Use meaningful status color only when status is a core scan target.
- Role and relationship badges should generally use a restrained outline or
  lightly tinted treatment.
- Avoid saturated badge colors in dense tables unless the state is urgent or
  destructive.

## Actions

Table row actions follow `docs/admin-buttons.md`:

- Use a ghost `size="icon-sm"` three-dot trigger.
- Provide an `aria-label` that identifies the row target.
- Hide the trigger entirely when no row actions are available.
- Show normal actions first.
- Add a separator before destructive actions when normal actions also exist.
- Use `DropdownMenuItem variant="destructive"` for destructive row actions.
- Keep row action menus right-aligned to the trigger.

Action column cells should remain narrow and stable. Do not add visible text
buttons in every row unless the action is the primary purpose of the table.

## States And Pagination

Table states must preserve the frame:

- Loading, empty, error, and populated states should keep the same outer table
  frame.
- Empty states render in the scrollable body region.
- Fetching overlays should sit inside the table frame, not over the whole page.
- Pagination stays fixed below the body and should use `PaginationFooter` with
  `alwaysShow` for paginated table pages.
- Result count stays on the left; page controls stay on the right.
- Use the shared table density page size of `30` rows. Tables are more compact
  than card grids and should expose more data per page.
- Pagination uses the shared auto behavior: compact controls for one or two
  pages, numbered controls with ellipses for three or more pages.

For loading skeletons, mirror the final table frame, toolbar, header heights,
row heights, and footer placement.

## Responsive Behavior

Tables remain tables on mobile unless a page intentionally needs a custom card
view:

- Let the shared `Table` container provide horizontal scrolling.
- Do not squeeze all columns into unreadable widths.
- Keep the frame header controls wrapping before the table itself becomes
  cramped.
- Keep destructive row actions inside menus so mobile rows stay compact.

## Current References

Use these existing tables as references:

- `/admin/users` users tab: canonical table frame, tabs/search integration,
  identity cells, role filter, row actions, and pagination.
- `/admin/users` invitations tab: compact status filter, invitation actions,
  and matching row height.
- `/admin/roles`: standard table frame with search, sortable name/user count,
  centered numeric column, and row actions.
- `/admin/logs`: dense read-only table variant with wider content columns.

## Migration Checklist

Use this checklist when reviewing or changing admin tables:

- Does the table sit inside the standard rounded bordered frame?
- Are tabs/search/filter controls integrated into the frame header when they are
  table-scoped?
- Is the table body the scroll region?
- Is pagination fixed below the scroll region with `border-t` separation?
- Does the table use shared table primitives?
- Is the header sticky when the body scrolls?
- Are sortable headers implemented with `SortableHeader` and `aria-sort`?
- Are filter headers implemented with `TableHeaderControl`?
- Are row heights, cell padding, and action columns consistent?
- Does the final row keep a bottom border inside framed tables?
- Are long values truncated intentionally?
- Are dates and numeric values `tabular-nums`?
- Are row action menus hidden when no actions exist?
- Are destructive actions separated and styled as destructive?
- Do empty, loading, error, and fetching states preserve the frame?
