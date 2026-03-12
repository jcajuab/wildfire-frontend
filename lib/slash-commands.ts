export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  toolName: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "create-flash-content",
    label: "Create Flash",
    description: "Create a flash alert message",
    toolName: "create_flash_content",
  },
  {
    id: "create-playlist",
    label: "Create Playlist",
    description: "Create a new playlist",
    toolName: "create_playlist",
  },
  {
    id: "create-schedule",
    label: "Create Schedule",
    description: "Create a schedule",
    toolName: "create_schedule",
  },
  {
    id: "create-text-content",
    label: "Create Text Content",
    description: "Create text-based content",
    toolName: "create_text_content",
  },
  {
    id: "delete-content",
    label: "Delete Content",
    description: "Delete content",
    toolName: "delete_content",
  },
  {
    id: "delete-playlist",
    label: "Delete Playlist",
    description: "Delete playlist",
    toolName: "delete_playlist",
  },
  {
    id: "delete-schedule",
    label: "Delete Schedule",
    description: "Delete schedule",
    toolName: "delete_schedule",
  },
  {
    id: "edit-content",
    label: "Edit Content",
    description: "Edit existing content",
    toolName: "edit_content",
  },
  {
    id: "edit-playlist",
    label: "Edit Playlist",
    description: "Edit existing playlist",
    toolName: "edit_playlist",
  },
  {
    id: "edit-schedule",
    label: "Edit Schedule",
    description: "Edit existing schedule",
    toolName: "edit_schedule",
  },
  {
    id: "list-content",
    label: "List Content",
    description: "List your content",
    toolName: "list_content",
  },
  {
    id: "list-displays",
    label: "List Displays",
    description: "List available displays",
    toolName: "list_displays",
  },
  {
    id: "list-playlists",
    label: "List Playlists",
    description: "List your playlists",
    toolName: "list_playlists",
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
