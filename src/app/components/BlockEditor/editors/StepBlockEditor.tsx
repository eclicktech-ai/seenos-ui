"use client";

/**
 * StepBlockEditor - 步骤块编辑器
 * 
 * 用于 Guide 页面的教程步骤，包含：
 * - 步骤序号
 * - 标题
 * - 预计时间
 * - 操作说明 (Markdown)
 * - 检查清单
 * - 专业提示
 * - 警告信息
 * - 图片
 */

import React, { useCallback } from "react";
import { ListOrdered, Clock, AlertTriangle, Lightbulb } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ListEditor } from "./ListEditor";
import type { StepBlock } from "../types";

export interface StepBlockEditorProps {
  /** Block 数据 */
  block: StepBlock;
  /** 变更回调 */
  onChange: (block: StepBlock) => void;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

export const StepBlockEditor = React.memo<StepBlockEditorProps>(
  ({ block, onChange, className, disabled = false }) => {
    // 更新字段的通用方法
    const updateField = useCallback(
      <K extends keyof StepBlock>(field: K, value: StepBlock[K]) => {
        onChange({ ...block, [field]: value });
      },
      [block, onChange]
    );

    return (
      <div className={cn("space-y-4", className)}>
        {/* 头部标识 */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <ListOrdered size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">
            Step Block
          </span>
        </div>

        {/* 步骤序号和标题 */}
        <div className="grid grid-cols-4 gap-4">
          {/* 步骤序号 */}
          <div className="space-y-2">
            <Label htmlFor="step_number">步骤 #</Label>
            <Input
              id="step_number"
              type="number"
              min={1}
              value={block.step_number || 1}
              onChange={(e) => updateField("step_number", parseInt(e.target.value) || 1)}
              disabled={disabled}
            />
          </div>

          {/* 标题 */}
          <div className="col-span-3 space-y-2">
            <Label htmlFor="title">步骤标题 *</Label>
            <Input
              id="title"
              type="text"
              value={block.title || ""}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="步骤标题"
              disabled={disabled}
            />
          </div>
        </div>

        {/* 预计时间 */}
        <div className="space-y-2">
          <Label htmlFor="estimated_time" className="flex items-center gap-1">
            <Clock size={14} />
            预计时间
          </Label>
          <Input
            id="estimated_time"
            type="text"
            value={block.estimated_time || ""}
            onChange={(e) => updateField("estimated_time", e.target.value)}
            placeholder="5 分钟"
            disabled={disabled}
          />
        </div>

        {/* 操作说明 */}
        <div className="space-y-2">
          <Label htmlFor="instructions">操作说明 *</Label>
          <Textarea
            id="instructions"
            value={block.instructions || ""}
            onChange={(e) => updateField("instructions", e.target.value)}
            placeholder="详细的操作步骤说明... (支持 Markdown)"
            rows={6}
            disabled={disabled}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            支持 Markdown 格式
          </p>
        </div>

        {/* 检查清单 */}
        <div className="space-y-2">
          <Label>检查清单 (Checklist)</Label>
          <ListEditor
            items={block.checklist || []}
            onChange={(checklist) => updateField("checklist", checklist)}
            placeholder="添加检查项..."
            addButtonText="添加"
            variant="compact"
            disabled={disabled}
            emptyText="暂无检查项"
          />
        </div>

        {/* 专业提示 */}
        <div className="space-y-2">
          <Label htmlFor="pro_tip" className="flex items-center gap-1">
            <Lightbulb size={14} className="text-yellow-500" />
            专业提示 (Pro Tip)
          </Label>
          <Textarea
            id="pro_tip"
            value={block.pro_tip || ""}
            onChange={(e) => updateField("pro_tip", e.target.value)}
            placeholder="分享一个有用的技巧或建议..."
            rows={2}
            disabled={disabled}
          />
        </div>

        {/* 警告信息 */}
        <div className="space-y-2">
          <Label htmlFor="warning" className="flex items-center gap-1">
            <AlertTriangle size={14} className="text-orange-500" />
            警告信息 (Warning)
          </Label>
          <Textarea
            id="warning"
            value={block.warning || ""}
            onChange={(e) => updateField("warning", e.target.value)}
            placeholder="需要注意的重要事项..."
            rows={2}
            disabled={disabled}
          />
        </div>

        {/* 图片 URL */}
        <div className="space-y-2">
          <Label htmlFor="image_url">步骤配图 URL</Label>
          <Input
            id="image_url"
            type="url"
            value={block.image_url || ""}
            onChange={(e) => updateField("image_url", e.target.value)}
            placeholder="https://example.com/step.jpg"
            disabled={disabled}
          />
        </div>

        {/* 图片预览 */}
        {block.image_url && (
          <div className="mt-4">
            <Label>图片预览</Label>
            <div className="mt-2 rounded-lg border border-border overflow-hidden bg-muted/20">
              <img
                src={block.image_url}
                alt={`Step ${block.step_number}`}
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

StepBlockEditor.displayName = "StepBlockEditor";

export default StepBlockEditor;

