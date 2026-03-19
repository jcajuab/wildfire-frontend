<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-16 | Updated: 2026-03-19 -->

# ui

## Purpose

shadcn/ui component library. 33 headless UI primitives built on Radix UI with Tailwind CSS styling. These are the base building blocks used by all feature components.

## Key Files

| File                | Description                                                          |
| ------------------- | -------------------------------------------------------------------- |
| `alert-dialog.tsx`  | Modal alert dialog with confirm/cancel actions (Radix AlertDialog)   |
| `alert.tsx`         | Inline alert banner with title and description variants              |
| `avatar.tsx`        | User avatar with image and fallback initials (Radix Avatar)          |
| `badge.tsx`         | Status badge with color variants                                     |
| `button-group.tsx`  | Grouped button container                                             |
| `button.tsx`        | Button with variants (default, destructive, outline, ghost, link)    |
| `card.tsx`          | Card container with header, content, footer                          |
| `checkbox.tsx`      | Checkbox input (Radix Checkbox)                                      |
| `collapsible.tsx`   | Collapsible expand/collapse container (Radix Collapsible)            |
| `combobox.tsx`      | Searchable combobox                                                  |
| `command.tsx`       | Command palette / combobox (cmdk)                                    |
| `dialog.tsx`        | Modal dialog (Radix Dialog)                                          |
| `dropdown-menu.tsx` | Context/dropdown menu (Radix DropdownMenu)                           |
| `field.tsx`         | Form field wrapper with label and error                              |
| `hover-card.tsx`    | Hover-triggered card popup (Radix HoverCard)                         |
| `input-group.tsx`   | Input with prefix/suffix addons                                      |
| `input.tsx`         | Text input field                                                     |
| `label.tsx`         | Form label with htmlFor association (Radix Label)                    |
| `popover.tsx`       | Popover with positioning (Radix Popover)                             |
| `select.tsx`        | Dropdown select (Radix Select)                                       |
| `separator.tsx`     | Horizontal or vertical divider line (Radix Separator)                |
| `sheet.tsx`         | Slide-out panel (Radix Dialog variant)                               |
| `sidebar.tsx`       | Collapsible sidebar navigation                                       |
| `skeleton.tsx`      | Loading skeleton placeholder                                         |
| `sonner.tsx`        | Toast notifications (sonner)                                         |
| `spinner.tsx`       | Loading spinner                                                      |
| `switch.tsx`        | Toggle switch input (Radix Switch)                                   |
| `table.tsx`         | Data table with header, body, row, cell                              |
| `tabs.tsx`          | Tab navigation (Radix Tabs)                                          |
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
