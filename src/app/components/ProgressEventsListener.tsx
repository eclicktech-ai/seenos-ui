"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { ToolRetryEventData, ModelRetryEventData } from "@/types";

/**
 * ProgressEventsListener - 监听进度相关事件并显示 Toast
 * 
 * 基于 PROGRESS_EVENTS_FRONTEND_GUIDE.md：
 * - tool_retry: 工具网络重试时显示警告
 * - model_retry: 模型调用重试时显示提示
 */
export function ProgressEventsListener() {
  useEffect(() => {
    // 工具重试事件
    const handleToolRetry = (event: CustomEvent<ToolRetryEventData>) => {
      const { displayName, toolName, attempt, maxRetries, delay, error } = event.detail;
      const name = displayName || toolName;
      
      toast.warning(`${name} 重试中 (${attempt}/${maxRetries})`, {
        description: error,
        duration: delay * 1000, // 重试延迟期间显示
      });
    };

    // 模型重试事件
    const handleModelRetry = (event: CustomEvent<ModelRetryEventData>) => {
      const { attempt, maxRetries, delay, error } = event.detail;
      
      toast.info(`AI 响应重试中 (${attempt}/${maxRetries})`, {
        description: error || "正在重新请求...",
        duration: delay * 1000,
      });
    };

    // 监听事件
    window.addEventListener("seenos:tool_retry", handleToolRetry as EventListener);
    window.addEventListener("seenos:model_retry", handleModelRetry as EventListener);

    return () => {
      window.removeEventListener("seenos:tool_retry", handleToolRetry as EventListener);
      window.removeEventListener("seenos:model_retry", handleModelRetry as EventListener);
    };
  }, []);

  return null;
}
