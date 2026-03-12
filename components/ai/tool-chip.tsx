import { IconX } from "@tabler/icons-react";
import type { SlashCommand } from "@/lib/slash-commands";

interface ToolChipProps {
  command: SlashCommand;
  onRemove: () => void;
}

export function ToolChip({ command, onRemove }: ToolChipProps) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
      /{command.id}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
        aria-label={`Remove ${command.label}`}
      >
        <IconX className="size-2.5" />
      </button>
    </span>
  );
}
