"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDuration } from "@/lib/formatters";
import type { Content } from "@/types/content";
import type {
  PlaylistDetail,
  PlaylistItem,
  PlaylistItemContent,
} from "@/types/playlist";
import { type DraftItem } from "./sortable-item-row";
import { PlaylistFormBody } from "./playlist-form-body";

export type PlaylistSelectableContent = Content & {
  readonly type: PlaylistItemContent["type"];
};

function toDrafts(items: readonly PlaylistItem[]): DraftItem[] {
  return items.map((item) => ({
    id: item.id,
    content: item.content,
    duration: item.duration,
    sequence: item.sequence,
  }));
}

export type PlaylistItemsAtomicSnapshot = readonly (
  | { kind: "existing"; itemId: string; duration: number }
  | { kind: "new"; contentId: string; duration: number }
)[];

export interface PlaylistMetadataDraft {
  readonly name: string;
  readonly description: string | null;
}

export interface PlaylistEditorSavePayload {
  readonly metadata: PlaylistMetadataDraft;
  readonly items: PlaylistItemsAtomicSnapshot;
}

export interface EditPlaylistFormState {
  readonly canSave: boolean;
  readonly isSaving: boolean;
  handleCancel: () => void;
  handleSave: () => void;
}

export interface EditPlaylistFormProps {
  readonly playlist: PlaylistDetail;
  readonly availableContent: readonly PlaylistSelectableContent[];
  readonly onSave: (payload: PlaylistEditorSavePayload) => void;
  readonly onCancel?: () => void;
  readonly onStateChange?: (state: EditPlaylistFormState) => void;
  readonly isSaving?: boolean;
}

export function EditPlaylistForm({
  playlist,
  availableContent,
  onSave,
  onCancel,
  onStateChange,
  isSaving = false,
}: EditPlaylistFormProps): ReactElement {
  const [name, setName] = useState(() => playlist.name);
  const [desc, setDesc] = useState(() => playlist.description ?? "");
  const [items, setItems] = useState<DraftItem[]>(() =>
    toDrafts(playlist.items),
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- valid sync pattern for draft reset when the source playlist changes
    setName(playlist.name);
    setDesc(playlist.description ?? "");
    setItems(toDrafts(playlist.items));
  }, [playlist]);

  const totalDuration = useMemo(
    () => items.reduce((sum, item) => sum + item.duration, 0),
    [items],
  );

  const handleSave = useCallback(() => {
    if (isSaving) return;

    const snapshot: PlaylistItemsAtomicSnapshot = items.map((item) =>
      item.id.startsWith("draft-")
        ? { kind: "new", contentId: item.content.id, duration: item.duration }
        : { kind: "existing", itemId: item.id, duration: item.duration },
    );

    onSave({
      metadata: {
        name: name.trim(),
        description: desc.trim().length > 0 ? desc.trim() : null,
      },
      items: snapshot,
    });
  }, [items, isSaving, onSave, desc, name]);

  const handleCancel = useCallback(() => {
    if (isSaving) return;
    setName(playlist.name);
    setDesc(playlist.description ?? "");
    setItems(toDrafts(playlist.items));
    onCancel?.();
  }, [isSaving, onCancel, playlist]);

  useEffect(() => {
    onStateChange?.({ canSave: !isSaving, isSaving, handleCancel, handleSave });
  }, [handleCancel, handleSave, isSaving, onStateChange]);

  return (
    <PlaylistFormBody
      name={name}
      onNameChange={setName}
      description={desc}
      onDescriptionChange={setDesc}
      items={items}
      onItemsChange={setItems}
      availableContent={availableContent}
      isOverDurationLimit={false}
      itemsHeaderSlot={
        <span className="text-sm text-muted-foreground">
          {items.length} items &middot; {formatDuration(totalDuration)}
        </span>
      }
      emptyItemsMessage="No items - add content from the library"
    />
  );
}
