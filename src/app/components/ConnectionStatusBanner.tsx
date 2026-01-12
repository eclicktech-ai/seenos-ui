"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Wifi, WifiOff, RefreshCw, Loader2, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatContext } from "@/providers/ChatProvider";
import type { MaxReconnectReachedData } from "@/lib/stream/websocket";
import { toast } from "sonner";

interface ConnectionStatusBannerProps {
  className?: string;
}

/**
 * ConnectionStatusBanner - 连接状态提示
 * 
 * 优化后的显示策略：
 * - reconnecting: 使用轻量级 toast 提示，不打扰用户
 * - server_restarting: 显示小型底部提示条
 * - failed: 显示完整的顶部横幅，带手动重连按钮
 */
export const ConnectionStatusBanner = React.memo<ConnectionStatusBannerProps>(
  ({ className }) => {
    const { connectionState, manualReconnect } = useChatContext();
    
    // 是否显示最大重连次数到达的提示
    const [showMaxReconnectReached, setShowMaxReconnectReached] = useState(false);
    const [maxReconnectData, setMaxReconnectData] = useState<MaxReconnectReachedData | null>(null);
    
    // 是否正在手动重连
    const [isManualReconnecting, setIsManualReconnecting] = useState(false);
    
    // 用于防止重复显示 toast
    const lastToastRef = useRef<string | null>(null);
    const reconnectingToastId = useRef<string | number | null>(null);

    // 监听全局事件
    useEffect(() => {
      const handleServerUnavailable = () => {
        // 显示轻量级 toast
        if (lastToastRef.current !== 'server_unavailable') {
          lastToastRef.current = 'server_unavailable';
          toast.info('服务器正在重启', {
            id: 'server-restarting',
            description: '正在等待服务器恢复...',
            duration: Infinity,
          });
        }
      };

      const handleMaxReconnectReached = (event: CustomEvent<MaxReconnectReachedData>) => {
        setShowMaxReconnectReached(true);
        setMaxReconnectData(event.detail);
        // 关闭重连中的 toast
        if (reconnectingToastId.current) {
          toast.dismiss(reconnectingToastId.current);
          reconnectingToastId.current = null;
        }
        toast.dismiss('server-restarting');
        lastToastRef.current = null;
      };

      window.addEventListener('seenos:server_unavailable', handleServerUnavailable);
      window.addEventListener('seenos:max_reconnect_reached', handleMaxReconnectReached as EventListener);
      
      return () => {
        window.removeEventListener('seenos:server_unavailable', handleServerUnavailable);
        window.removeEventListener('seenos:max_reconnect_reached', handleMaxReconnectReached as EventListener);
      };
    }, []);

    // 监听连接状态变化
    useEffect(() => {
      if (connectionState === 'connected') {
        // 连接恢复，关闭所有提示
        setShowMaxReconnectReached(false);
        setMaxReconnectData(null);
        setIsManualReconnecting(false);
        lastToastRef.current = null;
        
        // 关闭相关 toast
        toast.dismiss('server-restarting');
        if (reconnectingToastId.current) {
          toast.dismiss(reconnectingToastId.current);
          reconnectingToastId.current = null;
        }
        
        // 显示连接恢复提示
        toast.success('连接已恢复', { duration: 2000 });
      } else if (connectionState === 'reconnecting' && !isManualReconnecting) {
        // 自动重连中，显示轻量级 toast（只显示一次）
        if (lastToastRef.current !== 'reconnecting') {
          lastToastRef.current = 'reconnecting';
          reconnectingToastId.current = toast.loading('正在重新连接...', {
            id: 'reconnecting',
          });
        }
      } else if (connectionState === 'server_restarting') {
        // 服务器重启中
        if (lastToastRef.current !== 'server_restarting') {
          lastToastRef.current = 'server_restarting';
          // 关闭重连 toast
          if (reconnectingToastId.current) {
            toast.dismiss(reconnectingToastId.current);
            reconnectingToastId.current = null;
          }
        }
      }
    }, [connectionState, isManualReconnecting]);

    const handleManualReconnect = useCallback(() => {
      setIsManualReconnecting(true);
      setShowMaxReconnectReached(false);
      manualReconnect();
      
      // 显示重连中 toast
      reconnectingToastId.current = toast.loading('正在重新连接...', {
        id: 'manual-reconnecting',
      });
      
      // 5 秒后重置状态（如果还没连接成功）
      setTimeout(() => {
        setIsManualReconnecting(false);
      }, 5000);
    }, [manualReconnect]);

    // 只在连接失败时显示完整横幅
    const shouldShowBanner = showMaxReconnectReached || connectionState === 'failed';

    if (!shouldShowBanner) {
      return null;
    }

    return (
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "border-b",
          "bg-red-50 dark:bg-red-950/90",
          "border-red-200 dark:border-red-800/50",
          "animate-in slide-in-from-top duration-300",
          className
        )}
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-4">
            {/* Icon and Message */}
            <div className="flex items-center gap-2.5">
              <WifiOff className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  连接已断开
                  {maxReconnectData && (
                    <span className="ml-2 text-xs font-normal text-red-600/80 dark:text-red-300/70">
                      (已尝试 {maxReconnectData.attempts} 次)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Manual Reconnect Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualReconnect}
              disabled={isManualReconnecting}
              className={cn(
                "h-7 text-xs",
                "border-red-300 bg-red-100 hover:bg-red-200",
                "dark:border-red-700 dark:bg-red-900/50 dark:hover:bg-red-800/50",
                "text-red-800 dark:text-red-200"
              )}
            >
              {isManualReconnecting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  重连中
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                  重新连接
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }
);
ConnectionStatusBanner.displayName = "ConnectionStatusBanner";

export default ConnectionStatusBanner;
