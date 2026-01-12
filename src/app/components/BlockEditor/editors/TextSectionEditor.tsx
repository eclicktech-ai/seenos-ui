"use client";

/**
 * TextSectionEditor - 文本段落编辑器
 * 
 * 用于通用的文本内容段落，包含：
 * - 标题 (heading)
 * - 内容 (content) - Markdown
 * - 图片及位置
 */

import React, { useCallback } from "react";
import { AlignLeft, Image } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TextSectionBlock } from "../types";

export interface TextSectionEditorProps {
  /** Block 数据 */
  block: TextSectionBlock;
  /** 变更回调 */
  onChange: (block: TextSectionBlock) => void;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

const IMAGE_POSITIONS = [
  { value: "left", label: "左侧" },
  { value: "right", label: "右侧" },
  { value: "top", label: "顶部" },
  { value: "bottom", label: "底部" },
];

export const TextSectionEditor = React.memo<TextSectionEditorProps>(
  ({ block, onChange, className, disabled = false }) => {
    // 更新字段的通用方法
    const updateField = useCallback(
      <K extends keyof TextSectionBlock>(field: K, value: TextSectionBlock[K]) => {
        onChange({ ...block, [field]: value });
      },
      [block, onChange]
    );

    return (
      <div className={cn("space-y-4", className)}>
        {/* 头部标识 */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlignLeft size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">
            Text Section
          </span>
        </div>

        {/* 标题 */}
        <div className="space-y-2">
          <Label htmlFor="heading">标题 (Heading)</Label>
          <Input
            id="heading"
            type="text"
            value={block.heading || ""}
            onChange={(e) => updateField("heading", e.target.value)}
            placeholder="段落标题"
            disabled={disabled}
          />
        </div>

        {/* 内容 */}
        <div className="space-y-2">
          <Label htmlFor="content">内容 *</Label>
          <Textarea
            id="content"
            value={block.content || ""}
            onChange={(e) => updateField("content", e.target.value)}
            placeholder="输入段落内容... (支持 Markdown)"
            rows={8}
            disabled={disabled}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            支持 Markdown 格式
          </p>
        </div>

        {/* 图片设置 */}
        <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/10">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Image size={14} />
            图片设置
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 图片 URL */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="image_url">图片 URL</Label>
              <Input
                id="image_url"
                type="url"
                value={block.image_url || ""}
                onChange={(e) => updateField("image_url", e.target.value)}
                placeholder="https://example.com/image.jpg"
                disabled={disabled}
              />
            </div>

            {/* 图片位置 */}
            {block.image_url && (
              <div className="space-y-2">
                <Label htmlFor="image_position">图片位置</Label>
                <Select
                  value={block.image_position || "right"}
                  onValueChange={(value) =>
                    updateField(
                      "image_position",
                      value as TextSectionBlock["image_position"]
                    )
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择位置..." />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_POSITIONS.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* 图片预览 */}
          {block.image_url && (
            <div className="mt-2">
              <Label>预览</Label>
              <div className="mt-2 rounded-lg border border-border overflow-hidden bg-muted/20 w-32 h-24">
                <img
                  src={block.image_url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

TextSectionEditor.displayName = "TextSectionEditor";

export default TextSectionEditor;

