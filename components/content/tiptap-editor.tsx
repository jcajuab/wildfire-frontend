"use client";

import type { ReactElement } from "react";
import { useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconList,
  IconListNumbers,
  IconQuote,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconAlignJustified,
  IconLink,
  IconLinkOff,
  IconTable,
  IconTablePlus,
  IconTableMinus,
  IconRowInsertBottom,
  IconRowInsertTop,
  IconColumnInsertLeft,
  IconColumnInsertRight,
  IconTrash,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TEXT_CONTENT_MAX_CHARS = 5000;

interface TiptapEditorProps {
  readonly content?: string;
  readonly onChange?: (json: string, html: string) => void;
  readonly placeholder?: string;
  readonly editable?: boolean;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = "Start writing...",
  editable = true,
}: TiptapEditorProps): ReactElement {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      TextAlign.configure({
        types: ["paragraph"],
      }),
      TextStyle,
      Color,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: TEXT_CONTENT_MAX_CHARS,
      }),
    ],
    content: content ? JSON.parse(content) : undefined,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(JSON.stringify(editor.getJSON()), editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-4",
      },
    },
  });

  const setLink = useCallback(
    (url: string) => {
      if (!editor) return;
      if (url === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    },
    [editor],
  );

  if (!editor) {
    return <div className="h-[300px] animate-pulse rounded-md bg-muted" />;
  }

  const charCount = editor.storage.characterCount.characters();
  const isOverLimit = charCount > TEXT_CONTENT_MAX_CHARS;

  return (
    <div className="rounded-md border border-input bg-background">
      {editable ? (
        <div className="flex flex-wrap gap-1 border-b border-input p-2">
          {/* Text formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold"
          >
            <IconBold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic"
          >
            <IconItalic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Underline"
          >
            <IconUnderline className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Strikethrough"
          >
            <IconStrikethrough className="size-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <IconList className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Numbered List"
          >
            <IconListNumbers className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            title="Quote"
          >
            <IconQuote className="size-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Alignment */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })}
            title="Align Left"
          >
            <IconAlignLeft className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })}
            title="Align Center"
          >
            <IconAlignCenter className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })}
            title="Align Right"
          >
            <IconAlignRight className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            active={editor.isActive({ textAlign: "justify" })}
            title="Justify"
          >
            <IconAlignJustified className="size-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Link */}
          <LinkPopover
            isActive={editor.isActive("link")}
            currentUrl={editor.getAttributes("link").href || ""}
            onSetLink={setLink}
            onUnsetLink={() =>
              editor.chain().focus().extendMarkRange("link").unsetLink().run()
            }
          />

          <ToolbarDivider />

          {/* Table */}
          <TablePopover
            onInsertTable={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            onAddRowBefore={() => editor.chain().focus().addRowBefore().run()}
            onAddRowAfter={() => editor.chain().focus().addRowAfter().run()}
            onAddColumnBefore={() =>
              editor.chain().focus().addColumnBefore().run()
            }
            onAddColumnAfter={() =>
              editor.chain().focus().addColumnAfter().run()
            }
            onDeleteRow={() => editor.chain().focus().deleteRow().run()}
            onDeleteColumn={() => editor.chain().focus().deleteColumn().run()}
            onDeleteTable={() => editor.chain().focus().deleteTable().run()}
            isInTable={editor.isActive("table")}
          />

          <ToolbarDivider />

          {/* Color */}
          <ColorPicker
            currentColor={editor.getAttributes("textStyle").color || "#000000"}
            onColorChange={(color) =>
              editor.chain().focus().setColor(color).run()
            }
          />
        </div>
      ) : null}

      <EditorContent editor={editor} />

      {editable ? (
        <div
          className={cn(
            "border-t border-input px-4 py-2 text-xs",
            isOverLimit ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {charCount} / {TEXT_CONTENT_MAX_CHARS} characters
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}): ReactElement {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

function ToolbarDivider(): ReactElement {
  return <div className="mx-1 h-6 w-px bg-border" />;
}

function LinkPopover({
  isActive,
  currentUrl,
  onSetLink,
  onUnsetLink,
}: {
  isActive: boolean;
  currentUrl: string;
  onSetLink: (url: string) => void;
  onUnsetLink: () => void;
}): ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={isActive ? "secondary" : "ghost"}
          size="icon-sm"
          title="Link"
        >
          <IconLink className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <Label htmlFor="link-url">URL</Label>
          <Input
            id="link-url"
            placeholder="https://example.com"
            defaultValue={currentUrl}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSetLink((e.target as HTMLInputElement).value);
              }
            }}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={(e) => {
                const input = (e.target as HTMLElement)
                  .closest(".space-y-2")
                  ?.querySelector("input");
                if (input) {
                  onSetLink(input.value);
                }
              }}
            >
              Set Link
            </Button>
            {isActive ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onUnsetLink}
              >
                <IconLinkOff className="mr-1 size-4" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TablePopover({
  onInsertTable,
  onAddRowBefore,
  onAddRowAfter,
  onAddColumnBefore,
  onAddColumnAfter,
  onDeleteRow,
  onDeleteColumn,
  onDeleteTable,
  isInTable,
}: {
  onInsertTable: () => void;
  onAddRowBefore: () => void;
  onAddRowAfter: () => void;
  onAddColumnBefore: () => void;
  onAddColumnAfter: () => void;
  onDeleteRow: () => void;
  onDeleteColumn: () => void;
  onDeleteTable: () => void;
  isInTable: boolean;
}): ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={isInTable ? "secondary" : "ghost"}
          size="icon-sm"
          title="Table"
        >
          <IconTable className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48">
        <div className="space-y-1">
          {!isInTable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={onInsertTable}
            >
              <IconTablePlus className="mr-2 size-4" />
              Insert Table
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={onAddRowBefore}
              >
                <IconRowInsertTop className="mr-2 size-4" />
                Add Row Above
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={onAddRowAfter}
              >
                <IconRowInsertBottom className="mr-2 size-4" />
                Add Row Below
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={onAddColumnBefore}
              >
                <IconColumnInsertLeft className="mr-2 size-4" />
                Add Column Left
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={onAddColumnAfter}
              >
                <IconColumnInsertRight className="mr-2 size-4" />
                Add Column Right
              </Button>
              <div className="my-1 h-px bg-border" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={onDeleteRow}
              >
                <IconTrash className="mr-2 size-4" />
                Delete Row
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={onDeleteColumn}
              >
                <IconTrash className="mr-2 size-4" />
                Delete Column
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={onDeleteTable}
              >
                <IconTableMinus className="mr-2 size-4" />
                Delete Table
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColorPicker({
  currentColor,
  onColorChange,
}: {
  currentColor: string;
  onColorChange: (color: string) => void;
}): ReactElement {
  const colors = [
    "#000000",
    "#374151",
    "#6B7280",
    "#9CA3AF",
    "#EF4444",
    "#F97316",
    "#EAB308",
    "#22C55E",
    "#06B6D4",
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Text Color"
          className="relative"
        >
          <span className="text-sm font-bold">A</span>
          <span
            className="absolute bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full"
            style={{ backgroundColor: currentColor }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="grid grid-cols-6 gap-1">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              className={cn(
                "size-6 rounded-md border border-border",
                currentColor === color && "ring-2 ring-primary ring-offset-2",
              )}
              style={{ backgroundColor: color }}
              onClick={() => onColorChange(color)}
              title={color}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
