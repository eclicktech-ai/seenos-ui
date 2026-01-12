"use client";

/**
 * FeatureBlockEditor - 功能块编辑器
 * 
 * 用于展示产品/服务功能，包含：
 * - 标题
 * - 描述
 * - 图标
 * - 图片
 */

import React, { useCallback } from "react";
import { Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FeatureBlock } from "../types";

export interface FeatureBlockEditorProps {
  /** Block 数据 */
  block: FeatureBlock;
  /** 变更回调 */
  onChange: (block: FeatureBlock) => void;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

export const FeatureBlockEditor = React.memo<FeatureBlockEditorProps>(
  ({ block, onChange, className, disabled = false }) => {
    // 更新字段的通用方法
    const updateField = useCallback(
      <K extends keyof FeatureBlock>(field: K, value: FeatureBlock[K]) => {
        onChange({ ...block, [field]: value });
      },
      [block, onChange]
    );

    return (
      <div className={cn("space-y-4", className)}>
        {/* 头部标识 */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Zap size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">
            Feature Block
          </span>
        </div>

        {/* 标题 */}
        <div className="space-y-2">
          <Label htmlFor="title">功能标题 *</Label>
          <Input
            id="title"
            type="text"
            value={block.title || ""}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="功能名称"
            disabled={disabled}
          />
        </div>

        {/* 描述 */}
        <div className="space-y-2">
          <Label htmlFor="description">功能描述 *</Label>
          <Textarea
            id="description"
            value={block.description || ""}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="描述这个功能如何帮助用户..."
            rows={3}
            disabled={disabled}
          />
        </div>

        {/* 图标 */}
        <div className="space-y-2">
          <Label htmlFor="icon">图标名称</Label>
          <Input
            id="icon"
            type="text"
            value={block.icon || ""}
            onChange={(e) => updateField("icon", e.target.value)}
            placeholder="例如: Zap, Shield, Clock"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            使用 Lucide 图标名称，如 Zap, Shield, Clock, Check 等
          </p>
        </div>

        {/* 图片 URL */}
        <div className="space-y-2">
          <Label htmlFor="image_url">功能配图 URL</Label>
          <Input
            id="image_url"
            type="url"
            value={block.image_url || ""}
            onChange={(e) => updateField("image_url", e.target.value)}
            placeholder="https://example.com/feature.png"
            disabled={disabled}
          />
        </div>

        {/* 图片预览 */}
        {block.image_url && (
          <div className="mt-4">
            <Label>图片预览</Label>
            <div className="mt-2 rounded-lg border border-border overflow-hidden bg-muted/20 w-32 h-32">
              <img
                src={block.image_url}
                alt={block.title}
                className="w-full h-full object-cover"
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

FeatureBlockEditor.displayName = "FeatureBlockEditor";

export default FeatureBlockEditor;

