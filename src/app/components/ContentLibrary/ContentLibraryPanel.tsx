"use client";

/**
 * ContentLibraryPanel - Content Library Panel
 * 
 * Displays projects, topic clusters, and content items.
 * Based on STRUCTURED_CONTENT_FRONTEND_GUIDE.md specification.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  FileText,
  Folder,
  FolderOpen,
  Layers,
  RefreshCw,
  Search,
  Star,
  Edit3,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useContentLibrary } from "@/hooks/useContentLibrary";
import { useEditorStore } from "@/app/components/BlockEditor";
import { PreviewDialog } from "./PreviewDialog";
import type { ContentItemSummary, TopicClusterResponse } from "@/lib/api/client";

// ============ Types ============

interface ContentLibraryPanelProps {
  className?: string;
}

// ============ Constants ============

const PAGE_TYPE_LABELS: Record<string, string> = {
  blog: "Blog",
  guide: "Guide",
  comparison: "Compare",
  listicle: "List",
  landing: "Landing",
  landing_page: "Landing",
};

const PAGE_TYPE_COLORS: Record<string, string> = {
  blog: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  guide: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  comparison: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  listicle: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  landing: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  landing_page: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  in_progress: "In Progress",
  review: "Review",
  published: "Published",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  ready: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  review: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

// ============ Sub Components ============

/** Priority Badge */
const PriorityBadge = React.memo<{ priority: number }>(({ priority }) => {
  if (!priority || priority <= 0) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={10}
          className={cn(
            i < priority
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
});
PriorityBadge.displayName = "PriorityBadge";

/** Cluster List Item */
const ClusterItem = React.memo<{
  cluster: TopicClusterResponse;
  isSelected: boolean;
  onClick: () => void;
}>(({ cluster, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left transition-colors",
        "hover:bg-accent",
        isSelected && "bg-accent"
      )}
    >
      {isSelected ? (
        <FolderOpen size={12} className="text-primary flex-shrink-0" />
      ) : (
        <Folder size={12} className="text-muted-foreground flex-shrink-0" />
      )}
      <span className="flex-1 truncate text-xs">{cluster.name}</span>
      <span className="text-[10px] text-muted-foreground flex-shrink-0">
        {cluster.item_count}
      </span>
    </button>
  );
});
ClusterItem.displayName = "ClusterItem";

/** Content Item Card */
const ContentItemCard = React.memo<{
  item: ContentItemSummary;
  onEdit: () => void;
  onPreview: () => void;
}>(({ item, onEdit, onPreview }) => {
  if (!item) return null;
  
  const pageTypeLabel = PAGE_TYPE_LABELS[item.page_type] || item.page_type || "Unknown";
  const statusLabel = STATUS_LABELS[item.status] || item.status || "Unknown";

  return (
    <div className="rounded-lg border border-border bg-card p-3 hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground line-clamp-2">
            {item.title || "Untitled"}
          </p>
          {item.target_keyword && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {item.target_keyword}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-7 w-7 p-0"
            title="Edit"
          >
            <Edit3 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreview}
            className="h-7 w-7 p-0"
            title="Preview"
          >
            <Eye size={14} />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
            PAGE_TYPE_COLORS[item.page_type] || "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          )}
        >
          {pageTypeLabel}
        </span>
        <span
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
            STATUS_COLORS[item.status] || "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          )}
        >
          {statusLabel}
        </span>
        <PriorityBadge priority={item.priority} />
      </div>
    </div>
  );
});
ContentItemCard.displayName = "ContentItemCard";

// ============ Main Component ============

export const ContentLibraryPanel = React.memo<ContentLibraryPanelProps>(
  ({ className }) => {
    const {
      projects,
      clusters,
      items,
      selectedProject,
      selectedCluster,
      setSelectedProject,
      setSelectedCluster,
      loading,
      error,
      refresh,
      stats,
    } = useContentLibrary();

    const openEditor = useEditorStore((state) => state.openEditor);

    // Search filter
    const [searchQuery, setSearchQuery] = useState("");
    
    // Preview dialog state
    const [previewItemId, setPreviewItemId] = useState<string | null>(null);
    
    const filteredItems = useMemo(() => {
      if (!searchQuery.trim()) return items;
      const query = searchQuery.toLowerCase();
      return items.filter(
        (item) =>
          item?.title?.toLowerCase().includes(query) ||
          item?.target_keyword?.toLowerCase().includes(query)
      );
    }, [items, searchQuery]);

    // Handle edit
    const handleEdit = useCallback(
      (itemId: string) => {
        openEditor(itemId);
      },
      [openEditor]
    );

    // Handle preview - open preview dialog
    const handlePreview = useCallback((itemId: string) => {
      setPreviewItemId(itemId);
    }, []);

    return (
      <div className={cn("flex flex-col h-full", className)}>
        {/* Header - compact */}
        <div className="flex-shrink-0 bg-background border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-primary flex-shrink-0" />
            {/* Project Selector inline with header */}
            <Select
              value={selectedProject || ""}
              onValueChange={(v) => setSelectedProject(v || null)}
            >
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={loading}
              className="h-7 w-7 p-0 flex-shrink-0"
            >
              <RefreshCw
                size={14}
                className={cn(loading && "animate-spin")}
              />
            </Button>
          </div>
        </div>

        {/* Clusters List */}
        {clusters.length > 0 && (
          <div className="flex-shrink-0 border-b border-border px-2 py-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
              <Layers size={10} />
              <span>Clusters ({clusters.length})</span>
            </div>
            <div className="space-y-0.5 max-h-20 overflow-auto">
              <button
                onClick={() => setSelectedCluster(null)}
                className={cn(
                  "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition-colors",
                  "hover:bg-accent",
                  !selectedCluster && "bg-accent"
                )}
              >
                <Folder size={12} className="text-muted-foreground flex-shrink-0" />
                <span className="flex-1 truncate">All Content</span>
                <span className="text-[10px] text-muted-foreground">
                  {stats.itemCount}
                </span>
              </button>
              {clusters.map((cluster) => (
                <ClusterItem
                  key={cluster.id}
                  cluster={cluster}
                  isSelected={selectedCluster === cluster.id}
                  onClick={() => setSelectedCluster(cluster.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex-shrink-0 border-b border-border px-2 py-1.5">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>

        {/* Content Items List - scrollable area */}
        <div className="flex-1 min-h-0 overflow-auto p-3 pb-1">
          {loading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex h-20 flex-col items-center justify-center gap-2">
              <p className="text-xs text-destructive">{error.message}</p>
              <Button variant="outline" size="sm" onClick={refresh}>
                Retry
              </Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex h-20 flex-col items-center justify-center gap-2">
              <FileText size={24} className="text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "No matching content" : "No content yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item, index) => (
                <ContentItemCard
                  key={item?.id || `item-${index}`}
                  item={item}
                  onEdit={() => item?.id && handleEdit(item.id)}
                  onPreview={() => item?.id && handlePreview(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer Stats - fixed at bottom */}
        <div className="flex-shrink-0 bg-muted/50 border-t border-border px-3 py-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{filteredItems.length} / {stats.itemCount} items</span>
            {selectedCluster && (
              <span className="truncate max-w-[120px]">
                {clusters.find((c) => c.id === selectedCluster)?.name}
              </span>
            )}
          </div>
        </div>
        
        {/* Preview Dialog */}
        <PreviewDialog
          itemId={previewItemId}
          onClose={() => setPreviewItemId(null)}
        />
      </div>
    );
  }
);

ContentLibraryPanel.displayName = "ContentLibraryPanel";

export default ContentLibraryPanel;
