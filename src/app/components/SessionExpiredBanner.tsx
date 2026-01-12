"use client";

import React from "react";
import { Clock, RefreshCw, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";

interface SessionExpiredBannerProps {
  className?: string;
}

/**
 * SessionExpiredBanner - Session 过期提示横幅
 * 
 * 基于 SESSION_EXPIRATION_FRONTEND_GUIDE.md:
 * - 监听 session:expired 全局事件
 * - 显示过期提示和刷新按钮
 * - 支持静默刷新或用户手动刷新
 * 
 * Session 过期原因：
 * - 空闲超时: 用户超过 30 分钟无活动
 * - 绝对过期: Session 超过最大有效期（24 小时）
 * - 主动登出: 用户在其他设备登出
 * - 会话数量限制: 超过最大并发会话数（5 个）
 */
export const SessionExpiredBanner = React.memo<SessionExpiredBannerProps>(
  ({ className }) => {
    const { isExpired, isRefreshing, expiredMessage, refresh, clearExpired } = useSession();

    if (!isExpired) {
      return null;
    }

    const handleRefresh = async () => {
      const success = await refresh();
      if (!success) {
        // 刷新失败，可以跳转到登录页
        // 或者让用户手动刷新页面
        console.warn('[SessionExpiredBanner] Failed to refresh session');
      }
    };

    return (
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "border-b border-yellow-300 bg-yellow-50",
          "dark:border-yellow-700/50 dark:bg-yellow-950/80",
          "animate-in slide-in-from-top duration-300",
          className
        )}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Icon and Message */}
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Session Expired
                </p>
                <p className="text-xs text-yellow-700/80 dark:text-yellow-300/70 truncate">
                  {expiredMessage || 'Your session has expired. Please refresh to continue.'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={cn(
                  "h-8",
                  "border-yellow-400 bg-yellow-100 hover:bg-yellow-200",
                  "dark:border-yellow-600 dark:bg-yellow-900/50 dark:hover:bg-yellow-800/50",
                  "text-yellow-800 dark:text-yellow-200"
                )}
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Refresh Session
                  </>
                )}
              </Button>

              {/* Dismiss Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-yellow-700 hover:text-yellow-900 hover:bg-yellow-200 dark:text-yellow-300 dark:hover:text-yellow-100 dark:hover:bg-yellow-800/50"
                onClick={clearExpired}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
SessionExpiredBanner.displayName = "SessionExpiredBanner";

export default SessionExpiredBanner;
