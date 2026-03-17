<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-16 | Updated: 2026-03-16 -->

# ui

## Purpose

shadcn/ui component library. 33+ headless UI primitives built on Radix UI with Tailwind CSS styling. These are the base building blocks used by all feature components.

## Key Files

| File                | Description                                                          |
| ------------------- | -------------------------------------------------------------------- |
| `button.tsx`        | Button with variants (default, destructive, outline, ghost, link)    |
| `dialog.tsx`        | Modal dialog (Radix Dialog)                                          |
| `sheet.tsx`         | Slide-out panel (Radix Dialog variant)                               |
| `table.tsx`         | Data table with header, body, row, cell                              |
| `card.tsx`          | Card container with header, content, footer                          |
| `input.tsx`         | Text input field                                                     |
| `select.tsx`        | Dropdown select (Radix Select)                                       |
| `command.tsx`       | Command palette / combobox (cmdk)                                    |
| `popover.tsx`       | Popover with positioning (Radix Popover)                             |
| `sidebar.tsx`       | Collapsible sidebar navigation                                       |
| `tabs.tsx`          | Tab navigation (Radix Tabs)                                          |
| `dropdown-menu.tsx` | Context/dropdown menu (Radix DropdownMenu)                           |
| `badge.tsx`         | Status badge with color variants                                     |
| `sonner.tsx`        | Toast notifications (sonner)                                         |
| `spinner.tsx`       | Loading spinner                                                      |
| `skeleton.tsx`      | Loading skeleton placeholder                                         |
| `field.tsx`         | Form field wrapper with label and error                              |
| `combobox.tsx`      | Searchable combobox                                                  |
| `button-group.tsx`  | Grouped button container                                             |
| `input-group.tsx`   | Input with prefix/suffix addons                                      |
| `alert-dialog.tsx`  | Modal alert dialog with confirm/cancel actions (Radix AlertDialog)   |
| `alert.tsx`         | Inline alert banner with title and description variants              |
| `avatar.tsx`        | User avatar with image and fallback initials (Radix Avatar)          |
| `checkbox.tsx`      | Checkbox input (Radix Checkbox)                                      |
| `collapsible.tsx`   | Collapsible expand/collapse container (Radix Collapsible)            |
| `hover-card.tsx`    | Hover-triggered card popup (Radix HoverCard)                         |
| `label.tsx`         | Form label with htmlFor association (Radix Label)                    |
| `separator.tsx`     | Horizontal or vertical divider line (Radix Separator)                |
| `switch.tsx`        | Toggle switch input (Radix Switch)                                   |
| `textarea.tsx`      | Multi-line text input field                                          |
| `toggle-group.tsx`  | Group of toggle buttons with single/multi select (Radix ToggleGroup) |
| `toggle.tsx`        | Pressable toggle button (Radix Toggle)                               |
| `tooltip.tsx`       | Tooltip popup on hover (Radix Tooltip)                               |

## For AI Agents

### Working In This Directory

- **Do not manually edit** — these are managed by shadcn CLI (`pnpm dlx shadcn@latest add <name>`)
- Style: `radix-mira` with `slate` base color and CSS variables
- Icon library: `@tabler/icons-react` (configured in `components.json`)
- Customization is acceptable but prefer extending via composition over modifying primitives
- Uses `cn()` from `@/lib/utils` for class merging

<!-- MANUAL: -->
