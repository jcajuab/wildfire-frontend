"use client";

import type { ReactElement } from "react";
import {
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

interface TablePopoverProps {
  onInsertTable: () => void;
  onAddRowBefore: () => void;
  onAddRowAfter: () => void;
  onAddColumnBefore: () => void;
  onAddColumnAfter: () => void;
  onDeleteRow: () => void;
  onDeleteColumn: () => void;
  onDeleteTable: () => void;
  isInTable: boolean;
}

export function TablePopover({
  onInsertTable,
  onAddRowBefore,
  onAddRowAfter,
  onAddColumnBefore,
  onAddColumnAfter,
  onDeleteRow,
  onDeleteColumn,
  onDeleteTable,
  isInTable,
}: TablePopoverProps): ReactElement {
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
