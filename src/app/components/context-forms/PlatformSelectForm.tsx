"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import type { ContextEntity } from "@/lib/api/client";

interface PlatformSelectFormProps {
  items: ContextEntity[];
  onAdd: () => void;
  onUpdate: (index: number, item: Partial<ContextEntity>) => void;
  onDelete: (index: number) => void;
  label?: string;
  platforms: string[];
  defaultPlatform?: string;
  urlPlaceholder?: string;
  // 自定义更新逻辑（某些表单在更新 platform 时同时更新 name）
  onPlatformChange?: (value: string, item: ContextEntity) => Partial<ContextEntity>;
}

export function PlatformSelectForm({
  items,
  onAdd,
  onUpdate,
  onDelete,
  label = "Platforms",
  platforms,
  defaultPlatform,
  urlPlaceholder = "URL",
  onPlatformChange,
}: PlatformSelectFormProps) {
  const handlePlatformChange = (idx: number, value: string) => {
    const item = items[idx];
    if (onPlatformChange) {
      const updates = onPlatformChange(value, item);
      onUpdate(idx, updates);
    } else {
      onUpdate(idx, { platform: value });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          {label} {items.length > 0 && <span>({items.length})</span>}
        </Label>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-1">
        {items.length === 0 ? (
          <div
            className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50"
            onClick={onAdd}
          >
            Click + to add {label.toLowerCase()}
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={item.id} className="flex gap-1 group text-xs items-center">
              <Select
                value={item.platform || item.name || defaultPlatform || platforms[0]}
                onValueChange={(value) => handlePlatformChange(idx, value)}
              >
                <SelectTrigger className="h-8 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-8 text-xs flex-1"
                placeholder={urlPlaceholder}
                value={item.url || ""}
                onChange={(e) => onUpdate(idx, { url: e.target.value })}
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

