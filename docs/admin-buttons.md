# Admin Buttons

This document defines how buttons should look and behave across the admin
console. Use it with `docs/admin-dialogs.md` when building dialogs, toolbars,
tables, cards, settings panels, and confirmation flows.

It is not a requirement to refactor every existing button immediately. New work
and cleanup passes should converge on these rules.

## Scope

These rules apply to admin-console UI. Public display runtime surfaces and
specialized AI surfaces can use different patterns when their context requires
it, but they should still preserve accessible names, clear hierarchy, and safe
destructive actions.

Use the shared primitives unless there is a specific component reason not to:

- `Button` from `components/ui/button.tsx`
- `AlertDialogAction` and `AlertDialogCancel` from
  `components/ui/alert-dialog.tsx`
- `DropdownMenuItem` for menu actions
- `SelectTrigger`, `ComboboxInput`, and related trigger primitives for form
  controls

Do not create one-off button CSS when an existing variant, size, or documented
composition can express the action.

## Button Hierarchy

Use button styling to communicate action priority:

- Primary actions use the default button variant. Examples: `Create Content`,
  `Manage Displays`, `Save`, `Create`, `Invite User`.
- Secondary actions use `variant="outline"`. Examples: `Cancel`, `Close`,
  `Today`, `Reset Filters`, field edit buttons in Settings.
- Quiet local actions use `variant="ghost"`. Examples: row action triggers,
  clear buttons, inline cancel actions, remove/reset actions inside a dense
  tool surface.
- Destructive commit actions use `variant="destructive"`. Examples: `Delete`,
  `Delete Selected`, `Unregister Selected`, `Delete Account`.
- Destructive mode-entry actions use an outline button with destructive tone.
  Examples: `Bulk Delete`, `Bulk Unregister`. Keep this visually weaker than
  the final destructive commit action.
- Link-style navigation should usually be a real link. Use `Button asChild`
  only when the navigation is the primary page or empty-state action.

Avoid using multiple primary buttons in the same local action group. If two
actions appear side by side, only the final or most important action should be
primary.

## Sizes

Default admin action buttons should use the primitive defaults:

- Use `size="default"` for toolbar actions, dialog footer actions, table header
  actions, and most page-header actions.
- Use `size="sm"` only for dense inline controls inside a compact component,
  not for primary page actions.
- Use `size="icon-sm"` for row/card three-dot triggers and small embedded
  icon-only actions.
- Use `size="icon"` for calendar navigation or standalone icon buttons that
  need to align with default-height controls.
- Settings field-like buttons can use a custom field height such as `h-10`
  when they visually replace an input control.

Do not mix button heights in the same horizontal group unless one of the
buttons is an icon-only control intentionally aligned to an input group.

## Icons

Use icons to support recognition, not to replace clear labels:

- Use Tabler icons already used in the app when possible.
- Add leading icons for page-level create/manage/destructive actions.
- Add a trailing chevron for dropdown triggers.
- Mark decorative icons with `aria-hidden="true"`.
- Add `data-icon="inline-start"` or `data-icon="inline-end"` on inline button
  icons so Button padding stays consistent.
- Icon-only buttons must have an `aria-label`.
- Do not use icon-only buttons for primary page actions on desktop.

Common icon mappings:

- Create: `IconPlus`
- Manage/settings: `IconSettings`
- Delete: `IconTrash` or the domain-specific destructive icon already in use
- Unregister display: `IconTrashX`
- Edit: `IconPencil`
- Close/cancel inline mode: `IconX`
- Dropdown trigger: `IconChevronDown`

## Toolbars

Admin list toolbars should follow the Displays, Content, and Playlists pattern:

- Page title on the left.
- Search/filter control centered with a sensible max width.
- Actions on the right.
- Primary create/manage action is default variant.
- Bulk entry action is destructive-outline.
- Bulk active strip uses `N selected`, destructive commit, and ghost cancel.
- On mobile, action buttons can become full-width, but they should keep their
  hierarchy and order.

Recommended toolbar examples:

```tsx
<Button
  type="button"
  variant="outline"
  className="border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive"
>
  <IconTrash className="size-4" aria-hidden="true" data-icon="inline-start" />
  Bulk Delete
</Button>

<Button type="button">
  <IconPlus className="size-4" aria-hidden="true" data-icon="inline-start" />
  Create Content
  <IconChevronDown
    className="size-4"
    aria-hidden="true"
    data-icon="inline-end"
  />
</Button>
```

When a toolbar action opens a dropdown, size the menu to the trigger width
unless the longest menu item needs more room:

```tsx
<DropdownMenuContent
  align="end"
  className="w-max min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(100vw-2rem)]"
/>
```

## Dialog Footers

Dialog buttons must follow `docs/admin-dialogs.md`:

- Form dialogs use `Cancel` as outline, then `Save`, `Create`, or `Continue`
  as primary.
- Result or informational dialogs use `Done` as the closing action.
- Read-only details dialogs can use `Close`.
- Destructive actions in a mixed footer should be separated from normal actions
  when possible.
- Final destructive confirmation still belongs in a confirmation dialog.

Recommended split footer when a details dialog has delete and edit:

```tsx
<DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex sm:flex-1">
    <Button variant="destructive">Delete</Button>
  </div>
  <div className="flex justify-end gap-2 sm:flex-1">
    <Button variant="outline">Close</Button>
    <Button>Edit</Button>
  </div>
</DialogFooter>
```

Submitting buttons should be disabled while pending and use clear loading copy:
`Saving...`, `Creating...`, `Deleting...`, or `Working...`.

## Menus And Tables

Use `docs/admin-tables.md` for table frame, header, row, state, and pagination
rules. This section only covers button and menu behavior inside rows and table
headers.

Rows and cards should keep action menus compact:

- Three-dot triggers use `variant="ghost"` and `size="icon-sm"`.
- Hide the trigger entirely when no row actions are available.
- Normal menu items appear first.
- Add a separator before destructive menu items when normal actions also exist.
- Destructive menu items use `variant="destructive"` and direct copy such as
  `Delete Content`, `Unregister Display`, or `Delete Playlist`.

Use buttons in table headers only when they perform an action, such as sort or
filter. Header controls should look consistent with each other and should not
look like primary actions.

## Settings And Field-Like Buttons

Settings contains buttons that behave like editable fields. These are allowed
exceptions:

- Use `variant="outline"` and the same height as nearby inputs.
- Use `justify-between` when showing the current value plus an edit icon.
- Keep the accessible label action-oriented, such as `Edit username`.
- When a field enters edit mode, use compact confirm/cancel icon buttons beside
  the input.

Danger-zone actions stay visually separated from normal settings actions.
`Log Out` can be outline with destructive tone. Irreversible account removal
uses `variant="destructive"`.

## Copy

Button labels should be short, specific, and stable:

- Use Title Case for visible labels.
- Prefer verbs: `Create Role`, `Invite User`, `Reset Filters`, `Save Changes`.
- Use `Cancel` for abandoning an editable flow.
- Use `Close` for dismissing a read-only details view.
- Use `Done` for result dialogs after an action is already complete.
- Use direct destructive labels: `Delete`, `Delete Selected`, `Delete Account`.
- Avoid vague labels like `Submit`, `OK`, `Yes`, or `No`.

Use ellipses in loading text as three periods to match current app copy:
`Saving...`, `Creating...`, `Logging out...`.

## Accessibility

Every button must satisfy these checks:

- Icon-only buttons have an `aria-label`.
- Buttons that navigate are links when possible.
- Disabled buttons communicate disabled state through `disabled` or
  `aria-disabled`.
- Pending mutation buttons use `disabled` and, when useful, `aria-busy`.
- Destructive actions are confirmation-gated unless they only enter a selection
  or preparation mode.
- Button groups keep enough spacing to prevent accidental destructive clicks.
- Focus styles remain visible; do not remove the primitive focus ring.
- Decorative icons are hidden from assistive technology.

## Current References

Use these as references when updating existing screens:

- Displays, Content, and Playlists toolbars: primary create/manage action,
  destructive-outline bulk entry, and active bulk strips.
- Register/Edit Display and Create/Edit Content dialogs: standard footer
  ordering.
- Schedule Details dialog: separated destructive and normal footer actions.
- User and Role tables: icon-only row action triggers.
- Settings page: field-like outline buttons and danger-zone separation.

## Migration Checklist

Use this checklist when auditing or changing buttons:

- Does the button use the shared `Button` primitive or an approved trigger
  primitive?
- Is there only one primary action in the local group?
- Does the variant match the action hierarchy?
- Are destructive entry actions visually weaker than destructive commit
  actions?
- Are dialog footer actions ordered and aligned consistently?
- Are icon sizes and `data-icon` attributes consistent?
- Do icon-only buttons have accessible labels?
- Are dropdown triggers and menus sized consistently?
- Are destructive menu items separated from normal menu items?
- Are pending and disabled states clear?
- Does mobile layout avoid cramped destructive and primary actions?
