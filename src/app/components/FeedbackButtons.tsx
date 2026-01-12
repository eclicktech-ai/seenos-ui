"use client";

import React, { useState, useCallback } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeedback } from "@/hooks";
import { FeedbackModal } from "./FeedbackModal";
import type { FeedbackType, FeedbackResponse } from "@/lib/api/client";

interface FeedbackButtonsProps {
  /** 消息 ID */
  messageId: string;
  /** 会话 ID */
  conversationId: string;
  /** 初始反馈状态（从消息的 metadata 中获取） */
  initialFeedback?: FeedbackResponse | null;
  /** 反馈成功回调 */
  onFeedbackChange?: (feedback: FeedbackResponse | null) => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * FeedbackButtons - 消息反馈按钮组件
 * 
 * 基于 FEEDBACK_API_FRONTEND_GUIDE.md 实现：
 * - 两个按钮：ThumbsUp (点赞)、ThumbsDown (踩)
 * - 高亮已选状态（点赞绿色，踩红色）
 * - 点击触发 FeedbackModal
 */
export function FeedbackButtons({
  messageId,
  conversationId,
  initialFeedback,
  onFeedbackChange,
  className,
}: FeedbackButtonsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingType, setPendingType] = useState<FeedbackType | null>(null);

  const {
    feedback,
    isLoading,
    submitFeedback,
    isLiked,
    isDisliked,
  } = useFeedback({
    cid: conversationId,
    messageId,
    initialFeedback,
    onSuccess: onFeedbackChange,
  });

  const handleClick = useCallback((type: FeedbackType) => {
    setPendingType(type);
    setIsModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async (reason: string) => {
    if (!pendingType) return;
    
    await submitFeedback(pendingType, reason);
    setIsModalOpen(false);
    setPendingType(null);
  }, [pendingType, submitFeedback]);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
    setPendingType(null);
  }, []);

  return (
    <>
      <div className={cn("flex items-center gap-1", className)}>
        {/* 点赞按钮 */}
        <button
          onClick={() => handleClick("like")}
          disabled={isLoading}
          className={cn(
            "rounded-md p-1.5 transition-colors",
            "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isLiked
              ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={isLiked ? "Click to edit feedback" : "Like"}
        >
          <ThumbsUp className="h-4 w-4" />
        </button>

        {/* 踩按钮 */}
        <button
          onClick={() => handleClick("dislike")}
          disabled={isLoading}
          className={cn(
            "rounded-md p-1.5 transition-colors",
            "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isDisliked
              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={isDisliked ? "Click to edit feedback" : "Dislike"}
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
      </div>

      {/* 反馈原因弹窗 */}
      <FeedbackModal
        isOpen={isModalOpen}
        type={pendingType}
        defaultReason={feedback?.reason}
        onClose={handleClose}
        onSubmit={handleSubmit}
        isSubmitting={isLoading}
      />
    </>
  );
}

export default FeedbackButtons;
