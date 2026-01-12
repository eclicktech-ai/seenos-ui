"use client";

/**
 * GenericBlockEditor - 通用块编辑器
 * 
 * 用于处理没有专门编辑器的 Block 类型。
 * 以 JSON 编辑器的形式显示和编辑 Block 数据。
 */

import React, { useCallback, useState, useEffect } from "react";
import { Code2, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ContentBlock } from "../types";

export interface GenericBlockEditorProps {
  /** Block 数据 */
  block: ContentBlock;
  /** 变更回调 */
  onChange: (block: ContentBlock) => void;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

export const GenericBlockEditor = React.memo<GenericBlockEditorProps>(
  ({ block, onChange, className, disabled = false }) => {
    // 将 block 转换为 JSON 字符串（排除 meta）
    const getEditableJson = useCallback(() => {
      const { meta, ...rest } = block;
      return JSON.stringify(rest, null, 2);
    }, [block]);

    const [jsonValue, setJsonValue] = useState(getEditableJson);
    const [parseError, setParseError] = useState<string | null>(null);

    // 当 block 变化时，更新 JSON
    useEffect(() => {
      setJsonValue(getEditableJson());
      setParseError(null);
    }, [getEditableJson]);

    // 处理 JSON 变化
    const handleJsonChange = useCallback(
      (value: string) => {
        setJsonValue(value);
        try {
          const parsed = JSON.parse(value);
          setParseError(null);
          // 保留原有的 meta 信息
          onChange({ ...parsed, meta: block.meta });
        } catch (e) {
          setParseError((e as Error).message);
        }
      },
      [block.meta, onChange]
    );

    return (
      <div className={cn("space-y-4", className)}>
        {/* 头部标识 */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Code2 size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">
            {block.meta.type} Block (JSON Editor)
          </span>
        </div>

        {/* 提示信息 */}
        <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
          此 Block 类型暂无专用编辑器，请直接编辑 JSON 数据。
        </div>

        {/* JSON 编辑器 */}
        <div className="space-y-2">
          <Label htmlFor="json-editor">Block 数据 (JSON)</Label>
          <Textarea
            id="json-editor"
            value={jsonValue}
            onChange={(e) => handleJsonChange(e.target.value)}
            rows={12}
            disabled={disabled}
            className={cn(
              "font-mono text-sm",
              parseError && "border-destructive focus-visible:ring-destructive"
            )}
          />
          
          {/* 错误提示 */}
          {parseError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle size={14} />
              <span>JSON 格式错误: {parseError}</span>
            </div>
          )}
        </div>

        {/* Block Meta 信息（只读） */}
        <div className="space-y-2 rounded-md bg-muted/30 p-3">
          <Label className="text-xs text-muted-foreground">Block 元数据</Label>
          <div className="text-xs font-mono text-muted-foreground">
            <div>ID: {block.meta.id}</div>
            <div>Type: {block.meta.type}</div>
            <div>Order: {block.meta.order}</div>
            {block.meta.is_ai_generated && <div>AI Generated: Yes</div>}
            {block.meta.last_edited_at && (
              <div>Last Edited: {new Date(block.meta.last_edited_at).toLocaleString()}</div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

GenericBlockEditor.displayName = "GenericBlockEditor";

export default GenericBlockEditor;

