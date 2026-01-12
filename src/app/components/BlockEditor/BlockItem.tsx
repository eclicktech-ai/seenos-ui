"use client";

import React, { useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Copy,
  Plus,
  ChevronUp,
  ChevronDown,
  FileText,
  Package,
  ListOrdered,
  Zap,
  AlignLeft,
  Quote,
  MousePointer,
  Image,
  Layout,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditorStore } from "./stores/editorStore";
import type { ContentBlock, BlockType } from "./types";

interface BlockItemProps {
  block: ContentBlock;
  isSelected: boolean;
  onSelect: () => void;
  onAddAfter: () => void;
}

/** Block 类型图标映射 */
const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
  intro: <FileText size={16} />,
  product_card: <Package size={16} />,
  step: <ListOrdered size={16} />,
  feature: <Zap size={16} />,
  text_section: <AlignLeft size={16} />,
  blog_section: <FileText size={16} />,
  conclusion: <CheckCircle size={16} />,
  hero: <Layout size={16} />,
  quote: <Quote size={16} />,
  image: <Image size={16} />,
  video: <Image size={16} />,
  call_to_action: <MousePointer size={16} />,
  testimonial: <Quote size={16} />,
  pricing: <Package size={16} />,
  faq: <FileText size={16} />,
  comparison_row: <AlignLeft size={16} />,
};

/** Block 类型标签映射 */
const BLOCK_LABELS: Record<BlockType, string> = {
  intro: "Intro",
  product_card: "Product Card",
  step: "Step",
  feature: "Feature",
  text_section: "Text Section",
  blog_section: "Blog Section",
  conclusion: "Conclusion",
  hero: "Hero",
  quote: "Quote",
  image: "Image",
  video: "Video",
  call_to_action: "CTA",
  testimonial: "Testimonial",
  pricing: "Pricing",
  faq: "FAQ",
  comparison_row: "Comparison",
};

/** 获取 Block 标题 */
function getBlockTitle(block: ContentBlock): string {
  // 尝试从不同字段获取标题
  if ("headline" in block && block.headline) return block.headline;
  if ("title" in block && block.title) return block.title;
  if ("name" in block && block.name) return block.name;
  if ("question" in block && block.question) return block.question;
  if ("quote" in block && block.quote) {
    const quote = block.quote as string;
    return quote.length > 50 ? quote.substring(0, 50) + "..." : quote;
  }
  if ("content" in block && block.content) {
    const content = block.content as string;
    return content.length > 50 ? content.substring(0, 50) + "..." : content;
  }
  return BLOCK_LABELS[block.meta.type] || "Untitled Block";
}

export const BlockItem = React.memo<BlockItemProps>(
  ({ block, isSelected, onSelect, onAddAfter }) => {
    const { deleteBlock, duplicateBlock, moveBlock, content } = useEditorStore();

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: block.meta.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const blockIndex = content?.blocks.findIndex(
      (b) => b.meta.id === block.meta.id
    ) ?? -1;
    const isFirst = blockIndex === 0;
    const isLast = blockIndex === (content?.blocks.length ?? 0) - 1;

    const handleDelete = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        deleteBlock(block.meta.id);
      },
      [deleteBlock, block.meta.id]
    );

    const handleDuplicate = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        duplicateBlock(block.meta.id);
      },
      [duplicateBlock, block.meta.id]
    );

    const handleMoveUp = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isFirst && blockIndex !== -1) {
          moveBlock(blockIndex, blockIndex - 1);
        }
      },
      [moveBlock, blockIndex, isFirst]
    );

    const handleMoveDown = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isLast && blockIndex !== -1) {
          moveBlock(blockIndex, blockIndex + 1);
        }
      },
      [moveBlock, blockIndex, isLast]
    );

    const handleAddAfter = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddAfter();
      },
      [onAddAfter]
    );

    const title = getBlockTitle(block);
    const icon = BLOCK_ICONS[block.meta.type] || <FileText size={16} />;
    const label = BLOCK_LABELS[block.meta.type] || block.meta.type;

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group relative rounded-lg border bg-card transition-all",
          isSelected
            ? "border-primary ring-2 ring-primary/20"
            : "border-border hover:border-border/80",
          isDragging && "opacity-50 shadow-lg"
        )}
        onClick={onSelect}
      >
        {/* Main Content */}
        <div className="flex items-center gap-3 p-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical size={16} />
          </div>

          {/* Block Icon */}
          <div
            className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md",
              isSelected
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {icon}
          </div>

          {/* Block Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                {label}
              </span>
              {block.meta.is_ai_generated && (
                <span className="rounded bg-purple-100 px-1 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  AI
                </span>
              )}
            </div>
            <p className="truncate text-sm font-medium text-foreground">
              {title}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMoveUp}
              disabled={isFirst}
              className="h-7 w-7 p-0"
              title="Move Up"
            >
              <ChevronUp size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMoveDown}
              disabled={isLast}
              className="h-7 w-7 p-0"
              title="Move Down"
            >
              <ChevronDown size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddAfter}
              className="h-7 w-7 p-0"
              title="Add Block After"
            >
              <Plus size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDuplicate}
              className="h-7 w-7 p-0"
              title="Duplicate"
            >
              <Copy size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
              title="Delete"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

BlockItem.displayName = "BlockItem";

export default BlockItem;

