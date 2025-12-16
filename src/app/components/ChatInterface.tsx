"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  FormEvent,
  useEffect,
} from "react";
import { ArrowUp, Square, RefreshCw, Copy, MessageCircle, MessagesSquare, Plus, Check, Wrench } from "lucide-react";
import { ChatMessage } from "@/app/components/ChatMessage";
import type {
  ToolCall,
  ActionRequest,
  ReviewConfig,
  Message,
} from "@/app/types/types";
import { extractStringFromMessageContent, formatConversationForLLM } from "@/app/utils/utils";
import { useChatContext } from "@/providers/ChatProvider";
import { cn } from "@/lib/utils";
import { useStickToBottom } from "use-stick-to-bottom";
import { useSuggestions } from "@/hooks/useSuggestions";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ConversationList } from "@/app/components/ConversationList";

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
  additional_kwargs?: {
    tool_calls?: Array<{
      id?: string;
      function?: { name?: string; arguments?: unknown };
    }>;
  };
  tool_call_id?: string;
};

export const ChatInterface = React.memo(() => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const allChatsButtonRef = useRef<HTMLButtonElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const [input, setInput] = useState("");
  const [visibleSuggestions, setVisibleSuggestions] = useState(4);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showAllChats, setShowAllChats] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [chatContainerHeight, setChatContainerHeight] = useState(600);
  const { scrollRef, contentRef } = useStickToBottom();

  const {
    messages,
    isLoading,
    isLoadingHistory,
    isConnected,
    interrupt,
    sendMessage,
    stopStream,
    resumeInterrupt,
    error,
    reconnect,
    cid,
    startNewChat,
    switchConversation,
  } = useChatContext();

  // Use suggestions hook
  const { suggestions: allSuggestions, isRefreshing } = useSuggestions({
    cid,
    messages,
    isLoading,
  });


  // 检查是否可以提交
  // 如果没有 cid，允许发送（发送时会自动创建会话）
  // 如果有 cid 但没有连接，禁止发送
  const submitDisabled = isLoading || (!!cid && !isConnected);

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      if (e) {
        e.preventDefault();
      }
      const messageText = input.trim();
      if (!messageText || isLoading || submitDisabled) return;
      sendMessage(messageText);
      setInput("");
    },
    [input, isLoading, sendMessage, setInput, submitDisabled]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (submitDisabled) return;
      // 检查 isComposing 防止中文输入法输入时回车确认拼音导致提前发送
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, submitDisabled]
  );

  // Reset input and visible suggestions count when cid changes
  useEffect(() => {
    setInput("");
    setVisibleSuggestions(4);
  }, [cid]);

  // Handle suggestion click - use full prompt
  const handleSuggestionClick = useCallback((fullPrompt: string) => {
    setInput(fullPrompt);
    textareaRef.current?.focus();
  }, []);

  // Show more suggestions
  const handleShowMore = useCallback(() => {
    setVisibleSuggestions((prev) => Math.min(prev + 4, 20));
  }, []);

  // Reset visible suggestions when suggestions refresh
  const prevIsRefreshingRef = useRef(isRefreshing);
  useEffect(() => {
    if (!prevIsRefreshingRef.current && isRefreshing) {
      // Suggestions are being refreshed, reset visible count
      setVisibleSuggestions(4);
    }
    prevIsRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  // Copy chat to markdown
  const handleCopyChat = useCallback(async () => {
    const markdownContent = formatConversationForLLM(messages);

    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [messages]);

  const handleNewChat = useCallback(() => {
    if (startNewChat) {
      startNewChat();
    }
  }, [startNewChat]);

  // Calculate position based on anchor element
  useEffect(() => {
    if (showAllChats && allChatsButtonRef.current) {
      const rect = allChatsButtonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8, // 8px gap below button
        left: rect.right - 380, // Align right edge with button
      });
    }
  }, [showAllChats]);

  // Calculate chat container height
  useEffect(() => {
    if (chatContainerRef.current) {
      const updateHeight = () => {
        const height = chatContainerRef.current?.clientHeight || 600;
        setChatContainerHeight(height);
      };
      updateHeight();
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }
  }, []);

  const handleConversationSelect = useCallback((selectedCid: string) => {
    setShowAllChats(false);
    if (switchConversation) {
      switchConversation(selectedCid);
    }
  }, [setShowAllChats, switchConversation]);

  // 处理消息，提取工具调用
  const processedMessages = useMemo(() => {
    const messageMap = new Map<
      string,
      { message: MessageLike; toolCalls: ToolCall[] }
    >();

    messages.forEach((message: MessageLike) => {
      const messageId = message.id || `msg-${Math.random()}`;
      const messageType = (message as { type?: string }).type || (message as { role?: string }).role;

      if (messageType === "ai" || messageType === "assistant") {
        // 优先使用消息中已有的 toolCalls（来自后端的完整数据）
        const msgWithToolCalls = message as Message;
        if (msgWithToolCalls.toolCalls && Array.isArray(msgWithToolCalls.toolCalls) && msgWithToolCalls.toolCalls.length > 0) {
          // 直接使用后端提供的 toolCalls，它们已经包含完整信息
          messageMap.set(messageId, {
            message,
            toolCalls: msgWithToolCalls.toolCalls.map(tc => ({
              ...tc,
              // 如果有中断状态，覆盖
              status: interrupt && tc.status === "pending" ? "interrupted" : tc.status,
            })),
          });
          return;
        }

        // 兼容旧格式：从其他字段提取工具调用
        const toolCallsInMessage: Array<{
          id?: string;
          function?: { name?: string; arguments?: unknown };
          name?: string;
          type?: string;
          args?: unknown;
          input?: unknown;
        }> = [];

        // 提取工具调用
        const additionalKwargs = (message as { additional_kwargs?: { tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: unknown } }> } }).additional_kwargs;
        const lgMessage = message as MessageLike;
        if (
          additionalKwargs?.tool_calls &&
          Array.isArray(additionalKwargs.tool_calls)
        ) {
          toolCallsInMessage.push(...additionalKwargs.tool_calls);
        } else if (lgMessage.tool_calls && Array.isArray(lgMessage.tool_calls)) {
          toolCallsInMessage.push(
            ...lgMessage.tool_calls.filter(
              (toolCall: { name?: string }) => toolCall.name !== ""
            )
          );
        } else if (lgMessage.content && Array.isArray(lgMessage.content)) {
          const toolUseBlocks = (lgMessage.content as Array<{ type?: string }>).filter(
            (block) => block.type === "tool_use"
          );
          toolCallsInMessage.push(...toolUseBlocks);
        }

        const toolCallsWithStatus = toolCallsInMessage.map(
          (toolCall) => {
            const name =
              toolCall.function?.name ||
              toolCall.name ||
              toolCall.type ||
              "unknown";
            const args =
              toolCall.function?.arguments ||
              toolCall.args ||
              toolCall.input ||
              {};
            return {
              id: toolCall.id || `tool-${Math.random()}`,
              name,
              args: args as Record<string, unknown>,
              status: interrupt ? "interrupted" : ("pending" as const),
            } as ToolCall;
          }
        );

        messageMap.set(messageId, {
          message,
          toolCalls: toolCallsWithStatus,
        });
      } else if (messageType === "tool") {
        const toolCallId = (message as { tool_call_id?: string }).tool_call_id;
        if (!toolCallId) {
          return;
        }
        for (const [, data] of messageMap.entries()) {
          const toolCallIndex = data.toolCalls.findIndex(
            (tc: ToolCall) => tc.id === toolCallId
          );
          if (toolCallIndex === -1) {
            continue;
          }
          data.toolCalls[toolCallIndex] = {
            ...data.toolCalls[toolCallIndex],
            status: "completed" as const,
            result: extractStringFromMessageContent(message),
          };
          break;
        }
      } else if (messageType === "human" || messageType === "user") {
        messageMap.set(messageId, {
          message,
          toolCalls: [],
        });
      }
    });

    const processedArray = Array.from(messageMap.values());
    return processedArray.map((data, index) => {
      const prevMessage = index > 0 ? processedArray[index - 1].message : null;
      const prevType = prevMessage
        ? (prevMessage as { type?: string }).type || (prevMessage as { role?: string }).role
        : null;
      const currentType =
        (data.message as { type?: string }).type || (data.message as { role?: string }).role;
      return {
        ...data,
        showAvatar: currentType !== prevType,
      };
    });
  }, [messages, interrupt]);

  // 检测是否需要显示 Assistant 思考动画
  // 条件：正在加载 && 最后一条消息是用户消息（或者最后一条 Assistant 消息没有内容）
  const showAssistantThinking = useMemo(() => {
    if (!isLoading) return false;
    if (processedMessages.length === 0) return false;
    
    const lastMessage = processedMessages[processedMessages.length - 1];
    const lastMessageType = (lastMessage.message as { type?: string }).type || 
                           (lastMessage.message as { role?: string }).role;
    
    // 如果最后一条是用户消息，显示思考动画
    if (lastMessageType === "human" || lastMessageType === "user") {
      return true;
    }
    
    // 如果最后一条是 Assistant 消息但没有内容，也显示思考动画
    if (lastMessageType === "ai" || lastMessageType === "assistant") {
      const content = extractStringFromMessageContent(lastMessage.message);
      const hasToolCalls = lastMessage.toolCalls.length > 0;
      if (!content?.trim() && !hasToolCalls) {
        return true;
      }
    }
    
    return false;
  }, [isLoading, processedMessages]);

  // 解析中断数据中的 action requests 和 review configs
  const actionRequestsMap: Map<string, ActionRequest> | null = useMemo(() => {
    const actionRequests =
      interrupt?.value && (interrupt.value as Record<string, unknown>)["action_requests"];
    if (!actionRequests || !Array.isArray(actionRequests)) return new Map<string, ActionRequest>();
    return new Map(actionRequests.map((ar: ActionRequest) => [ar.name, ar]));
  }, [interrupt]);

  const reviewConfigsMap: Map<string, ReviewConfig> | null = useMemo(() => {
    const reviewConfigs =
      interrupt?.value && (interrupt.value as Record<string, unknown>)["review_configs"];
    if (!reviewConfigs || !Array.isArray(reviewConfigs)) return new Map<string, ReviewConfig>();
    return new Map(
      reviewConfigs.map((rc: ReviewConfig) => [rc.actionName, rc])
    );
  }, [interrupt]);

  // 连接状态：只显示一个提示，优先显示错误
  // 只有当有 cid 且不在加载历史记录时才显示连接状态
  // 注意：新会话创建过程中不显示连接状态（isLoading 为 true）
  const showError = error && !isConnected && !!cid;
  // 只有当有 cid、没有连接、没有错误、没有在加载、且不在加载历史时才显示连接提示
  const showConnecting = !isConnected && !error && !isLoading && !isLoadingHistory && !!cid;

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-2">
      {/* Error Banner with Retry Button */}
      {showError && (
        <div className="mb-2 flex flex-shrink-0 items-center justify-between rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2">
          <p className="text-sm text-destructive">{error.message}</p>
          {reconnect && (
            <button
              onClick={reconnect}
              className="flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Chat container with border */}
      <div 
        ref={chatContainerRef}
        className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background"
      >
        {/* Top border with Chat label on left and buttons on right */}
        <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4">
          {/* Left: Chat label */}
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MessageCircle size={16} />
            <span>Chat</span>
          </div>

          {/* Right: Copy, All Chats, +New Chat buttons */}
          <div className="flex items-center gap-1">
            {/* Copy Chat button with text */}
            <button
              type="button"
              onClick={handleCopyChat}
              disabled={messages.length === 0}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50 disabled:hover:bg-transparent"
              title="Copy chat as Markdown"
            >
              {copySuccess ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Copy size={16} />
              )}
              <span>Copy</span>
            </button>

            {/* All Chats button */}
            <button
              ref={allChatsButtonRef}
              type="button"
              onClick={() => setShowAllChats(!showAllChats)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <MessagesSquare size={16} />
              <span>All Chats</span>
            </button>

            {/* +New Chat button */}
            <button
              type="button"
              onClick={handleNewChat}
              disabled={!cid}
              className="flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-sm text-background transition-colors hover:opacity-80 disabled:opacity-50"
            >
              <Plus size={16} />
              <span>New Chat</span>
            </button>
          </div>
        </div>
        {/* Resizable Chat and Input areas */}
        <ResizablePanelGroup
          direction="vertical"
          autoSaveId="chat-input-layout-v3"
          className="flex-1"
        >
          {/* Messages area */}
          <ResizablePanel
            id="messages"
            order={1}
            defaultSize={75}
            minSize={20}
            className="group/chat flex flex-col"
          >
            <div
              className="scrollbar-auto-hide flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
              ref={scrollRef}
            >
              <div
                className="mx-auto w-full max-w-[1024px] px-6 pb-6 pt-4"
                ref={contentRef}
              >
          {/* Connecting Status - 居中显示 */}
          {showConnecting && (
            <div className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          )}

          {/* Loading History - 居中显示 */}
          {isLoadingHistory && processedMessages.length === 0 && (
            <div className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          )}

          {/* Messages List */}
          {processedMessages.length > 0 && (
            <>
              {processedMessages.map((data, index) => {
                const isLastMessage = index === processedMessages.length - 1;
                const messageType = (data.message as { type?: string }).type || 
                                   (data.message as { role?: string }).role;
                const isAssistant = messageType === "ai" || messageType === "assistant";
                
                // 判断这条消息是否正在思考（最后一条 Assistant 消息且没有内容）
                const isThinkingMessage = isLastMessage && isAssistant && isLoading && 
                  !extractStringFromMessageContent(data.message)?.trim() && 
                  data.toolCalls.length === 0;
                
                return (
                  <ChatMessage
                    key={data.message.id || index}
                    message={data.message}
                    toolCalls={data.toolCalls}
                    isLoading={isLoading}
                    isThinking={isThinkingMessage}
                    actionRequestsMap={
                      isLastMessage ? actionRequestsMap : undefined
                    }
                    reviewConfigsMap={
                      isLastMessage ? reviewConfigsMap : undefined
                    }
                    onResumeInterrupt={resumeInterrupt}
                    animate={isLoadingHistory}
                  />
                );
              })}
              
              {/* 如果最后一条是用户消息且正在加载，显示 Assistant 思考占位符 */}
              {showAssistantThinking && (() => {
                const lastMessage = processedMessages[processedMessages.length - 1];
                const lastMessageType = (lastMessage?.message as { type?: string }).type || 
                                       (lastMessage?.message as { role?: string }).role;
                const isLastUser = lastMessageType === "human" || lastMessageType === "user";
                
                if (isLastUser) {
                  return (
                    <ChatMessage
                      key="thinking-placeholder"
                      message={{ id: "thinking", role: "assistant", content: "" }}
                      toolCalls={[]}
                      isLoading={true}
                      isThinking={true}
                    />
                  );
                }
                return null;
              })()}
            </>
          )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle className="relative h-2 bg-border/20 hover:bg-border/40 transition-colors cursor-row-resize before:absolute before:inset-x-0 before:top-1/2 before:h-[1px] before:-translate-y-1/2 before:bg-border/60 hover:before:bg-border/80" />

          {/* Input area - default ~200px (25%), min ~200px, max 80% */}
          <ResizablePanel
            id="input"
            order={2}
            defaultSize={25}
            minSize={15}
            maxSize={80}
            className="flex min-h-[200px] flex-col"
          >
            <div className="flex flex-1 flex-col bg-background px-4 pb-4 pt-2">
              <form
                onSubmit={handleSubmit}
                className={cn(
                  "flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card",
                  "transition-colors duration-200 ease-in-out"
                )}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isLoading ? "Running..." : "Write your message..."}
                  className="font-inherit flex-1 resize-none border-0 bg-transparent px-[18px] py-3 text-sm leading-6 text-primary outline-none placeholder:text-tertiary"
                />
                <div className="flex flex-shrink-0 items-end justify-between gap-2 px-3 pb-3">
                  {/* Suggestion prompts - left side */}
                  <div
                    className={cn(
                      "flex flex-wrap items-center gap-1.5",
                      isRefreshing && "animate-pulse"
                    )}
                  >
                    {allSuggestions.slice(0, visibleSuggestions).map((suggestion, index) => (
                      <button
                        key={`${suggestion.short}-${index}`}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion.full)}
                        disabled={isLoading}
                        title={suggestion.full}
                        className={cn(
                          "rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground",
                          "transition-all duration-200 hover:border-primary/50 hover:bg-accent hover:text-foreground",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          isRefreshing && "animate-in fade-in slide-in-from-left-2 duration-300"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {suggestion.short}
                      </button>
                    ))}
                    {visibleSuggestions < 20 && allSuggestions.length > visibleSuggestions && (
                      <button
                        type="button"
                        onClick={handleShowMore}
                        disabled={isLoading}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground",
                          "transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        <Wrench size={12} className="text-muted-foreground" />
                        <span>Tools</span>
                      </button>
                    )}
                    {isRefreshing && (
                      <RefreshCw size={12} className="animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Send button - right side */}
                  <Button
                    type={isLoading ? "button" : "submit"}
                    variant={isLoading ? "destructive" : "default"}
                    onClick={isLoading ? stopStream : handleSubmit}
                    disabled={!isLoading && (submitDisabled || !input.trim())}
                  >
                    {isLoading ? (
                      <>
                        <Square size={14} />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <ArrowUp size={18} />
                        <span>Send</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* All Chats Overlay - positioned as dropdown from All Chats button */}
      {showAllChats && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowAllChats(false)}
          />

          {/* Overlay Panel */}
          <div
            className="fixed z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg"
            style={{
              top: position.top,
              left: Math.max(16, position.left), // Ensure minimum 16px from left edge
              width: 380,
              height: Math.min(chatContainerHeight - 16, 600), // Max 600px or chat area height
              maxHeight: "calc(100vh - 100px)",
            }}
          >
            <div className="relative flex-1 overflow-hidden">
              <ConversationList
                onSelect={handleConversationSelect}
                onClose={() => setShowAllChats(false)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";
