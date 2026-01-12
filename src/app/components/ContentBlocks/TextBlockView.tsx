"use client";

import React from "react";
import type { TextBlock } from "@/types";
import { MarkdownContent } from "@/app/components/MarkdownContent";
import { cn } from "@/lib/utils";

interface TextBlockViewProps {
  block: TextBlock;
  cid?: string;
  isStreaming?: boolean;
}

/**
 * TextBlockView - 渲染文本内容块
 * 
 * 支持 Markdown 格式，流式输出时显示光标动画
 */
export const TextBlockView = React.memo<TextBlockViewProps>(
  ({ block, cid, isStreaming }) => {
    const hasContent = block.content && block.content.trim() !== "";

    if (!hasContent) {
      return null;
    }

    return (
      <div
        className={cn(
          "text-block",
          "overflow-hidden break-words rounded-2xl rounded-tl-sm",
          "bg-secondary/50 px-4 py-3 text-sm font-normal leading-[160%] text-foreground",
          "dark:bg-secondary/30",
          isStreaming && "streaming-cursor"
        )}
      >
        <MarkdownContent content={block.content} cid={cid} />
      </div>
    );
  }
);
TextBlockView.displayName = "TextBlockView";

