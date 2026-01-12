"use client";

import React, { useCallback, useState, useContext } from "react";
import { FileText, Star, Tag, Loader2, ChevronRight } from "lucide-react";
import type { ActionCardBlock, ContentItemOption, ContentSelectionMessage } from "@/types";
import { ChatContext } from "@/providers/ChatProvider";
import { cn } from "@/lib/utils";

interface ActionCardBlockViewProps {
  block: ActionCardBlock;
}

// 页面类型显示名称
const PAGE_TYPE_LABELS: Record<string, string> = {
  blog: "博客文章",
  guide: "指南",
  comparison: "对比评测",
  listicle: "清单文章",
  landing_page: "落地页",
};

// 页面类型颜色
const PAGE_TYPE_COLORS: Record<string, string> = {
  blog: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  guide: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  comparison: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  listicle: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  landing_page: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

// 角色徽章颜色
const ROLE_COLORS: Record<string, string> = {
  Pillar: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 dark:border-amber-700",
  Cluster: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border-slate-300 dark:border-slate-600",
};

/**
 * ActionCardBlockView - 渲染内容选择卡片
 * 
 * 基于 CONTENT_SELECTION_FRONTEND_GUIDE.md 实现：
 * - 显示可选择的内容项列表
 * - 点击后发送结构化 JSON 消息给后端
 * - 后端自动激活对应的 Writer Skill
 */
export const ActionCardBlockView = React.memo<ActionCardBlockViewProps>(
  ({ block }) => {
    // 使用可选的 context，避免在没有 ChatProvider 时抛出错误
    const chatContext = useContext(ChatContext);
    const sendMessage = chatContext?.sendMessage;
    const isLoading = chatContext?.isLoading ?? false;
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    const handleItemClick = useCallback(
      (item: ContentItemOption) => {
        if (isLoading || selectedItemId || !sendMessage) return;

        setSelectedItemId(item.id);

        // 构建选择消息
        const displayMessage = block.actionTemplate.replace("{title}", item.title);
        const message: ContentSelectionMessage = {
          action: "generate_content",
          item_id: item.id,
          display: displayMessage,
        };

        // 发送 JSON 格式消息
        sendMessage(JSON.stringify(message));
      },
      [block.actionTemplate, sendMessage, isLoading, selectedItemId]
    );

    // 渲染优先级星星
    const renderPriority = (priority: number) => {
      return (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={12}
              className={cn(
                i < priority
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/30"
              )}
            />
          ))}
        </div>
      );
    };

    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        {/* 卡片头部 */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground mb-1">
            {block.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {block.description}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Tag size={12} />
            <span>Topic Cluster: {block.clusterName}</span>
          </div>
        </div>

        {/* 内容项列表 */}
        <div className="space-y-2">
          {block.items.map((item) => {
            const isSelected = selectedItemId === item.id;
            const isDisabled = isLoading || (selectedItemId !== null && !isSelected);

            return (
              <button
                key={item.id}
                data-item-id={item.id}
                onClick={() => handleItemClick(item)}
                disabled={isDisabled}
                className={cn(
                  "w-full text-left rounded-lg border p-3 transition-all",
                  "hover:border-primary/50 hover:bg-accent/50",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-border",
                  isSelected && "border-primary bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* 左侧内容 */}
                  <div className="flex-1 min-w-0">
                    {/* 标题行 */}
                    <div className="flex items-center gap-2 mb-1.5">
                      {/* 角色徽章 */}
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                          ROLE_COLORS[item.role] || ROLE_COLORS.Cluster
                        )}
                      >
                        {item.role}
                      </span>
                      {/* 页面类型 */}
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                          PAGE_TYPE_COLORS[item.page_type] || "bg-gray-100 text-gray-600"
                        )}
                      >
                        {PAGE_TYPE_LABELS[item.page_type] || item.page_type}
                      </span>
                    </div>

                    {/* 标题 */}
                    <h4 className="text-sm font-medium text-foreground truncate mb-1">
                      {item.title}
                    </h4>

                    {/* 关键词和优先级 */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText size={12} />
                        <span className="truncate max-w-[150px]">
                          {item.target_keyword}
                        </span>
                      </div>
                      {renderPriority(item.priority)}
                    </div>

                    {/* SEO 信息（可选） */}
                    {(item.keyword_volume || item.keyword_difficulty) && (
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/70">
                        {item.keyword_volume && (
                          <span>搜索量: {item.keyword_volume.toLocaleString()}</span>
                        )}
                        {item.keyword_difficulty && (
                          <span>难度: {item.keyword_difficulty}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 右侧箭头/加载 */}
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8">
                    {isSelected && isLoading ? (
                      <Loader2 size={16} className="animate-spin text-primary" />
                    ) : (
                      <ChevronRight
                        size={16}
                        className={cn(
                          "text-muted-foreground transition-transform",
                          "group-hover:translate-x-0.5"
                        )}
                      />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 底部提示 */}
        {block.items.length > 0 && !selectedItemId && (
          <p className="mt-3 text-xs text-muted-foreground text-center">
            点击选择要生成的内容
          </p>
        )}
      </div>
    );
  }
);

ActionCardBlockView.displayName = "ActionCardBlockView";

