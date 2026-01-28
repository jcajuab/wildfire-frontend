"use client";

import { ContentCard } from "./content-card";
import type { Content } from "@/types/content";

interface ContentGridProps {
  readonly items: readonly Content[];
  readonly onEdit: (content: Content) => void;
  readonly onPreview: (content: Content) => void;
  readonly onDelete: (content: Content) => void;
}

export function ContentGrid({
  items,
  onEdit,
  onPreview,
  onDelete,
}: ContentGridProps): React.ReactElement {
  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">No content found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((content) => (
        <ContentCard
          key={content.id}
          content={content}
          onEdit={onEdit}
          onPreview={onPreview}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
