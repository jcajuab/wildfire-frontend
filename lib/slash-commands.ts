export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  category: "Content" | "Playlist" | "Schedule";
  toolName: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "create-content",
    label: "Create Content",
    description: "Create text-based content",
    category: "Content",
    toolName: "create_text_content",
  },
  {
    id: "edit-content",
    label: "Edit Content",
    description: "Edit existing content",
    category: "Content",
    toolName: "edit_content",
  },
  {
    id: "delete-content",
    label: "Delete Content",
    description: "Delete content",
    category: "Content",
    toolName: "delete_content",
  },
  {
    id: "create-playlist",
    label: "Create Playlist",
    description: "Create a new playlist",
    category: "Playlist",
    toolName: "create_playlist",
  },
  {
    id: "edit-playlist",
    label: "Edit Playlist",
    description: "Edit existing playlist",
    category: "Playlist",
    toolName: "edit_playlist",
  },
  {
    id: "delete-playlist",
    label: "Delete Playlist",
    description: "Delete playlist",
    category: "Playlist",
    toolName: "delete_playlist",
  },
  {
    id: "create-schedule",
    label: "Create Schedule",
    description: "Create a schedule",
    category: "Schedule",
    toolName: "create_schedule",
  },
  {
    id: "edit-schedule",
    label: "Edit Schedule",
    description: "Edit existing schedule",
    category: "Schedule",
    toolName: "edit_schedule",
  },
  {
    id: "delete-schedule",
    label: "Delete Schedule",
    description: "Delete schedule",
    category: "Schedule",
    toolName: "delete_schedule",
  },
];

export function filterCommands(query: string): SlashCommand[] {
  const lower = query.toLowerCase();
  return SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.id.includes(lower) ||
      cmd.label.toLowerCase().includes(lower) ||
      cmd.toolName.includes(lower),
  );
}

export function groupByCategory(
  commands: SlashCommand[],
): Record<string, SlashCommand[]> {
  const groups: Record<string, SlashCommand[]> = {};
  for (const cmd of commands) {
    (groups[cmd.category] ??= []).push(cmd);
  }
  return groups;
}
