"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContextMenu } from "@/providers/ContextProvider";

export function AnalysisStatusCard() {
  const { deepResearchStatus, onboardingStatus } = useContextMenu();
  const [cardMounted, setCardMounted] = useState(false);
  const [cardExiting, setCardExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Mount animation for status card
  useEffect(() => {
    if (deepResearchStatus === "loading") {
      const timer = setTimeout(() => setCardMounted(true), 100);
      return () => clearTimeout(timer);
    }
  }, [deepResearchStatus]);

  // 自管理进度条逻辑
  useEffect(() => {
    // 清除之前的进度更新
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (deepResearchStatus === "loading") {
      // 重置进度和开始时间
      setProgress(0);
      startTimeRef.current = Date.now();

      // 定义预期的分析时间（秒）- 可以根据实际情况调整
      const expectedDuration = 120; // 2分钟，可以根据实际情况调整
      
      // 使用渐进式更新：使用缓动函数使进度更平滑
      progressIntervalRef.current = setInterval(() => {
        if (!startTimeRef.current) return;

        const elapsed = (Date.now() - startTimeRef.current) / 1000; // 已过秒数
        const progressRatio = Math.min(elapsed / expectedDuration, 1); // 进度比例，最大为1

        let newProgress = 0;

        // 使用 ease-out 缓动函数：开始快，后面慢
        // 前80%的时间增长到70%，然后缓慢增长到95%
        if (progressRatio < 0.8) {
          // 前80%的时间：从0平滑增长到70%
          // 使用 ease-out 曲线：1 - (1 - t)^3
          const t = progressRatio / 0.8;
          const eased = 1 - Math.pow(1 - t, 3);
          newProgress = eased * 70;
        } else {
          // 后20%的时间：从70%缓慢增长到95%
          const remainingRatio = (progressRatio - 0.8) / 0.2;
          // 使用更慢的缓动
          const eased = 1 - Math.pow(1 - remainingRatio, 2);
          newProgress = 70 + eased * 25;
        }

        // 确保进度在0-95%之间
        setProgress(Math.min(95, Math.max(0, newProgress)));
      }, 200); // 每200ms更新一次，使动画更流畅
    } else if (deepResearchStatus === "completed") {
      // 完成时立即设置为100%
      setProgress(100);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    } else {
      // 其他状态（idle）时重置
      setProgress(0);
      startTimeRef.current = null;
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [deepResearchStatus]);

  // Exit animation when status becomes completed - delay 5 seconds then slide out
  useEffect(() => {
    const isCompleted = deepResearchStatus === "completed" || onboardingStatus?.researchStatus === "completed";
    if (isCompleted && cardMounted && !cardExiting) {
      // Wait 5 seconds before starting exit animation
      const delayTimer = setTimeout(() => {
        // Start exit animation (slide to right)
        setCardExiting(true);
        // Hide card after animation completes (500ms)
        setTimeout(() => {
          setCardMounted(false);
        }, 500);
      }, 5000); // 5 second delay
      
      return () => clearTimeout(delayTimer);
    }
  }, [deepResearchStatus, onboardingStatus?.researchStatus, cardMounted, cardExiting]);

  // Don't render if status is idle or card is not mounted
  const shouldShow = deepResearchStatus !== "idle" && cardMounted;
  if (!shouldShow) return null;

  // Determine if completed
  const isCompleted = deepResearchStatus === "completed" || onboardingStatus?.researchStatus === "completed";
  const isLoading = deepResearchStatus === "loading" && !isCompleted;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-6 z-50 w-80 transition-all duration-500 ease-in-out",
        cardExiting
          ? "opacity-0 -translate-x-full"
          : "opacity-100 translate-x-0"
      )}
    >
      <div
        className={cn(
          "rounded-lg border shadow-lg p-4 backdrop-blur-sm transition-all",
          isLoading
            ? "border-amber-200 bg-amber-50/95 dark:border-amber-900/50 dark:bg-amber-950/95"
            : "border-emerald-200 bg-emerald-50/95 dark:border-emerald-900/50 dark:bg-emerald-950/95"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              isLoading
                ? "bg-amber-100 dark:bg-amber-900/50"
                : "bg-emerald-100 dark:bg-emerald-900/50"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-amber-600 dark:text-amber-400" />
            ) : (
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {isLoading ? "Analyzing Brand" : "Analysis Complete"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLoading
                  ? onboardingStatus?.currentStep
                    ? onboardingStatus.currentStep
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')
                    : "Deep Research in progress..."
                  : "Context data is ready"}
              </p>
              
              {/* Progress Bar - show progress when loading, reserve space when completed */}
              <div className="mt-3 min-h-[32px]">
                {isLoading && (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground font-medium">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-amber-200/50 dark:bg-amber-900/30 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

