"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  FileEdit,
  FileText,
  Search,
  Globe,
  Database,
  Code,
  Zap,
  Bot,
  BarChart3,
  FolderOpen,
  Trash2,
  Download,
  Upload,
  Settings,
  Play,
  Send,
  Image,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import type { ToolCallBlock, ToolProgress } from "@/types";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/app/components/MarkdownContent";
import { formatDuration } from "@/hooks/useProgressStore";

// 根据工具名称模式动态选择图标
function getToolIcon(toolName: string): { icon: LucideIcon; color: string } {
  const name = toolName.toLowerCase();
  
  // 文件操作
  if (name.includes("write") || name.includes("create") && name.includes("file")) {
    return { icon: FileEdit, color: "text-emerald-500" };
  }
  if (name.includes("read") && (name.includes("file") || name.includes("content"))) {
    return { icon: FileText, color: "text-blue-500" };
  }
  if (name.includes("edit") && name.includes("file")) {
    return { icon: FileEdit, color: "text-amber-500" };
  }
  if (name.includes("delete") || name.includes("remove")) {
    return { icon: Trash2, color: "text-red-500" };
  }
  if (name.includes("list") && (name.includes("file") || name.includes("dir"))) {
    return { icon: FolderOpen, color: "text-slate-500" };
  }
  if (name.includes("directory") || name.includes("folder")) {
    return { icon: FolderOpen, color: "text-amber-500" };
  }
  
  // 搜索
  if (name.includes("search") || name.includes("query") || name.includes("find")) {
    return { icon: Search, color: "text-purple-500" };
  }
  if (name.includes("google")) {
    return { icon: Search, color: "text-blue-500" };
  }
  
  // 网络/API
  if (name.includes("fetch") || name.includes("request") || name.includes("api")) {
    return { icon: Globe, color: "text-indigo-500" };
  }
  if (name.includes("download")) {
    return { icon: Download, color: "text-blue-600" };
  }
  if (name.includes("upload") || name.includes("save") || name.includes("submit")) {
    return { icon: Upload, color: "text-emerald-600" };
  }
  if (name.includes("send") || name.includes("post")) {
    return { icon: Send, color: "text-blue-500" };
  }
  
  // 分析
  if (name.includes("analyze") || name.includes("analysis") || name.includes("serp")) {
    return { icon: BarChart3, color: "text-indigo-500" };
  }
  if (name.includes("keyword") || name.includes("seo")) {
    return { icon: Search, color: "text-teal-500" };
  }
  
  // 生成/内容
  if (name.includes("generate") || name.includes("create") || name.includes("write")) {
    return { icon: FileEdit, color: "text-violet-500" };
  }
  if (name.includes("image") || name.includes("picture") || name.includes("photo")) {
    return { icon: Image, color: "text-pink-500" };
  }
  if (name.includes("message") || name.includes("chat") || name.includes("reply")) {
    return { icon: MessageSquare, color: "text-blue-500" };
  }
  
  // 代码/执行
  if (name.includes("execute") || name.includes("run") || name.includes("eval")) {
    return { icon: Play, color: "text-green-500" };
  }
  if (name.includes("code") || name.includes("python") || name.includes("script")) {
    return { icon: Code, color: "text-yellow-500" };
  }
  
  // 数据
  if (name.includes("database") || name.includes("db") || name.includes("sql")) {
    return { icon: Database, color: "text-green-600" };
  }
  if (name.includes("csv") || name.includes("excel") || name.includes("data")) {
    return { icon: Database, color: "text-emerald-600" };
  }
  if (name.includes("parse") || name.includes("extract")) {
    return { icon: Code, color: "text-orange-500" };
  }
  
  // 子代理/任务
  if (name.includes("task") || name.includes("agent") || name.includes("subagent")) {
    return { icon: Bot, color: "text-violet-600" };
  }
  if (name.includes("think") || name.includes("reason") || name.includes("plan")) {
    return { icon: Zap, color: "text-amber-600" };
  }
  
  // 默认
  return { icon: Settings, color: "text-muted-foreground" };
}

// 从 args 中智能提取预览文本
function extractPreviewFromArgs(args: Record<string, unknown> | undefined, toolName: string): string {
  if (!args || Object.keys(args).length === 0) return "";
  
  const name = toolName.toLowerCase();
  
  // 文件路径
  const filePath = args.file_path || args.path || args.filename || args.file;
  if (filePath && (name.includes("file") || name.includes("read") || name.includes("write"))) {
    const path = String(filePath);
    return path.split('/').pop() || path;
  }
  
  // 搜索查询
  const query = args.query || args.q || args.keyword || args.search_query || args.search;
  if (query) {
    return `"${String(query).slice(0, 40)}"`;
  }
  
  // URL
  const url = args.url || args.endpoint || args.link;
  if (url) {
    try {
      const u = new URL(String(url));
      return u.hostname + (u.pathname !== '/' ? u.pathname.slice(0, 20) : '');
    } catch {
      return String(url).slice(0, 30);
    }
  }
  
  // 标题/主题
  const title = args.title || args.topic || args.name || args.subject;
  if (title) {
    return String(title).slice(0, 40);
  }
  
  // 目录
  const directory = args.directory || args.dir || args.folder;
  if (directory) {
    return String(directory);
  }
  
  // 任务描述
  const task = args.task || args.description || args.prompt || args.instruction;
  if (task) {
    return String(task).slice(0, 40) + (String(task).length > 40 ? '...' : '');
  }
  
  // 数组类型
  const items = args.items || args.files || args.results || args.data;
  if (Array.isArray(items)) {
    return `${items.length} items`;
  }
  
  return "";
}

// 从 result 中提取摘要
function extractResultSummary(result: unknown, status: string, error?: string): string {
  if (status === "error") {
    if (error) return error.slice(0, 50);
    if (typeof result === 'object' && result) {
      const r = result as Record<string, unknown>;
      if (r.error) return String(r.error).slice(0, 50);
      if (r.message) return String(r.message).slice(0, 50);
    }
    return "Failed";
  }
  
  if (status !== "success") return "";
  
  if (typeof result === 'object' && result) {
    const r = result as Record<string, unknown>;
    
    // 消息
    if (r.message) return String(r.message).slice(0, 60);
    
    // 结果数组
    if (Array.isArray(r.results)) return `${r.results.length} results`;
    if (Array.isArray(r.items)) return `${r.items.length} items`;
    if (r.total !== undefined) return `${r.total} results`;
    if (r.count !== undefined) return `${r.count} items`;
    
    // 内容
    if (r.content && typeof r.content === 'string') {
      return r.content.slice(0, 50) + (r.content.length > 50 ? '...' : '');
    }
    
    // 状态
    if (r.status) return String(r.status);
    if (r.success === true) return "Success";
  }
  
  if (Array.isArray(result)) {
    return `${result.length} results`;
  }
  
  if (typeof result === 'string') {
    return result.slice(0, 50) + (result.length > 50 ? '...' : '');
  }
  
  return "Done";
}

interface ToolCallBlockViewProps {
  block: ToolCallBlock;
  /** 实时进度信息（来自 useProgressStore） */
  progress?: ToolProgress;
}

/**
 * ToolCallBlockView - 专业的工具调用展示组件
 * 
 * 设计特点：
 * - 动态图标选择，无需硬编码每个工具
 * - 使用后端返回的 displayName
 * - 智能提取关键参数和结果摘要
 * - 支持实时进度显示（PROGRESS_EVENTS_FRONTEND_GUIDE.md）
 */
export const ToolCallBlockView = React.memo<ToolCallBlockViewProps>(
  ({ block, progress }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const { toolName, toolDisplayName, status, durationMs, args, result, error, toolCallId } = block;
    
    // 调试日志 - 检查 displayName 和 progress
    console.log(`[ToolCallBlockView] ${toolName}:`, {
      toolCallId,
      toolDisplayName,
      status,
      hasProgress: !!progress,
      progressStatus: progress?.status,
      progressElapsedMs: progress?.elapsedMs,
    });
    
    // 是否正在显示实时进度
    const isShowingProgress = progress?.status === "running";
    // 是否正在重试
    const isRetrying = progress?.retryAttempt !== undefined;

    // 动态获取图标
    const { icon: Icon, color: iconColor } = useMemo(() => {
      return getToolIcon(toolName);
    }, [toolName]);

    // 使用后端 displayName，否则使用原始名称
    const displayName = toolDisplayName || toolName;
    
    // 智能提取预览文本
    const previewText = useMemo(() => {
      return extractPreviewFromArgs(args, toolName);
    }, [args, toolName]);

    // 智能提取结果摘要
    const resultSummary = useMemo(() => {
      return extractResultSummary(result, status, error);
    }, [result, status, error]);

    // 格式化执行时间 - 实时进度使用 elapsedMs，历史记录使用 durationMs
    const formattedDuration = useMemo(() => {
      // 实时进度：使用 progress.elapsedMs
      if (isShowingProgress && progress?.elapsedMs) {
        return formatDuration(progress.elapsedMs);
      }
      // 历史记录：使用保存的 durationMs
      if (!durationMs) return null;
      return formatDuration(durationMs);
    }, [durationMs, isShowingProgress, progress?.elapsedMs]);

    const toggleExpanded = useCallback(() => {
      setIsExpanded((prev) => !prev);
    }, []);

    // 状态样式 - 考虑实时进度状态
    const statusStyles = useMemo(() => {
      // 如果有实时进度且正在运行，使用进度样式
      if (isShowingProgress) {
        return {
          bg: "bg-blue-50/50 dark:bg-blue-950/20",
          border: "border-blue-200/50 dark:border-blue-800/50",
        };
      }
      // 如果正在重试，使用警告样式
      if (isRetrying) {
        return {
          bg: "bg-amber-50/50 dark:bg-amber-950/20",
          border: "border-amber-200/50 dark:border-amber-800/50",
        };
      }
      switch (status) {
        case "running":
          return {
            bg: "bg-blue-50/50 dark:bg-blue-950/20",
            border: "border-blue-200/50 dark:border-blue-800/50",
          };
        case "success":
          return {
            bg: "bg-emerald-50/30 dark:bg-emerald-950/10",
            border: "border-emerald-200/50 dark:border-emerald-800/30",
          };
        case "error":
          return {
            bg: "bg-red-50/30 dark:bg-red-950/10",
            border: "border-red-200/50 dark:border-red-800/30",
          };
        default:
          return {
            bg: "bg-muted/30",
            border: "border-border/50",
          };
      }
    }, [status, isShowingProgress, isRetrying]);

    // 状态图标
    const StatusIcon = useMemo(() => {
      switch (status) {
        case "success":
          return <CheckCircle2 size={14} className="text-emerald-500 dark:text-emerald-400" />;
        case "error":
          return <AlertCircle size={14} className="text-red-500 dark:text-red-400" />;
        case "running":
          return <Loader2 size={14} className="animate-spin text-blue-500 dark:text-blue-400" />;
        case "pending":
          return <Clock size={14} className="text-muted-foreground" />;
        default:
          return null;
      }
    }, [status]);

    return (
      <div
        className={cn(
          "tool-call-block rounded-lg border transition-all",
          statusStyles.border,
          statusStyles.bg,
          isExpanded && "shadow-sm"
        )}
      >
        {/* Main row */}
        <button
          type="button"
          onClick={toggleExpanded}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 text-left",
            "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
          )}
        >
          {/* Expand/collapse indicator */}
          <span className="text-muted-foreground/60 flex-shrink-0">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>

          {/* Status icon */}
          <span className="flex-shrink-0">{StatusIcon}</span>

          {/* Tool icon */}
          <span className={cn("flex-shrink-0", iconColor)}>
            <Icon size={15} />
          </span>

          {/* Tool name */}
          <span className="font-medium text-sm text-foreground">
            {displayName}
          </span>

          {/* Preview text (key args) */}
          {previewText && (
            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
              {previewText}
            </span>
          )}

          {/* Right side: progress/retry info, result summary and duration */}
          <span className="ml-auto flex items-center gap-2 flex-shrink-0">
            {/* 重试状态徽章 */}
            {isRetrying && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium">
                重试 {progress?.retryAttempt}/{progress?.maxRetries}
              </span>
            )}
            
            {/* 结果摘要（非运行状态时显示） */}
            {resultSummary && status !== "running" && !isShowingProgress && (
              <span className={cn(
                "text-xs truncate max-w-[150px]",
                status === "error" ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
              )}>
                {resultSummary}
              </span>
            )}
            
            {/* 执行时间 - 实时进度显示动态时间，历史记录显示最终时长 */}
            {formattedDuration && (
              <span className={cn(
                "text-xs tabular-nums",
                isShowingProgress 
                  ? "text-blue-500 dark:text-blue-400 font-medium" 
                  : "text-muted-foreground/70"
              )}>
                {formattedDuration}
              </span>
            )}
          </span>
        </button>

        {/* 进度指示器（长时间运行工具）- Linear 风格底部流动条 */}
        {isShowingProgress && (
          <div className="relative h-[2px] w-full overflow-hidden rounded-b-lg">
            {/* 背景轨道 - 微妙的基底色 */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-blue-500/10 to-blue-500/5 dark:from-blue-400/5 dark:via-blue-400/10 dark:to-blue-400/5" />
            {/* 流动的渐变光条 */}
            <div 
              className="absolute h-full w-[40%] animate-progress-flow rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.6) 30%, rgba(59, 130, 246, 0.9) 50%, rgba(59, 130, 246, 0.6) 70%, transparent 100%)',
              }}
            />
          </div>
        )}

        {/* Expanded details */}
        {isExpanded && (
          <div className="border-t border-border/30 bg-background/50">
            {/* Arguments */}
            {args && Object.keys(args).length > 0 && (
              <div className="px-4 py-3 border-b border-border/20">
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Arguments
                </h4>
                <div className="rounded-md bg-muted/30 p-3 overflow-auto max-h-[200px]">
                  <pre className="text-xs text-foreground/80 whitespace-pre-wrap break-words font-mono">
                    {JSON.stringify(args, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Result */}
            {result !== undefined && (
              <div className="px-4 py-3">
                <h4 className={cn(
                  "text-xs font-medium mb-2 uppercase tracking-wide",
                  status === "error" ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
                )}>
                  {status === "error" ? "Error" : "Result"}
                </h4>
                <div
                  className={cn(
                    "rounded-md p-3 overflow-auto max-h-[300px]",
                    status === "error"
                      ? "bg-red-50/50 dark:bg-red-950/20"
                      : "bg-muted/30"
                  )}
                >
                  {typeof result === "string" ? (
                    <MarkdownContent content={result} className="text-xs" />
                  ) : (
                    <pre className="text-xs text-foreground/80 whitespace-pre-wrap break-words font-mono">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {/* Standalone error */}
            {error && !result && (
              <div className="px-4 py-3 bg-red-50/30 dark:bg-red-950/10">
                <h4 className="text-xs font-medium text-red-500 dark:text-red-400 mb-2 uppercase tracking-wide">
                  Error
                </h4>
                <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-words font-mono">
                  {error}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

ToolCallBlockView.displayName = "ToolCallBlockView";
