"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { ContextItem } from "@/lib/api/client";

interface DualFieldFormProps {
  items: ContextItem[];
  onAdd: () => void;
  onUpdate: (index: number, item: Partial<ContextItem>) => void;
  onDelete: (index: number) => void;
  label: string;
  emptyText?: string;
  // 第一个字段配置
  field1: {
    placeholder: string;
    getValue: (item: ContextItem) => string;
    getUpdate: (value: string) => Partial<ContextItem>;
    className?: string;
  };
  // 第二个字段配置
  field2: {
    placeholder: string;
    getValue: (item: ContextItem) => string;
    getUpdate: (value: string) => Partial<ContextItem>;
    className?: string;
  };
}

export function DualFieldForm({
  items,
  onAdd,
  onUpdate,
  onDelete,
  label,
  emptyText,
  field1,
  field2,
}: DualFieldFormProps) {
  const defaultEmptyText = emptyText || `Click + to add ${label.toLowerCase()}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          {label} {items.length > 0 && <span>({items.length})</span>}
        </Label>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onAdd}>
          <Plus className="h-3 w-3" />
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
            <div key={item.id} className="flex gap-1 group">
              <Input
                placeholder={field1.placeholder}
                value={field1.getValue(item)}
                onChange={(e) => {
                  const updates = field1.getUpdate(e.target.value);
                  onUpdate(idx, updates);
                }}
                className={`text-xs h-8 bg-background/80 ${field1.className || ""}`}
              />
              <Input
                placeholder={field2.placeholder}
                value={field2.getValue(item)}
                onChange={(e) => {
                  const updates = field2.getUpdate(e.target.value);
                  onUpdate(idx, updates);
                }}
                className={`text-xs h-8 bg-background/80 ${field2.className || ""}`}
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








