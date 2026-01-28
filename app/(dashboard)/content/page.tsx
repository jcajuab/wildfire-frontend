"use client";

import { useState, useCallback } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout";
import {
  ContentStatusTabs,
  ContentFilterPopover,
  ContentSortSelect,
  ContentSearchInput,
  Pagination,
  CreateContentDialog,
  ContentGrid,
} from "@/components/content";
import type { StatusFilter, TypeFilter } from "@/components/content";
import type { Content, ContentSortField } from "@/types/content";

// Mock data for demonstration - will be replaced with API data
const mockContents: Content[] = [];

export default function ContentPage(): React.ReactElement {
  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortBy, setSortBy] = useState<ContentSortField>("recent");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Content state (mock)
  const [contents, setContents] = useState<Content[]>(mockContents);

  // Pagination
  const pageSize = 20;

  // Handlers
  const handleCreateFromScratch = useCallback((name: string) => {
    const newContent: Content = {
      id: crypto.randomUUID(),
      title: name,
      type: "PDF",
      mimeType: "application/pdf",
      fileSize: 0,
      checksum: "",
      width: null,
      height: null,
      duration: null,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      createdBy: {
        id: "1",
        name: "Admin",
      },
    };
    setContents((prev) => [newContent, ...prev]);
  }, []);

  const handleUploadFile = useCallback((name: string, file: File) => {
    const newContent: Content = {
      id: crypto.randomUUID(),
      title: name,
      type: "PDF",
      mimeType: file.type,
      fileSize: file.size,
      checksum: "",
      width: null,
      height: null,
      duration: null,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      createdBy: {
        id: "1",
        name: "Admin",
      },
    };
    setContents((prev) => [newContent, ...prev]);
  }, []);

  const handleEdit = useCallback((content: Content) => {
    // TODO: Navigate to edit page
    console.log("Edit content:", content.id);
  }, []);

  const handlePreview = useCallback((content: Content) => {
    // TODO: Open preview modal
    console.log("Preview content:", content.id);
  }, []);

  const handleDelete = useCallback((content: Content) => {
    // TODO: Show confirmation dialog
    setContents((prev) => prev.filter((c) => c.id !== content.id));
  }, []);

  // Filter contents based on current filters
  const filteredContents = contents.filter((content) => {
    // Status filter
    if (statusFilter !== "all" && content.status !== statusFilter) {
      return false;
    }

    // Type filter
    if (typeFilter !== "all" && content.type !== typeFilter) {
      return false;
    }

    // Search filter
    if (search && !content.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    return true;
  });

  // Sort contents
  const sortedContents = [...filteredContents].sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "size":
        return b.fileSize - a.fileSize;
      case "type":
        return a.type.localeCompare(b.type);
      case "recent":
      default:
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  });

  // Paginate contents
  const paginatedContents = sortedContents.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Content">
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <IconPlus className="size-4" />
          Create Content
        </Button>
      </PageHeader>

      <div className="flex flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b px-6 py-3">
          <ContentStatusTabs
            value={statusFilter}
            onValueChange={setStatusFilter}
          />

          <div className="flex items-center gap-2">
            <ContentFilterPopover
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
            />
            <ContentSortSelect value={sortBy} onValueChange={setSortBy} />
            <ContentSearchInput value={search} onChange={setSearch} />
          </div>
        </div>

        {/* Content grid */}
        <div className="flex-1 overflow-auto">
          <ContentGrid
            items={paginatedContents}
            onEdit={handleEdit}
            onPreview={handlePreview}
            onDelete={handleDelete}
          />
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={sortedContents.length}
          onPageChange={setPage}
        />
      </div>

      {/* Create Content Dialog */}
      <CreateContentDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateFromScratch={handleCreateFromScratch}
        onUploadFile={handleUploadFile}
      />
    </div>
  );
}
