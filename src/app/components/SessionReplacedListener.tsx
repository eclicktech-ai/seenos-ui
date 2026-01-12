"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * SessionReplacedListener - 监听会话替换和连接错误事件
 * 
 * 当用户在另一个标签页/设备登录时，当前连接会被替换。
 * 这个组件会显示一个友好的提示，让用户知道发生了什么。
 */
export function SessionReplacedListener() {
  // 使用 ref 来防止重复显示 toast
  const hasShownSessionReplacedRef = useRef(false);
  const hasShownConnectionErrorRef = useRef(false);

  useEffect(() => {
    const handleSessionReplaced = (event: CustomEvent<{ reason?: string; message?: string }>) => {
      // 防止重复显示
      if (hasShownSessionReplacedRef.current) return;
      hasShownSessionReplacedRef.current = true;
      
      const message = event.detail?.message || "您的会话已在其他地方登录";
      
      toast.error("连接已断开", {
        id: "session-replaced", // 使用固定 id 防止重复
        description: message,
        duration: Infinity, // 不自动关闭
        action: {
          label: "刷新页面",
          onClick: () => window.location.reload(),
        },
      });
    };

    const handleForceLogout = (event: CustomEvent<{ reason?: string; message?: string }>) => {
      const message = event.detail?.message || "您已被强制登出";
      
      toast.error("已登出", {
        id: "force-logout",
        description: message,
        duration: Infinity,
        action: {
          label: "重新登录",
          onClick: () => window.location.href = "/login",
        },
      });
    };

    const handleRateLimited = (event: CustomEvent<{ message?: string; retry_after?: number }>) => {
      const retryAfter = event.detail?.retry_after || 60;
      
      toast.warning("连接频率限制", {
        id: "rate-limited",
        description: `请等待 ${retryAfter} 秒后重试`,
        duration: retryAfter * 1000,
      });
    };

    const handleConnectionError = (event: CustomEvent<{ message?: string; canRetry?: boolean }>) => {
      // 防止重复显示
      if (hasShownConnectionErrorRef.current) return;
      hasShownConnectionErrorRef.current = true;
      
      const message = event.detail?.message || "连接出现问题";
      const canRetry = event.detail?.canRetry ?? true;
      
      toast.error("连接错误", {
        id: "connection-error",
        description: message,
        duration: Infinity,
        action: canRetry ? {
          label: "刷新页面",
          onClick: () => window.location.reload(),
        } : undefined,
      });
    };

    // 监听事件
    window.addEventListener("seenos:session_replaced", handleSessionReplaced as EventListener);
    window.addEventListener("seenos:force_logout", handleForceLogout as EventListener);
    window.addEventListener("seenos:rate_limited", handleRateLimited as EventListener);
    window.addEventListener("seenos:connection_error", handleConnectionError as EventListener);

    return () => {
      window.removeEventListener("seenos:session_replaced", handleSessionReplaced as EventListener);
      window.removeEventListener("seenos:force_logout", handleForceLogout as EventListener);
      window.removeEventListener("seenos:rate_limited", handleRateLimited as EventListener);
      window.removeEventListener("seenos:connection_error", handleConnectionError as EventListener);
    };
  }, []);

  return null;
}
