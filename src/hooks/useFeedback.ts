"use client";

import { useState, useCallback } from "react";
import { apiClient, FeedbackResponse, FeedbackCreateRequest, FeedbackType } from "@/lib/api/client";

interface UseFeedbackOptions {
  /** 会话 ID */
  cid: string;
  /** 消息 ID */
  messageId: string;
  /** 初始反馈状态（从消息的 metadata 中获取） */
  initialFeedback?: FeedbackResponse | null;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 成功回调 */
  onSuccess?: (feedback: FeedbackResponse | null) => void;
}

/**
 * useFeedback - 消息反馈 Hook
 * 
 * 基于 FEEDBACK_API_FRONTEND_GUIDE.md 实现：
 * - 管理反馈状态（点赞/踩）
 * - 支持创建、更新、删除反馈
 * - 自动判断使用 POST 或 PUT
 */
export function useFeedback({
  cid,
  messageId,
  initialFeedback = null,
  onError,
  onSuccess,
}: UseFeedbackOptions) {
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(initialFeedback);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 提交反馈（自动判断创建或更新）
   */
  const submitFeedback = useCallback(async (
    feedbackType: FeedbackType,
    reason: string
  ): Promise<FeedbackResponse> => {
    if (!cid || !messageId) {
      throw new Error("Missing cid or messageId");
    }

    // Validate reason
    if (!reason.trim()) {
      throw new Error("Please provide a reason");
    }

    if (reason.length > 1000) {
      throw new Error("Reason cannot exceed 1000 characters");
    }

    setIsLoading(true);
    setError(null);

    try {
      const data: FeedbackCreateRequest = {
        feedbackType,
        reason: reason.trim(),
      };

      let response: FeedbackResponse;

      if (feedback) {
        // 已存在反馈，使用 PUT 更新
        response = await apiClient.updateFeedback(cid, messageId, data);
      } else {
        // 不存在反馈，使用 POST 创建
        response = await apiClient.createFeedback(cid, messageId, data);
      }

      setFeedback(response);
      onSuccess?.(response);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to submit feedback");
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [cid, messageId, feedback, onError, onSuccess]);

  /**
   * 删除反馈
   */
  const deleteFeedback = useCallback(async (): Promise<void> => {
    if (!cid || !messageId) {
      throw new Error("Missing cid or messageId");
    }

    if (!feedback) {
      // 没有反馈可删除
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await apiClient.deleteFeedback(cid, messageId);
      setFeedback(null);
      onSuccess?.(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to delete feedback");
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [cid, messageId, feedback, onError, onSuccess]);

  /**
   * 获取当前反馈状态
   */
  const refreshFeedback = useCallback(async (): Promise<void> => {
    if (!cid || !messageId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.getFeedback(cid, messageId);
      setFeedback(response);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch feedback status");
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [cid, messageId, onError]);

  return {
    /** 当前反馈状态 */
    feedback,
    /** 是否正在加载 */
    isLoading,
    /** 错误信息 */
    error,
    /** 提交反馈（自动判断创建/更新） */
    submitFeedback,
    /** 删除反馈 */
    deleteFeedback,
    /** 刷新反馈状态 */
    refreshFeedback,
    /** 是否已点赞 */
    isLiked: feedback?.feedbackType === 'like',
    /** 是否已踩 */
    isDisliked: feedback?.feedbackType === 'dislike',
    /** 是否有反馈 */
    hasFeedback: !!feedback,
  };
}

export type UseFeedbackReturn = ReturnType<typeof useFeedback>;
