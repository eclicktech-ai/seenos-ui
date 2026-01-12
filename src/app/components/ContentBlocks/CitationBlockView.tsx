"use client";

import React, { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import type { CitationBlock } from "@/types";
import { cn } from "@/lib/utils";

interface CitationBlockViewProps {
  block: CitationBlock;
}

/**
 * CitationBlockView - 渲染引用来源块
 * 
 * 基于 WEBSOCKET_FRONTEND_GUIDE.md 新架构：
 * - 显示文件名、相似度分数
 * - 可展开查看完整引用内容
 */
export const CitationBlockView = React.memo<CitationBlockViewProps>(
  ({ block }) => {
    const { filename, content, similarity } = block;
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpanded = () => {
      setIsExpanded((prev) => !prev);
    };

    // 格式化相似度分数
    const formattedSimilarity = similarity
      ? `${(similarity * 100).toFixed(0)}%`
      : null;

    return (
      <div className="citation-block rounded-lg border border-border bg-muted/30">
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 cursor-pointer",
            "hover:bg-muted/50 transition-colors"
          )}
          onClick={toggleExpanded}
        >
          <FileText size={14} className="text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate flex-1">
            {filename}
          </span>
          {formattedSimilarity && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {formattedSimilarity}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp size={14} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={14} className="text-muted-foreground" />
          )}
        </div>

        {/* Content */}
        {isExpanded && content && (
          <div className="border-t border-border px-3 py-2">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {content}
            </p>
          </div>
        )}

        {/* Preview (collapsed) */}
        {!isExpanded && content && (
          <div className="px-3 pb-2">
            <p className="text-xs text-muted-foreground line-clamp-2">
              {content}
            </p>
          </div>
        )}
      </div>
    );
  }
);
CitationBlockView.displayName = "CitationBlockView";

