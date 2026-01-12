"use client";

/**
 * HeroBlockEditor - Hero 块编辑器
 * 
 * 用于 Landing 页面的 Hero 区域，包含：
 * - 主标题 (headline)
 * - 副标题 (subheadline)
 * - CTA 按钮
 * - 背景图片/视频
 */

import React, { useCallback } from "react";
import { Layout } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { HeroBlock } from "../types";

export interface HeroBlockEditorProps {
  /** Block 数据 */
  block: HeroBlock;
  /** 变更回调 */
  onChange: (block: HeroBlock) => void;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

export const HeroBlockEditor = React.memo<HeroBlockEditorProps>(
  ({ block, onChange, className, disabled = false }) => {
    // 更新字段的通用方法
    const updateField = useCallback(
      <K extends keyof HeroBlock>(field: K, value: HeroBlock[K]) => {
        onChange({ ...block, [field]: value });
      },
      [block, onChange]
    );

    return (
      <div className={cn("space-y-4", className)}>
        {/* 头部标识 */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Layout size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">
            Hero Block
          </span>
        </div>

        {/* 主标题 */}
        <div className="space-y-2">
          <Label htmlFor="headline">主标题 (Headline) *</Label>
          <Input
            id="headline"
            type="text"
            value={block.headline || ""}
            onChange={(e) => updateField("headline", e.target.value)}
            placeholder="吸引眼球的主标题"
            disabled={disabled}
            className="text-lg font-semibold"
          />
        </div>

        {/* 副标题 */}
        <div className="space-y-2">
          <Label htmlFor="subheadline">副标题 (Subheadline)</Label>
          <Textarea
            id="subheadline"
            value={block.subheadline || ""}
            onChange={(e) => updateField("subheadline", e.target.value)}
            placeholder="更详细的描述或价值主张..."
            rows={2}
            disabled={disabled}
          />
        </div>

        {/* CTA 按钮 */}
        <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/10">
          <Label className="text-sm font-medium">主 CTA 按钮</Label>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cta_text">按钮文本</Label>
              <Input
                id="cta_text"
                type="text"
                value={block.cta_text || ""}
                onChange={(e) => updateField("cta_text", e.target.value)}
                placeholder="立即开始"
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta_url">按钮链接</Label>
              <Input
                id="cta_url"
                type="url"
                value={block.cta_url || ""}
                onChange={(e) => updateField("cta_url", e.target.value)}
                placeholder="https://example.com/signup"
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        {/* 背景媒体 */}
        <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/10">
          <Label className="text-sm font-medium">背景媒体</Label>

          <div className="space-y-4">
            {/* 背景图片 */}
            <div className="space-y-2">
              <Label htmlFor="background_image">背景图片 URL</Label>
              <Input
                id="background_image"
                type="url"
                value={block.background_image || ""}
                onChange={(e) => updateField("background_image", e.target.value)}
                placeholder="https://example.com/hero-bg.jpg"
                disabled={disabled}
              />
            </div>

            {/* 背景视频 */}
            <div className="space-y-2">
              <Label htmlFor="video_url">背景视频 URL</Label>
              <Input
                id="video_url"
                type="url"
                value={block.video_url || ""}
                onChange={(e) => updateField("video_url", e.target.value)}
                placeholder="https://example.com/hero-video.mp4"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                可选。如果设置，视频将作为背景播放。
              </p>
            </div>
          </div>

          {/* 背景预览 */}
          {block.background_image && (
            <div className="mt-2">
              <Label>背景预览</Label>
              <div className="mt-2 rounded-lg border border-border overflow-hidden bg-muted/20 h-32">
                <img
                  src={block.background_image}
                  alt="Background Preview"
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

HeroBlockEditor.displayName = "HeroBlockEditor";

export default HeroBlockEditor;

