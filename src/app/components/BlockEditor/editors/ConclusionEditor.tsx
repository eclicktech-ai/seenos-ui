"use client";

/**
 * ConclusionEditor - 结论块编辑器
 * 
 * 用于页面的结论/总结部分，包含：
 * - 总结 (summary) - Markdown
 * - 最终推荐 (final_recommendation)
 * - CTA 按钮
 */

import React, { useCallback } from "react";
import { CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ConclusionBlock } from "../types";

export interface ConclusionEditorProps {
  /** Block 数据 */
  block: ConclusionBlock;
  /** 变更回调 */
  onChange: (block: ConclusionBlock) => void;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

export const ConclusionEditor = React.memo<ConclusionEditorProps>(
  ({ block, onChange, className, disabled = false }) => {
    // 更新字段的通用方法
    const updateField = useCallback(
      <K extends keyof ConclusionBlock>(field: K, value: ConclusionBlock[K]) => {
        onChange({ ...block, [field]: value });
      },
      [block, onChange]
    );

    return (
      <div className={cn("space-y-4", className)}>
        {/* 头部标识 */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">
            Conclusion Block
          </span>
        </div>

        {/* 总结 */}
        <div className="space-y-2">
          <Label htmlFor="summary">总结 (Summary) *</Label>
          <Textarea
            id="summary"
            value={block.summary || ""}
            onChange={(e) => updateField("summary", e.target.value)}
            placeholder="输入结论总结... (支持 Markdown)"
            rows={6}
            disabled={disabled}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            支持 Markdown 格式
          </p>
        </div>

        {/* 最终推荐 */}
        <div className="space-y-2">
          <Label htmlFor="final_recommendation">最终推荐</Label>
          <Textarea
            id="final_recommendation"
            value={block.final_recommendation || ""}
            onChange={(e) => updateField("final_recommendation", e.target.value)}
            placeholder="给读者的最终建议或推荐..."
            rows={3}
            disabled={disabled}
          />
        </div>

        {/* CTA 按钮 */}
        <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/10">
          <Label className="text-sm font-medium">行动号召 (CTA)</Label>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cta_text">CTA 文本</Label>
              <Input
                id="cta_text"
                type="text"
                value={block.cta_text || ""}
                onChange={(e) => updateField("cta_text", e.target.value)}
                placeholder="开始行动"
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta_url">CTA 链接</Label>
              <Input
                id="cta_url"
                type="url"
                value={block.cta_url || ""}
                onChange={(e) => updateField("cta_url", e.target.value)}
                placeholder="https://example.com/action"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ConclusionEditor.displayName = "ConclusionEditor";

export default ConclusionEditor;

