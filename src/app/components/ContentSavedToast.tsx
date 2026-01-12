"use client";

/**
 * ContentSavedToast - Content Saved Notification Component
 * 
 * Listens for content_saved events and displays Toast notifications with edit entry.
 * Based on STRUCTURED_CONTENT_FRONTEND_GUIDE.md specification.
 */

import React, { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { FileEdit, Eye } from "lucide-react";
import { useEditorStore } from "@/app/components/BlockEditor";
import type { ContentSavedEventData } from "@/types";

// Page type display names
const PAGE_TYPE_LABELS: Record<string, string> = {
  blog: "Blog Post",
  guide: "Guide",
  comparison: "Comparison",
  listicle: "Listicle",
  landing: "Landing Page",
  landing_page: "Landing Page",
};

interface ContentSavedToastContentProps {
  data: ContentSavedEventData;
  onEdit: () => void;
  onPreview: () => void;
}

/**
 * Toast Content Component
 */
const ContentSavedToastContent = React.memo<ContentSavedToastContentProps>(
  ({ data, onEdit, onPreview }) => {
    const pageTypeLabel = PAGE_TYPE_LABELS[data.page_type] || data.page_type;

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <FileEdit size={18} className="mt-0.5 text-green-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground truncate">
              Content Generated
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {data.title}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {pageTypeLabel} · v{data.content_version}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <FileEdit size={12} />
            Edit
          </button>
          <button
            onClick={onPreview}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-accent transition-colors"
          >
            <Eye size={12} />
            Preview
          </button>
        </div>
      </div>
    );
  }
);

ContentSavedToastContent.displayName = "ContentSavedToastContent";

/**
 * useContentSavedListener Hook
 * 
 * Use this Hook in the app root component to listen for content_saved events.
 */
export function useContentSavedListener() {
  const openEditor = useEditorStore((state) => state.openEditor);

  const handleContentSaved = useCallback(
    (event: CustomEvent<ContentSavedEventData>) => {
      const data = event.detail;
      console.log("[ContentSavedToast] Content saved:", data.title);

      // Show Toast notification
      toast.custom(
        (t) => (
          <ContentSavedToastContent
            data={data}
            onEdit={() => {
              // Dismiss Toast
              toast.dismiss(t);
              // Open editor
              openEditor(data.item_id);
            }}
            onPreview={() => {
              // Dismiss Toast
              toast.dismiss(t);
              // Open preview in new window
              window.open(`/api/content/${data.item_id}/preview`, "_blank");
            }}
          />
        ),
        {
          duration: 10000, // Auto-close after 10 seconds
          className: "content-saved-toast",
        }
      );
    },
    [openEditor]
  );

  useEffect(() => {
    // Listen for content_saved events
    window.addEventListener(
      "seenos:content_saved",
      handleContentSaved as EventListener
    );

    return () => {
      window.removeEventListener(
        "seenos:content_saved",
        handleContentSaved as EventListener
      );
    };
  }, [handleContentSaved]);
}

/**
 * ContentSavedListener Component
 * 
 * Place at app root to listen for content_saved events.
 * 
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <Providers>
 *       <ContentSavedListener />
 *       <MainContent />
 *     </Providers>
 *   );
 * }
 * ```
 */
export const ContentSavedListener = React.memo(() => {
  useContentSavedListener();
  return null;
});

ContentSavedListener.displayName = "ContentSavedListener";

export default ContentSavedListener;
