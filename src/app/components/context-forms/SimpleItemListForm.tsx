"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { ContextItem } from "@/lib/api/client";

interface SimpleItemListFormProps {
  items: ContextItem[];
  onAdd: () => void;
  onUpdate: (index: number, item: Partial<ContextItem>) => void;
  onDelete: (index: number) => void;
  label: string;
  emptyText?: string;
  placeholder?: string;
  // 自定义值获取和更新逻辑
  getValue?: (item: ContextItem) => string;
  getUpdate?: (value: string, item: ContextItem) => Partial<ContextItem>;
  // 样式配置
  spacing?: "sm" | "md" | "lg"; // space-y-2, space-y-3
  iconSize?: "sm" | "md"; // h-5 w-5, h-6 w-6
}

export function SimpleItemListForm({
  items,
  onAdd,
  onUpdate,
  onDelete,
  label,
  emptyText,
  placeholder,
  getValue,
  getUpdate,
  spacing = "md",
  iconSize = "md",
}: SimpleItemListFormProps) {
  const spacingClass = {
    sm: "space-y-2",
    md: "space-y-3",
    lg: "space-y-4",
  }[spacing];

  const iconSizeClass = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
  }[iconSize];

  const iconInnerSize = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
  }[iconSize];

  // 默认值获取逻辑
  const getItemValue = (item: ContextItem): string => {
    if (getValue) {
      return getValue(item);
    }
    // 默认优先级：title > url > description
    return item.title || item.url || item.description || "";
  };

  // 默认更新逻辑
  const getItemUpdate = (value: string, item: ContextItem): Partial<ContextItem> => {
    if (getUpdate) {
      return getUpdate(value, item);
    }
    // 默认更新 title
    return { title: value };
  };

  const defaultEmptyText = emptyText || `Click + to add ${label.toLowerCase()}`;
  const defaultPlaceholder = placeholder || `Enter ${label.toLowerCase()}...`;

  return (
    <div className={spacingClass}>
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          {label} {items.length > 0 && <span>({items.length})</span>}
        </Label>
        <Button variant="ghost" size="icon" className={iconSizeClass} onClick={onAdd}>
          <Plus className={iconInnerSize} />
        </Button>
      </div>
      <div className="space-y-1.5">
        {items.length === 0 ? (
          <div
            className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50"
            onClick={onAdd}
          >
            {defaultEmptyText}
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={item.id} className="flex gap-1.5 group">
              <Input
                placeholder={defaultPlaceholder}
                value={getItemValue(item)}
                onChange={(e) => {
                  const updates = getItemUpdate(e.target.value, item);
                  onUpdate(idx, updates);
                }}
                className="text-xs h-8"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0"
                onClick={() => onDelete(idx)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


