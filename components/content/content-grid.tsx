"use client";

import type { ReactElement } from "react";
import { IconFileUpload } from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { ContentCard } from "./content-card";
import type { Content } from "@/types/content";

interface ContentGridProps {
  readonly items: readonly Content[];
  readonly onEdit: (content: Content) => void;
  readonly onPreview: (content: Content) => void;
  readonly onDelete: (content: Content) => void;
  readonly onDownload: (content: Content) => void;
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
}

export function ContentGrid({
  items,
  onEdit,
  onPreview,
  onDelete,
  onDownload,
  canUpdate = true,
  canDelete = true,
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((content) => (
        <ContentCard
          key={content.id}
          content={content}
          onEdit={onEdit}
          onPreview={onPreview}
          onDelete={onDelete}
          onDownload={onDownload}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
}
