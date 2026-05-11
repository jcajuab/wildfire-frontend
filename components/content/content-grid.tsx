"use client";

import { memo, type ReactElement } from "react";
import { IconFileUpload } from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { ContentCard } from "./content-card";
import type { Content } from "@/types/content";

interface ContentGridProps {
  readonly items: readonly Content[];
  readonly onEdit?: (content: Content) => void;
  readonly onDelete?: (content: Content) => void;
  readonly onDownload?: (content: Content) => void;
  readonly selectedIds?: ReadonlySet<string>;
  readonly onSelectionChange?: (content: Content, checked: boolean) => void;
  readonly isSelectionMode?: boolean;
}

export const ContentGrid = memo(function ContentGrid({
  items,
  onEdit,
  onDelete,
  onDownload,
  selectedIds,
  onSelectionChange,
  isSelectionMode,
}: ContentGridProps): ReactElement {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No content yet"
        description="Upload a file or create content from scratch to start building playlists."
        icon={<IconFileUpload className="size-7" aria-hidden="true" />}
      />
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
      {items.map((content) => (
        <ContentCard
          key={content.id}
          content={content}
          onEdit={onEdit}
          onDelete={onDelete}
          onDownload={onDownload}
          isSelected={selectedIds?.has(content.id) ?? false}
          onSelectionChange={onSelectionChange}
          isSelectionMode={isSelectionMode}
        />
      ))}
    </div>
  );
});
