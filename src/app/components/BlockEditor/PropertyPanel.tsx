"use client";

/**
 * PropertyPanel - Block 属性编辑面板
 * 
 * 根据选中的 Block 类型动态渲染对应的编辑器组件。
 * 使用 editors/ 目录下的专用编辑器。
 */

import React, { useCallback } from "react";
import { Settings } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditorStore, useSelectedBlock } from "./stores/editorStore";
import { getBlockEditor, type BlockEditorProps } from "./editors";
import type { ContentBlock, BlockType } from "./types";

/** Block 类型标签映射 */
const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
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
  call_to_action: "Call to Action",
  testimonial: "Testimonial",
  pricing: "Pricing",
  faq: "FAQ",
  comparison_row: "Comparison Row",
};

export const PropertyPanel = React.memo(() => {
  const selectedBlock = useSelectedBlock();
  const { updateBlock, pushHistory } = useEditorStore();

  // 处理 Block 变更
  const handleBlockChange = useCallback(
    (updatedBlock: ContentBlock) => {
      if (selectedBlock) {
        // 推送历史记录（用于撤销/重做）
        pushHistory();
        
        // 更新 Block（保留 meta 信息）
        updateBlock(selectedBlock.meta.id, {
          ...updatedBlock,
          meta: {
            ...selectedBlock.meta,
            last_edited_at: new Date().toISOString(),
          },
        });
      }
    },
    [selectedBlock, updateBlock, pushHistory]
  );

  // 无选中 Block 时的空状态
  if (!selectedBlock) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-4">
          <Settings size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Properties</span>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="text-center">
            <Settings size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Select a block to edit its properties
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 获取对应的编辑器组件
  const EditorComponent = getBlockEditor(selectedBlock.meta.type);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {BLOCK_TYPE_LABELS[selectedBlock.meta.type] || "Block"} Properties
          </span>
        </div>
        {/* Block ID 提示（用于调试） */}
        <span className="text-xs text-muted-foreground/50 font-mono">
          #{selectedBlock.meta.order + 1}
        </span>
      </div>

      {/* Editor Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <EditorComponent
            block={selectedBlock}
            onChange={handleBlockChange}
            disabled={false}
          />
        </div>
      </ScrollArea>

      {/* Footer - Block 元信息 */}
      <div className="flex-shrink-0 border-t border-border bg-muted/20 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Type: {selectedBlock.meta.type}</span>
          {selectedBlock.meta.is_ai_generated && (
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-600">
              AI Generated
            </span>
          )}
        </div>
        {selectedBlock.meta.last_edited_at && (
          <div className="mt-1 text-xs text-muted-foreground/60">
            Last edited: {new Date(selectedBlock.meta.last_edited_at).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
});

PropertyPanel.displayName = "PropertyPanel";

export default PropertyPanel;
