"use client";

/**
 * IntroBlockEditor - 引言块编辑器
 * 
 * 用于编辑页面的引言/介绍部分，包含：
 * - 标题 (headline)
 * - 内容 (content) - Markdown
 * - 开场钩子 (hook)
 * - 图片 (image_url)
 */

import React, { useCallback } from "react";
import { FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { IntroBlock } from "../types";

export interface IntroBlockEditorProps {
  /** Block 数据 */
  block: IntroBlock;
  /** 变更回调 */
  onChange: (block: IntroBlock) => void;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

export const IntroBlockEditor = React.memo<IntroBlockEditorProps>(
  ({ block, onChange, className, disabled = false }) => {
    // 更新字段的通用方法
    const updateField = useCallback(
      <K extends keyof IntroBlock>(field: K, value: IntroBlock[K]) => {
        onChange({ ...block, [field]: value });
      },
      [block, onChange]
    );

    return (
      <div className={cn("space-y-4", className)}>
        {/* 头部标识 */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">
            Intro Block
          </span>
        </div>

        {/* 标题 */}
        <div className="space-y-2">
          <Label htmlFor="headline">标题 (Headline)</Label>
          <Input
            id="headline"
            type="text"
            value={block.headline || ""}
            onChange={(e) => updateField("headline", e.target.value)}
            placeholder="输入引言标题..."
            disabled={disabled}
          />
        </div>

        {/* 开场钩子 */}
        <div className="space-y-2">
          <Label htmlFor="hook">开场钩子 (Hook)</Label>
          <Input
            id="hook"
            type="text"
            value={block.hook || ""}
            onChange={(e) => updateField("hook", e.target.value)}
            placeholder="吸引读者的开场白..."
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            可选。用于吸引读者注意力的开场白。
          </p>
        </div>

        {/* 内容 */}
        <div className="space-y-2">
          <Label htmlFor="content">内容 (Content)</Label>
          <Textarea
            id="content"
            value={block.content || ""}
            onChange={(e) => updateField("content", e.target.value)}
            placeholder="输入引言内容... (支持 Markdown)"
            rows={6}
            disabled={disabled}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            支持 Markdown 格式
          </p>
        </div>

        {/* 图片 URL */}
        <div className="space-y-2">
          <Label htmlFor="image_url">图片 URL</Label>
          <Input
            id="image_url"
            type="url"
            value={block.image_url || ""}
            onChange={(e) => updateField("image_url", e.target.value)}
            placeholder="https://example.com/image.jpg"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            可选。引言配图的 URL。
          </p>
        </div>

        {/* 图片预览 */}
        {block.image_url && (
          <div className="mt-4">
            <Label>图片预览</Label>
            <div className="mt-2 rounded-lg border border-border overflow-hidden bg-muted/20">
              <img
                src={block.image_url}
                alt="Preview"
                className="w-full h-auto max-h-48 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

IntroBlockEditor.displayName = "IntroBlockEditor";

export default IntroBlockEditor;

