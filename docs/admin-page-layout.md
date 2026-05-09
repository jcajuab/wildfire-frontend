# Admin Page Layout

This document defines the layout system for admin pages, excluding the sidebar
and global app shell. Use it with `docs/admin-buttons.md` and
`docs/admin-dialogs.md` when building or reviewing admin pages.

The best reference for list pages is `/admin/displays`. It shows the intended
header, centered search/filter control, right-aligned actions, fixed content
padding, and bottom pagination footer.

## Scope

These rules apply to pages under `/admin`. Public display runtime pages can use
different layouts when their viewing context requires it.

The admin sidebar, mobile sidebar, and global shell navigation are out of scope.
This document starts at the page content rendered inside the dashboard shell.

## Page Shell

Most admin pages should render one full-height content card:

```tsx
<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
  {/* header */}
  <section className="flex min-h-0 flex-1 flex-col">
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* page content */}
    </div>
  </section>
</div>
```

The shell keeps page edges consistent:

- Use one outer rounded border around the admin page content.
- Keep the shell `overflow-hidden`; put scrolling in the body region.
- Use `min-h-0` on nested flex containers so scroll regions can shrink.
- Use `p-4` for the main body padding. Avoid mixing different `px-*` and
  `py-*` values for the primary page content.
- Internal bands can use their own padding only when they are distinct
  sections, such as headers, filter bars, table toolbars, or pagination
  footers.

## List Toolbar Header

List pages with search, filters, and actions should follow Displays, Content,
and Playlists.

```tsx
<header className="shrink-0 border-b border-border bg-background p-4">
  <div className="flex w-full min-w-0 flex-col gap-2">
    <div className="grid w-full min-w-0 grid-cols-1 items-center gap-2 md:grid-cols-[auto_minmax(12rem,1fr)_auto] md:gap-3">
      <h1 className="min-w-0 truncate text-xl font-semibold leading-tight tracking-tight text-balance">
        Page Title
      </h1>

      <div className="flex w-full min-w-0 items-center justify-self-center md:max-w-168">
        {/* merged search/filter control */}
      </div>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center md:justify-end">
        {/* actions */}
      </div>
    </div>

    {/* optional bulk selection strip */}
  </div>
</header>
```

Header rules:

- Render exactly one page `h1`.
- Keep the page title on the left, search/filter centered, and actions on the
  right.
- Merge search and filter into one control when the page has a primary text
  search and a popover filter.
- Constrain the search/filter control with a sensible max width. Do not let it
  fill the entire toolbar on wide screens.
- Keep action buttons full-width on narrow screens and natural width on desktop.
- Use `docs/admin-buttons.md` for action hierarchy, icons, dropdown trigger
  chevrons, destructive bulk actions, and menu sizing.

Bulk modes stay inside the same header. They should not replace the title,
search, filter, or create/manage action row.

```tsx
<div className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-background px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
  <span className="text-sm font-medium text-foreground tabular-nums">
    3 selected
  </span>
  <div className="flex min-w-0 flex-wrap items-center gap-2">
    {/* destructive commit + cancel */}
  </div>
</div>
```

## PageHeader Pattern

Use the shared `PageHeader` for pages that do not need the centered list
toolbar. Examples include Settings, Logs, Schedules, Users, Roles, Create Role,
Edit Role, Create Playlist, and Edit Playlist.

`PageHeader` provides:

```tsx
<header className="flex flex-col gap-2 border-b border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
  <h1 className="text-xl font-semibold leading-tight tracking-tight text-balance">
    Page Title
  </h1>
  <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
    {/* optional page actions */}
  </div>
</header>
```

Use this pattern when:

- The page has simple page-level actions, such as `Create Role` or
  `Invite User`.
- Search and filters belong to an inner table/card region.
- The page is a form, details, settings, logs, or scheduler view.

Do not duplicate the title inside the first table or card when the page header
already names the page. Inner regions can use tabs, search, filters, and
section headings only when they add useful context.

## Body Patterns

### Card And Grid Lists

Displays, Content, and Playlists use a fixed header, a scrollable grid body, and
a fixed pagination footer:

```tsx
<div className="min-h-0 flex-1 overflow-auto p-4">
  <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
    {/* cards */}
  </div>
</div>

<PaginationFooter ... />
```

Keep card grids stable:

- Use `p-4` for the scrollable content region.
- Use `gap-4` between cards.
- Avoid auto-expanding a small number of cards into oversized cards.
- Loading skeletons should use the same grid, padding, and card dimensions as
  the loaded state.
- Empty and error states should sit inside the same padded body region.

### Tables

Users and Roles use a table frame inside the padded page body:

```tsx
<div className="flex min-h-0 flex-1 overflow-hidden p-4">
  <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
    <div className="flex shrink-0 border-b border-border px-4 py-3">
      {/* tabs/search/filter controls */}
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto">{/* table */}</div>
    <PaginationFooter ... />
  </section>
</div>
```

Table rules:

- Integrate tabs and search into the table frame when they only affect that
  table.
- Do not repeat the page title as a table title unless there are multiple
  clearly named regions.
- Keep table rows, headers, sort controls, filter controls, and action menus
  visually consistent across table pages.
- Keep pagination outside the scrollable table body and separated by a border.

### Filter Or Calendar Bands

Logs and Schedules can use a secondary controls band below `PageHeader`:

```tsx
<div className="shrink-0 border-b border-border bg-muted/15 p-4">
  {/* filters, calendar controls, segmented controls */}
</div>
```

Use this when controls are too broad for a single header row. Keep the band
compact and separate it from the scrollable content region.

### Settings And Form Pages

Settings and form pages should still keep the shell and body padding:

```tsx
<div className="min-h-0 flex-1 overflow-auto p-4">
  <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
    {/* settings sections or form */}
  </div>
</div>
```

Use a max-width only for content that benefits from a readable measure. List
pages and data-dense tables should usually use the full available width inside
the `p-4` body.

## Pagination

Pagination footers should be fixed below the scrollable body:

- Place pagination after the scrollable content region.
- Use `border-t border-border` for separation.
- Use `PaginationFooter` when possible.
- Always show pagination on pages where pagination is part of the page pattern,
  even when there is only one page.
- Keep result count on the left and page controls on the right.

## Loading And Error States

Loading pages and skeletons must mirror the loaded layout:

- Header skeletons should use the same header padding and row structure as the
  final header.
- Body skeletons should use `p-4` and the same grid or table frame as the final
  page.
- Error states should preserve the page shell and header, then render the error
  inside the padded body region.
- Fetching overlays should sit inside the relevant scroll region, not over the
  whole app shell.

## Migration Checklist

Use this checklist when reviewing an admin page:

- Does the page use the standard outer shell?
- Is there exactly one page `h1`?
- Does the header use either the list-toolbar pattern or `PageHeader`, not a
  one-off hybrid?
- Does the main body use consistent `p-4` padding?
- Are additional control bands clearly separated with `border-b` and compact
  padding?
- Is search centered and max-width constrained on list-toolbar pages?
- Are page actions right-aligned and consistent with `docs/admin-buttons.md`?
- Does bulk mode add a second header row instead of replacing the main row?
- Is the scroll region inside the shell, with fixed header and pagination?
- Is pagination separated by `border-t` and shown consistently?
- Do loading, empty, error, and populated states preserve the same layout?

## Current References

Use these pages as references:

- `/admin/displays`: canonical list toolbar, grid body, bulk strip, pagination.
- `/admin/content`: list toolbar with create dropdown and bulk delete.
- `/admin/playlists`: list toolbar with create link and bulk delete.
- `/admin/users`: table frame with integrated tabs/search and pagination.
- `/admin/roles`: table frame with integrated search and pagination.
- `/admin/logs`: `PageHeader` plus a secondary filter band.
- `/admin/schedules`: `PageHeader` plus a calendar controls band.
- `/admin/settings`: `PageHeader` plus centered settings content.
