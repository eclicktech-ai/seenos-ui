"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import type { ContextItem } from "@/lib/api/client";

interface ResourcesFormProps {
  items: ContextItem[];
  onAdd: () => void;
  onUpdate: (index: number, item: Partial<ContextItem>) => void;
  onDelete: (index: number) => void;
  label?: string;
}

export function ResourcesForm({
  items,
  onAdd,
  onUpdate,
  onDelete,
  label = "Resources",
}: ResourcesFormProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="space-y-3" lang="en">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          {label} {items.length > 0 && <span>({items.length})</span>}
        </Label>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div
            className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50"
            onClick={onAdd}
          >
            Click + to add {label.toLowerCase()}
          </div>
        ) : (
          items.map((item, idx) => {
            const isExpanded = expandedItems.has(item.id);

            return (
              <div
                key={item.id}
                className="border rounded-md p-2 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleExpand(item.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Input
                    placeholder="Title..."
                    value={item.title || ""}
                    onChange={(e) => onUpdate(idx, { title: e.target.value })}
                    className="text-xs h-8 flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => onDelete(idx)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {isExpanded && (
                  <div className="space-y-2 pl-8">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Description
                      </Label>
                      <Textarea
                        placeholder="Description..."
                        value={item.description || ""}
                        onChange={(e) =>
                          onUpdate(idx, { description: e.target.value })
                        }
                        className="text-xs min-h-[60px]"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        URL
                      </Label>
                      <Input
                        placeholder="https://..."
                        value={item.url || ""}
                        onChange={(e) => onUpdate(idx, { url: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Image URL
                      </Label>
                      <Input
                        placeholder="https://..."
                        value={item.image_url || ""}
                        onChange={(e) =>
                          onUpdate(idx, { image_url: e.target.value })
                        }
                        className="text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Notes
                      </Label>
                      <Textarea
                        placeholder="Notes..."
                        value={item.notes || ""}
                        onChange={(e) =>
                          onUpdate(idx, { notes: e.target.value })
                        }
                        className="text-xs min-h-[40px]"
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

