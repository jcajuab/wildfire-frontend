# Admin Dialogs

This document defines how admin-console dialogs should look and behave in the
frontend. Use it as the reference for future dialogs and as the comparison point
when migrating older dialogs. It is not a requirement to immediately refactor
every existing dialog.

## Scope

These rules apply to dialogs in the admin console. Public display runtime
surfaces can use different patterns when the viewing context requires it.

Use the shared Radix/shadcn primitives from `components/ui/dialog.tsx`:

- `Dialog`
- `DialogContent`
- `DialogHeader`
- `DialogTitle`
- `DialogDescription`
- `DialogFooter`

## Dialog Anatomy

Admin dialogs should use a predictable structure:

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        One concise sentence that explains the task.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">{/* body */}</div>

    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Keep the hierarchy simple:

- Use one `DialogTitle`.
- Use one short `DialogDescription` when helpful.
- Do not add another visible heading that repeats the dialog title.
- Keep helper text close to the field it explains, preferably through an inline
  tooltip icon when the text is secondary.
- Keep body content visually quieter than the title and footer actions.

## Sizing

Pick the smallest size that comfortably supports the task.

- Simple forms and result dialogs: `sm:max-w-md`.
- Standard admin create/edit forms: `sm:max-w-lg`.
- Rich editors, upload flows, and larger forms: `sm:max-w-4xl`.
- Two-pane managers and picker-heavy dialogs: `sm:max-w-5xl`.

For any dialog that can grow taller than the viewport, use:

```tsx
<DialogContent className="flex max-h-[85vh] flex-col overflow-hidden">
  {/* fixed header */}
  <div className="min-h-0 flex-1 overflow-auto">{/* scrollable body */}</div>
  {/* fixed footer */}
</DialogContent>
```

Do not let the dialog itself expand indefinitely. Contain scrolling inside the
body or the relevant pane.

## Spacing

Use the dialog primitive defaults when a dialog is simple. For custom banded
layouts, remove the default padding and apply padding to the sections:

```tsx
<DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0">
  <DialogHeader className="px-4 pt-4 pb-3">...</DialogHeader>
  <div className="border-t border-border" aria-hidden />
  <div className="min-h-0 flex-1 overflow-auto p-4">...</div>
  <DialogFooter className="border-t border-border px-4 py-3">...</DialogFooter>
</DialogContent>
```

Default spacing rules:

- Use `p-4` for dialog body sections.
- Use `gap-4` or `space-y-4` between form groups.
- Use `space-y-2` between a label and its control.
- Use `grid gap-4 sm:grid-cols-2` for paired fields.
- Use `border-t border-border` for footer or pane separation.
- Avoid card-on-card layouts inside dialogs unless each card is a repeated,
  selectable item.

## Typography And Labels

Dialog typography should stay compact and admin-focused:

- `DialogTitle` should remain the primary heading and use the primitive default.
- Descriptions should be concise, usually one sentence.
- Field labels use title case: `Display Name`, `Output Type`, `Content Title`.
- Required fields use a close asterisk: `Display Name*`.
- Placeholder copy should describe the expected input professionally:
  `Enter display name`, `Select or create display groups`,
  `Search available content...`.
- Avoid all-caps section labels inside dialogs unless the surrounding component
  system already requires it.

Use inline tooltip icons for secondary explanations that would otherwise create
long subtext blocks. Examples:

- Fixed identity fields, such as display slug.
- Special behavior, such as emergency override content.
- Advanced constraints that are useful but not required for every user.

## Footer Actions

Footer actions should be stable and right-aligned:

- `Cancel` is an outline button and appears before the primary action.
- `Save` is the primary action for create/edit completion.
- `Continue` is acceptable for multi-step setup flows.
- `Done` closes an informational or already-applied result dialog.
- Destructive actions use destructive styling and direct copy:
  `Delete`, `Unregister`, `Delete Selected`.

For submitting states:

- Disable close, cancel, and submit actions when closing would interrupt an
  in-flight mutation.
- Show a spinner or changed label such as `Saving...` when the action is
  pending.
- Prevent outside click and Escape dismissal when mutation interruption would
  create an unclear state.

## Complex Manager Dialogs

Two-pane manager dialogs should use a banded layout:

```tsx
<DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
  <DialogHeader className="px-4 pt-4 pb-3">...</DialogHeader>
  <div className="border-t border-border" aria-hidden />
  <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden sm:grid-cols-[17.5rem_1px_minmax(0,1fr)]">
    <aside className="min-h-0 overflow-y-auto p-4">...</aside>
    <div className="hidden w-px bg-border sm:block" aria-hidden />
    <section className="min-h-0 overflow-hidden">...</section>
  </div>
  <DialogFooter className="border-t border-border px-4 py-3">...</DialogFooter>
</DialogContent>
```

Within the right pane:

- Keep the pane header, search, and cards in a padded content region.
- Put internal pagination in a full-width footer.
- Separate internal pagination with `border-t border-border bg-background`.
- Make the whole item selectable when selection is the primary action.
- Avoid separate tiny `Select` buttons on every card when the card itself can be
  clicked.

The `Manage Emergency Assets` dialog is the reference for this pattern.

## Migration Checklist

Use this checklist when comparing older admin dialogs to the intended system:

- Does the dialog use one clear title and a concise description?
- Does the content fit one of the standard size tiers?
- Does the body use consistent `p-4`, `gap-4`, and `space-y-2` spacing?
- Are labels title case and required markers close to the label text?
- Is helper text either necessary visible copy or moved into an inline tooltip?
- Is scrolling contained inside the body or pane instead of growing the dialog?
- Are footer actions right-aligned and ordered as secondary then primary?
- Are destructive, disabled, loading, and close states clear?
- Does a picker use direct card selection when selection is the main action?
- Does internal pagination span its pane and have clear separation?

## Current References

Use these existing dialogs as visual references:

- Register Display and Edit Display: compact admin form dialogs.
- Create/Edit Content: large editor dialogs with contained body scrolling.
- Manage Emergency Assets: two-pane manager dialog with internal pagination.
- Confirm action dialogs: destructive confirmation and cancellation patterns.
