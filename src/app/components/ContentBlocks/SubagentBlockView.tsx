"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Bot,
  Loader2,
  CircleCheckBigIcon,
  AlertCircle,
} from "lucide-react";
import type { SubagentBlock, ContentBlock } from "@/types";
import { cn } from "@/lib/utils";

// 导入自身用于递归渲染
import { ContentBlocksRenderer } from "./index";

interface SubagentBlockViewProps {
  block: SubagentBlock;
  cid?: string;
}

/**
 * SubagentBlockView - 渲染子代理调用块
 * 
 * 基于 WEBSOCKET_FRONTEND_GUIDE.md 新架构：
 * - 显示子代理名称、任务描述、状态
 * - 可展开查看嵌套的 childBlocks（工具调用等）
 * - 支持递归渲染嵌套内容
 */
export const SubagentBlockView = React.memo<SubagentBlockViewProps>(
  ({ block, cid }) => {
    const [isExpanded, setIsExpanded] = useState(true); // 默认展开

    const { subagentName, subagentDisplayName, taskDescription, status, durationMs, childBlocks } = block;

    const statusIcon = useMemo(() => {
      switch (status) {
        case "success":
          return <CircleCheckBigIcon size={14} className="text-green-500 dark:text-green-400" />;
        case "error":
          return <AlertCircle size={14} className="text-destructive" />;
        case "running":
          return <Loader2 size={14} className="animate-spin text-blue-500 dark:text-blue-400" />;
        default:
          return <Bot size={14} className="text-primary" />;
      }
    }, [status]);

    const statusBorderClass = useMemo(() => {
      switch (status) {
        case "running":
          return "border-l-blue-500 dark:border-l-blue-400";
        case "success":
          return "border-l-green-500 dark:border-l-green-400";
        case "error":
          return "border-l-destructive";
        default:
          return "border-l-primary";
      }
    }, [status]);

    const toggleExpanded = useCallback(() => {
      setIsExpanded((prev) => !prev);
    }, []);

    // 格式化执行时间
    const formattedDuration = useMemo(() => {
      if (!durationMs) return null;
      if (durationMs < 1000) return `${durationMs}ms`;
      return `${(durationMs / 1000).toFixed(1)}s`;
    }, [durationMs]);

    return (
      <div
        className={cn(
          "subagent-block border-l-[3px] ml-2 pl-3",
          statusBorderClass
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2 py-2 cursor-pointer",
            "hover:bg-muted/30 transition-colors rounded-r-md px-2 -ml-2"
          )}
          onClick={toggleExpanded}
        >
          {statusIcon}
          <Bot size={14} className="text-primary" />
          <span className="font-medium text-sm">
            {subagentDisplayName || subagentName}
          </span>
          {taskDescription && (
            <span className="text-xs text-muted-foreground truncate flex-1 ml-2">
              {taskDescription}
            </span>
          )}
          {formattedDuration && (
            <span className="text-xs text-muted-foreground ml-auto">
              {formattedDuration}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp size={14} className="text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
          )}
        </div>

        {/* Child Blocks (嵌套内容) */}
        {isExpanded && childBlocks && childBlocks.length > 0 && (
          <div className="subagent-content pl-4 border-l border-dashed border-border/50 ml-2 mt-2 mb-2">
            <ContentBlocksRenderer blocks={childBlocks} cid={cid} />
          </div>
        )}

        {/* Empty State */}
        {isExpanded && (!childBlocks || childBlocks.length === 0) && status === "running" && (
          <div className="pl-4 py-2 text-xs text-muted-foreground italic">
            正在执行...
          </div>
        )}
      </div>
    );
  }
);
SubagentBlockView.displayName = "SubagentBlockView";

