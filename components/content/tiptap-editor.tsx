"use client";

import type { ReactElement } from "react";
import { useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
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
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { ToolbarButton, ToolbarGroup, ToolbarDivider } from "./tiptap-toolbar";
import { LinkPopover } from "./tiptap-link-popover";
import { TablePopover } from "./tiptap-table-popover";
import { ColorPicker } from "./tiptap-color-picker";

const TEXT_CONTENT_MAX_CHARS = 1000;

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
      TextStyleKit.configure({
        fontFamily: false,
        fontSize: false,
        lineHeight: false,
      }),
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
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-4 [&_strong]:text-inherit [&_a]:text-inherit [&_em]:text-inherit",
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
  const wordCount = editor.storage.characterCount.words();
  const isOverLimit = charCount > TEXT_CONTENT_MAX_CHARS;

  return (
    <div className="rounded-md border border-input bg-background">
      {editable ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-input px-2 py-1.5">
          <ToolbarGroup>
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
          </ToolbarGroup>

          <ToolbarGroup>
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
          </ToolbarGroup>

          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              active={editor.isActive({ textAlign: "left" })}
              title="Align Left"
            >
              <IconAlignLeft className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
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
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              active={editor.isActive({ textAlign: "justify" })}
              title="Justify"
            >
              <IconAlignJustified className="size-4" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup>
            <LinkPopover
              isActive={editor.isActive("link")}
              currentUrl={editor.getAttributes("link").href || ""}
              onSetLink={setLink}
              onUnsetLink={() =>
                editor.chain().focus().extendMarkRange("link").unsetLink().run()
              }
            />
            <TablePopover
              onInsertTable={() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
              onAddRowBefore={() =>
                editor.chain().focus().addRowBefore().run()
              }
              onAddRowAfter={() =>
                editor.chain().focus().addRowAfter().run()
              }
              onAddColumnBefore={() =>
                editor.chain().focus().addColumnBefore().run()
              }
              onAddColumnAfter={() =>
                editor.chain().focus().addColumnAfter().run()
              }
              onDeleteRow={() => editor.chain().focus().deleteRow().run()}
              onDeleteColumn={() =>
                editor.chain().focus().deleteColumn().run()
              }
              onDeleteTable={() => editor.chain().focus().deleteTable().run()}
              isInTable={editor.isActive("table")}
            />
          </ToolbarGroup>

          <ToolbarGroup>
            <ColorPicker
              currentColor={
                editor.getAttributes("textStyle").color || "#000000"
              }
              onColorChange={(color) =>
                editor.chain().focus().setColor(color).run()
              }
            />
            <ToolbarDivider />
            <ColorPicker
              currentColor={
                editor.getAttributes("textStyle").backgroundColor ||
                "transparent"
              }
              onColorChange={(color) =>
                editor.chain().focus().setBackgroundColor(color).run()
              }
              variant="background"
            />
          </ToolbarGroup>
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
          {charCount} / {TEXT_CONTENT_MAX_CHARS} characters · ~{wordCount} words
        </div>
      ) : null}
    </div>
  );
}
