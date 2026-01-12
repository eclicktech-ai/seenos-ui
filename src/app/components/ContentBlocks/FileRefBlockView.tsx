"use client";

import React, { useMemo, useState, useCallback, useContext } from "react";
import {
  FileText,
  FilePlus,
  FileEdit,
  FileX,
  Eye,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileCode,
} from "lucide-react";
import type { FileRefBlock } from "@/types";
import { cn } from "@/lib/utils";
import { ChatContext } from "@/providers/ChatProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownContent } from "@/app/components/MarkdownContent";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface FileRefBlockViewProps {
  block: FileRefBlock;
}

// 支持的语言到 Prism 语言的映射
const LANGUAGE_MAP: Record<string, string> = {
  markdown: "markdown",
  md: "markdown",
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  python: "python",
  py: "python",
  html: "html",
  css: "css",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  text: "text",
  txt: "text",
};

/**
 * FileRefBlockView - 渲染文件引用块
 * 
 * 基于 WEBSOCKET_FRONTEND_GUIDE.md 新架构：
 * - 显示文件路径、操作类型
 * - 支持 create/edit/read/delete/write 操作
 * - 点击可展开查看完整内容
 * - 支持 Markdown 预览
 */
export const FileRefBlockView = React.memo<FileRefBlockViewProps>(
  ({ block }) => {
    const { path, operation, language, contentPreview } = block;
    // 使用可选的 context，避免在没有 ChatProvider 时抛出错误
    const chatContext = useContext(ChatContext);
    const files = chatContext?.files ?? {};
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // 检测当前主题
    const isDark = typeof window !== "undefined" && document.documentElement.classList.contains("dark");

    // 获取完整文件内容
    const fileContent = useMemo(() => {
      // 尝试多种可能的路径格式
      const possiblePaths = [
        path,
        path.startsWith("/") ? path.slice(1) : "/" + path,
        path.replace(/^\/workspace\//, ""),
        "workspace/" + path.replace(/^\/workspace\//, ""),
      ];

      for (const p of possiblePaths) {
        const file = files[p];
        if (file) {
          return typeof file === "string" ? file : file.content;
        }
      }

      // 如果没有找到完整内容，返回预览
      return contentPreview || null;
    }, [path, files, contentPreview]);

    // 判断是否是 Markdown 文件
    const isMarkdown = useMemo(() => {
      const lang = language?.toLowerCase() || "";
      const ext = path.split(".").pop()?.toLowerCase() || "";
      return lang === "markdown" || lang === "md" || ext === "md" || ext === "markdown";
    }, [language, path]);

    // 获取 Prism 语言
    const prismLanguage = useMemo(() => {
      const lang = language?.toLowerCase() || "";
      const ext = path.split(".").pop()?.toLowerCase() || "";
      return LANGUAGE_MAP[lang] || LANGUAGE_MAP[ext] || "text";
    }, [language, path]);

    const operationConfig = useMemo(() => {
      // 支持 "write" 作为 "create" 的别名
      const normalizedOperation = operation === "write" ? "create" : operation;
      
      switch (normalizedOperation) {
        case "create":
          return {
            icon: FilePlus,
            label: operation.toUpperCase(), // 保持原始显示
            bgClass: "bg-green-50 dark:bg-green-900/20",
            badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
          };
        case "edit":
          return {
            icon: FileEdit,
            label: "EDIT",
            bgClass: "bg-amber-50 dark:bg-amber-900/20",
            badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
          };
        case "read":
          return {
            icon: Eye,
            label: "READ",
            bgClass: "bg-blue-50 dark:bg-blue-900/20",
            badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
          };
        case "delete":
          return {
            icon: FileX,
            label: "DELETE",
            bgClass: "bg-red-50 dark:bg-red-900/20",
            badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
          };
        default:
          return {
            icon: FileText,
            label: (operation || "FILE").toUpperCase(),
            bgClass: "bg-muted/50",
            badgeClass: "bg-muted text-muted-foreground",
          };
      }
    }, [operation]);

    const Icon = operationConfig.icon;

    // 处理点击语言标签
    const handleLanguageClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      if (fileContent) {
        setIsDialogOpen(true);
      }
    }, [fileContent]);

    // 处理点击卡片展开/折叠
    const handleCardClick = useCallback(() => {
      if (fileContent || contentPreview) {
        setIsExpanded((prev) => !prev);
      }
    }, [fileContent, contentPreview]);

    // 处理打开对话框
    const handleOpenDialog = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDialogOpen(true);
    }, []);

    // 获取文件名
    const fileName = useMemo(() => {
      return path.split("/").pop() || path;
    }, [path]);

    return (
      <>
        <div
          className={cn(
            "file-ref-block rounded-lg overflow-hidden transition-all",
            operationConfig.bgClass,
            (fileContent || contentPreview) && "cursor-pointer hover:ring-2 hover:ring-primary/30"
          )}
          onClick={handleCardClick}
        >
          {/* Header */}
          <div className="flex items-center gap-2 p-3">
            <Icon size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="font-mono text-sm truncate flex-1">
              {path}
            </span>
            {language && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 py-0 text-xs text-muted-foreground hover:text-foreground hover:bg-background/50"
                onClick={handleLanguageClick}
                title="点击预览文件"
              >
                {language}
              </Button>
            )}
            <span
              className={cn(
                "px-2 py-0.5 rounded text-xs font-medium uppercase",
                operationConfig.badgeClass
              )}
            >
              {operationConfig.label}
            </span>
            {(fileContent || contentPreview) && (
              <span className="text-muted-foreground">
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            )}
          </div>

          {/* Content Preview (collapsed) */}
          {!isExpanded && contentPreview && (
            <div className="px-3 pb-3">
              <div className="rounded-md bg-background/50 p-2 overflow-hidden">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words line-clamp-3">
                  {contentPreview}
                </pre>
              </div>
            </div>
          )}

          {/* Expanded Content */}
          {isExpanded && fileContent && (
            <div className="border-t border-border/30">
              <div className="flex items-center justify-end gap-2 px-3 py-1.5 bg-background/30">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleOpenDialog}
                >
                  <ExternalLink size={12} />
                  全屏预览
                </Button>
              </div>
              <div className="max-h-[400px] overflow-auto">
                {isMarkdown ? (
                  <div className="p-4 bg-background/50">
                    <MarkdownContent content={fileContent} />
                  </div>
                ) : (
                  <SyntaxHighlighter
                    language={prismLanguage}
                    style={isDark ? oneDark : oneLight}
                    customStyle={{
                      margin: 0,
                      padding: "1rem",
                      fontSize: "0.75rem",
                      backgroundColor: isDark ? "#1e1e1e" : "#f8f8f8",
                    }}
                    showLineNumbers
                    wrapLines
                    wrapLongLines
                  >
                    {fileContent}
                  </SyntaxHighlighter>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Full Screen Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="!max-w-6xl w-[90vw] max-h-[90vh] flex flex-col p-0 gap-0 sm:!max-w-6xl">
            <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
              <div className="flex items-center gap-3">
                <FileCode size={20} className="text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base font-medium truncate">
                    {fileName}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {path}
                  </p>
                </div>
                {language && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                    {language}
                  </span>
                )}
              </div>
            </DialogHeader>
            <ScrollArea className="flex-1 overflow-auto">
              {fileContent && (
                isMarkdown ? (
                  <div className="p-6">
                    <MarkdownContent content={fileContent} />
                  </div>
                ) : (
                  <SyntaxHighlighter
                    language={prismLanguage}
                    style={isDark ? oneDark : oneLight}
                    customStyle={{
                      margin: 0,
                      padding: "1.5rem",
                      fontSize: "0.875rem",
                      backgroundColor: isDark ? "#1e1e1e" : "#fafafa",
                      minHeight: "100%",
                    }}
                    showLineNumbers
                    wrapLines
                    wrapLongLines
                  >
                    {fileContent}
                  </SyntaxHighlighter>
                )
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);
FileRefBlockView.displayName = "FileRefBlockView";
