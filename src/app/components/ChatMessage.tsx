"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Bot, User, FileText, ChevronDown, ChevronUp, Coins } from "lucide-react";
import { MarkdownContent } from "@/app/components/MarkdownContent";
import { ContentBlocksRenderer, AttachmentRefBlockView } from "@/app/components/ContentBlocks";
import { FeedbackButtons } from "@/app/components/FeedbackButtons";
import type {
  ToolCall,
  ActionRequest,
  ReviewConfig,
  Message,
  ContextSearchResult,
  TokenUsageSummary,
  ContentBlock,
  AttachmentRefBlock,
  ToolProgress,
  Feedback,
} from "@/app/types/types";
import { extractStringFromMessageContent } from "@/app/utils/utils";
import { cn } from "@/lib/utils";

// 思考中动画组件 - 动态跳动的三个点
const ThinkingIndicator = React.memo(() => {
  return (
    <div className="flex items-center gap-1">
      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" />
    </div>
  );
});
ThinkingIndicator.displayName = "ThinkingIndicator";

// Citations 组件 - 显示引用来源
const CitationsSection = React.memo<{ citations: ContextSearchResult[] }>(({ citations }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 过滤掉无效的 citations（没有内容或相似度过低）
  const validCitations = citations?.filter(cite => 
    cite && 
    cite.content && 
    cite.content.trim() !== '' && 
    cite.similarity > 0  // 确保有有效的相似度分数
  ) || [];

  if (validCitations.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/30">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          <span>Sources ({validCitations.length})</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
      
      {isExpanded && (
        <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
          {validCitations.map((cite, index) => (
            <div
              key={`${cite.contextId}-${cite.chunkIndex}`}
              className="rounded-md border border-border bg-background p-2.5"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">
                  [{index + 1}] {cite.filename}
                </span>
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {(cite.similarity * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {cite.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
CitationsSection.displayName = "CitationsSection";

// Token Usage 组件 - 显示 token 使用量
// 兼容两种格式：
// 1. 后端历史消息格式: { promptTokens, completionTokens, totalCost }
// 2. 前端完整格式: { totalTokens, promptTokens, completionTokens, totalCost, callCount }
const TokenUsageDisplay = React.memo<{ usage: TokenUsageSummary | { promptTokens?: number; completionTokens?: number; totalCost?: number } }>(({ usage }) => {
  if (!usage) return null;

  // 计算 totalTokens：优先使用 totalTokens，否则用 promptTokens + completionTokens
  const promptTokens = (usage as TokenUsageSummary).promptTokens ?? 0;
  const completionTokens = (usage as TokenUsageSummary).completionTokens ?? 0;
  const totalTokens = (usage as TokenUsageSummary).totalTokens ?? (promptTokens + completionTokens);
  
  // 如果没有任何 token 数据，不显示
  if (totalTokens === 0) return null;

  const totalCost = (usage as TokenUsageSummary).totalCost ?? 0;
  const callCount = (usage as TokenUsageSummary).callCount ?? 1;

  return (
    <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
      <Coins className="h-3 w-3" />
      <span>{totalTokens.toLocaleString()} tokens</span>
      {totalCost > 0 && (
        <>
          <span>•</span>
          <span>${totalCost.toFixed(4)}</span>
        </>
      )}
      {callCount > 1 && (
        <>
          <span>•</span>
          <span>{callCount} calls</span>
        </>
      )}
    </div>
  );
});
TokenUsageDisplay.displayName = "TokenUsageDisplay";

// 兼容 LangGraph 和自定义消息格式
type MessageLike = Message | {
  id?: string;
  type?: string;
  role?: string;
  content: string | Array<{ type?: string; text?: string }> | null;
  tool_calls?: Array<{
    id?: string;
    name?: string;
    args?: Record<string, unknown>;
  }>;
  additional_kwargs?: Record<string, unknown>;
  tool_call_id?: string;
};

interface ChatMessageProps {
  message: MessageLike;
  toolCalls: ToolCall[];
  isLoading?: boolean;
  isThinking?: boolean;  // 是否正在等待 Assistant 响应
  actionRequestsMap?: Map<string, ActionRequest>;
  reviewConfigsMap?: Map<string, ReviewConfig>;
  ui?: unknown[];
  stream?: unknown;
  onResumeInterrupt?: (value: unknown) => void;
  graphId?: string;
  /** 是否启用淡入动画（用于渐进加载历史消息） */
  animate?: boolean;
  /** 工具进度信息 (toolCallId -> ToolProgress) - 用于实时进度显示 */
  toolProgress?: Map<string, ToolProgress>;
  /** 工具进度信息 (toolName -> ToolProgress) - 用于处理后端 toolCallId 不一致的问题 */
  toolProgressByName?: Map<string, ToolProgress>;
}

export const ChatMessage = React.memo<ChatMessageProps>(
  ({
    message,
    toolCalls,
    isLoading,
    isThinking,
    actionRequestsMap,
    reviewConfigsMap,
    ui,
    stream,
    onResumeInterrupt,
    graphId,
    animate = false,
    toolProgress,
    toolProgressByName,
  }) => {
    // 从 localStorage 读取 showTokenUsage 设置
    // AuthProvider 在登录和更新设置时会同步更新 localStorage
    // 默认开启 token 显示
    const SETTINGS_KEY = "deep_agents_settings";
    const [showTokenUsage, setShowTokenUsage] = useState(true);
    
    useEffect(() => {
      // 从 localStorage 读取设置
      const loadSettings = () => {
        try {
          const settings = localStorage.getItem(SETTINGS_KEY);
          if (settings) {
            const parsed = JSON.parse(settings);
            // 只有明确设置为 false 时才关闭
            setShowTokenUsage(parsed.showTokenUsage !== false);
          }
        } catch {
          // 忽略解析错误，保持默认开启
        }
      };
      
      // 初始加载
      loadSettings();
      
      // 监听 storage 变化（当设置在其他地方更新时，如设置页面）
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === SETTINGS_KEY) {
          loadSettings();
        }
      };
      
      // 监听自定义事件（同一页面内的设置更新）
      const handleSettingsUpdate = () => {
        loadSettings();
      };
      

      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("settings-updated", handleSettingsUpdate);
      
      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("settings-updated", handleSettingsUpdate);
      };
    }, []);
    
    // 兼容 type 和 role 两种格式
    const messageType = (message as { type?: string }).type || (message as { role?: string }).role;
    const isUser = messageType === "human" || messageType === "user";
    
    // 新架构：检查是否有 contentBlocks (WEBSOCKET_FRONTEND_GUIDE.md)
    const contentBlocks = (message as Message).contentBlocks;
    const hasContentBlocks = contentBlocks && contentBlocks.length > 0;
    
    // 提取消息内容：优先从 contentBlocks 中的 text block 获取，否则从 message.content 获取
    const messageContent = useMemo(() => {
      // 先尝试从 contentBlocks 中提取文本
      if (hasContentBlocks) {
        const textBlocks = contentBlocks!.filter(b => b.type === 'text');
        if (textBlocks.length > 0) {
          return textBlocks.map(b => (b as { content?: string }).content || '').join('\n');
        }
      }
      // 回退到传统的 content 字段
      return extractStringFromMessageContent(message);
    }, [message, hasContentBlocks, contentBlocks]);
    
    const hasContent = messageContent && messageContent.trim() !== "";
    const hasToolCalls = toolCalls.length > 0;

    return (
      <div
        className={cn(
          "group flex w-full max-w-full gap-3 overflow-x-hidden py-3",
          isUser ? "flex-row-reverse" : "flex-row",
          animate && "animate-message-fade-in"
        )}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              isUser ? "bg-foreground dark:bg-foreground" : "bg-muted"
            )}
          >
            {isUser ? (
              <User size={16} className="text-background dark:text-background" />
            ) : (
              <Bot size={16} className="text-foreground gradient-icon" />
            )}
          </div>
        </div>

        {/* Message Content */}
        <div
          className={cn(
            
            "min-w-0 flex-1",
            isUser ? "max-w-[70%]" : "max-w-full"
          )}
        >
          {/* Role Label */}
          <div className={cn("mb-1 text-xs font-medium text-muted-foreground", isUser && "text-right")}>
            {isUser ? "You" : "Assistant"}
          </div>

          {/* 用户消息直接显示 */}
          {isUser && (
            <div className="relative flex flex-col items-end gap-2">
              {/* 用户消息中的附件 - 优先从 contentBlocks 渲染 (IMAGE_UPLOAD_FRONTEND_GUIDE.md) */}
              {(() => {
                // 方式 1: 从 contentBlocks 中提取 attachment_ref 类型的附件
                if (hasContentBlocks) {
                  const attachmentBlocks = contentBlocks!.filter(
                    (b): b is AttachmentRefBlock => b.type === 'attachment_ref'
                  );
                  if (attachmentBlocks.length > 0) {
                    return (
                      <div className="flex flex-wrap justify-end gap-2">
                        {attachmentBlocks.map((block) => (
                          <AttachmentRefBlockView key={block.id} block={block} />
                        ))}
                      </div>
                    );
                  }
                }
                
                // 方式 2: 兼容旧格式 - 从 content 数组中提取 image_url 类型
                const content = (message as Message).content;
                if (Array.isArray(content)) {
                  const images = content.filter(
                    (item): item is { type: 'image_url'; image_url: { url: string } } =>
                      item != null && 
                      typeof item === 'object' && 
                      'type' in item &&
                      item.type === 'image_url' && 
                      'image_url' in item &&
                      item.image_url != null &&
                      typeof item.image_url === 'object' &&
                      'url' in item.image_url &&
                      typeof item.image_url.url === 'string'
                  );
                  if (images.length > 0) {
                    return (
                      <div className="flex flex-wrap justify-end gap-2">
                        {images.map((img, idx) => (
                          <div
                            key={idx}
                            className="overflow-hidden rounded-lg border border-border shadow-sm"
                          >
                            <img
                              src={img.image_url.url}
                              alt={`Uploaded image ${idx + 1}`}
                              className="max-h-48 max-w-48 object-cover"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    );
                  }
                }
                return null;
              })()}
              {/* 文本内容 */}
              {hasContent && (
                <div className="overflow-hidden break-words rounded-2xl rounded-tr-sm bg-foreground px-4 py-3 text-sm font-normal leading-[160%] text-background shadow-sm dark:bg-foreground dark:text-background">
                  <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {messageContent}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Assistant 消息 - 使用 contentBlocks 按正确时间顺序渲染 */}
          {!isUser && (
            <div className="w-full">
              {/* contentBlocks 渲染 - 保持正确的时间顺序 */}
              {hasContentBlocks && (
                <ContentBlocksRenderer 
                  blocks={contentBlocks!} 
                  cid={(message as Message).cid}
                  isStreaming={isLoading}
                  toolProgress={toolProgress}
                  toolProgressByName={toolProgressByName}
                />
              )}
              
              {/* 备用渲染：如果没有 contentBlocks 但有 content，直接渲染 */}
              {!hasContentBlocks && hasContent && (
                <div className="rounded-2xl rounded-tl-sm bg-secondary/50 px-4 py-3 dark:bg-secondary/30">
                  <MarkdownContent content={messageContent} />
                </div>
              )}
              
              {/* 思考中动画 - 显示在内容下方，当消息正在加载且内容为空时 */}
              {isLoading && !hasContent && !hasContentBlocks && (
                <div className="relative flex justify-start">
                  <div className="rounded-2xl rounded-tl-sm bg-secondary/50 px-4 py-3 dark:bg-secondary/30">
                    <ThinkingIndicator />
                  </div>
                </div>
              )}
              
              {/* Citations - 显示引用来源 */}
              {(message as Message).metadata?.citations && (
                <CitationsSection citations={(message as Message).metadata!.citations!} />
              )}
              
              {/* Token Usage - 显示 token 使用量（需要用户开启设置） */}
              {showTokenUsage && (message as Message).metadata?.usage && (
                <div className="mt-2">
                  <TokenUsageDisplay usage={(message as Message).metadata!.usage!} />
                </div>
              )}
              
              {/* Feedback Buttons - 反馈按钮（点赞/踩） */}
              {!isLoading && (message as Message).cid && (message as Message).id && (
                <div className="mt-2 flex items-center justify-between">
                  <FeedbackButtons
                    messageId={(message as Message).id}
                    conversationId={(message as Message).cid!}
                    initialFeedback={(message as Message).metadata?.feedback as Feedback | null | undefined}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

ChatMessage.displayName = "ChatMessage";
