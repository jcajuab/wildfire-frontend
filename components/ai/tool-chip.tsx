import { IconX } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import type { SlashCommand } from "@/lib/slash-commands";

interface ToolChipProps {
  command: SlashCommand;
  onRemove: () => void;
}

export function ToolChip({ command, onRemove }: ToolChipProps) {
  return (
    <Badge variant="secondary" className="gap-1 pl-2 pr-1">
      {command.label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
        aria-label={`Remove ${command.label}`}
      >
        <IconX className="size-3" />
      </button>
    </Badge>
  );
}
