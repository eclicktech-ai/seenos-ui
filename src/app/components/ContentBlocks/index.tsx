"use client";

import React from "react";
import type { ContentBlock, ToolCallBlock, AttachmentRefBlock, ToolProgress } from "@/types";
import { TextBlockView } from "./TextBlockView";
import { ToolCallBlockView } from "./ToolCallBlockView";
import { SubagentBlockView } from "./SubagentBlockView";
import { FileRefBlockView } from "./FileRefBlockView";
import { ImageBlockView } from "./ImageBlockView";
import { CitationBlockView } from "./CitationBlockView";
import { ActionCardBlockView } from "./ActionCardBlockView";
import { AttachmentRefBlockView } from "./AttachmentRefBlockView";

interface ContentBlocksRendererProps {
  blocks: ContentBlock[];
  cid?: string;
  isStreaming?: boolean;
  /** 工具进度信息 (toolCallId -> ToolProgress) - 来自 useProgressStore */
  toolProgress?: Map<string, ToolProgress>;
  /** 工具进度信息 (toolName -> ToolProgress) - 用于处理后端 toolCallId 不一致的问题 */
  toolProgressByName?: Map<string, ToolProgress>;
}

/**
 * ContentBlocksRenderer - 按正确时间顺序渲染消息内容块
 * 
 * 基于 WEBSOCKET_FRONTEND_GUIDE.md 新架构：
 * - 工具调用和文本内容按时间顺序穿插显示
 * - 支持嵌套的子代理调用
 * - 支持文件引用、图片、引用等块类型
 * - 支持实时进度显示 (PROGRESS_EVENTS_FRONTEND_GUIDE.md)
 */
export const ContentBlocksRenderer = React.memo<ContentBlocksRendererProps>(
  ({ blocks, cid, isStreaming, toolProgress, toolProgressByName }) => {
    if (!blocks || blocks.length === 0) {
      return null;
    }

    return (
      <div className="content-blocks flex flex-col gap-3">
        {blocks.map((block) => (
          <ContentBlockItem 
            key={block.id} 
            block={block} 
            cid={cid}
            isStreaming={isStreaming}
            toolProgress={toolProgress}
            toolProgressByName={toolProgressByName}
          />
        ))}
      </div>
    );
  }
);
ContentBlocksRenderer.displayName = "ContentBlocksRenderer";

interface ContentBlockItemProps {
  block: ContentBlock;
  cid?: string;
  isStreaming?: boolean;
  /** 工具进度信息 (toolCallId -> ToolProgress) */
  toolProgress?: Map<string, ToolProgress>;
  /** 工具进度信息 (toolName -> ToolProgress) - 用于处理后端 toolCallId 不一致的问题 */
  toolProgressByName?: Map<string, ToolProgress>;
}

/**
 * ContentBlockItem - 根据块类型渲染对应组件
 */
const ContentBlockItem = React.memo<ContentBlockItemProps>(
  ({ block, cid, isStreaming, toolProgress, toolProgressByName }) => {
    switch (block.type) {
      case "text":
        return <TextBlockView block={block} cid={cid} isStreaming={isStreaming} />;
      case "tool_call": {
        // 获取该工具调用的实时进度
        // 优先按 toolCallId 查找，找不到再按 toolName 查找（处理后端 ID 不一致问题）
        const toolBlock = block as ToolCallBlock;
        const progress = toolProgress?.get(toolBlock.toolCallId) || toolProgressByName?.get(toolBlock.toolName);
        return <ToolCallBlockView block={toolBlock} progress={progress} />;
      }
      case "subagent":
        return <SubagentBlockView block={block} cid={cid} />;
      case "file_ref":
        return <FileRefBlockView block={block} />;
      case "image":
        return <ImageBlockView block={block} />;
      case "citation":
        return <CitationBlockView block={block} />;
      case "action_card":
        return <ActionCardBlockView block={block} />;
      case "attachment_ref":
        return <AttachmentRefBlockView block={block as AttachmentRefBlock} />;
      default:
        // 未知块类型，静默忽略
        console.warn("[ContentBlocks] Unknown block type:", (block as { type: string }).type);
        return null;
    }
  }
);
ContentBlockItem.displayName = "ContentBlockItem";

export { TextBlockView } from "./TextBlockView";
export { ToolCallBlockView } from "./ToolCallBlockView";
export { SubagentBlockView } from "./SubagentBlockView";
export { FileRefBlockView } from "./FileRefBlockView";
export { ImageBlockView } from "./ImageBlockView";
export { CitationBlockView } from "./CitationBlockView";
export { ActionCardBlockView } from "./ActionCardBlockView";
export { AttachmentRefBlockView } from "./AttachmentRefBlockView";

