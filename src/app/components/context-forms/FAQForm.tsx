"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { ContextItem } from "@/lib/api/client";

interface FAQFormProps {
  items: ContextItem[];
  onAdd: () => void;
  onUpdate: (index: number, item: Partial<ContextItem>) => void;
  onDelete: (index: number) => void;
}

export function FAQForm({ items, onAdd, onUpdate, onDelete }: FAQFormProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          FAQs {items.length > 0 && <span>({items.length})</span>}
        </Label>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div
            className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50"
            onClick={onAdd}
          >
            Click + to add FAQs
          </div>
        ) : (
          items.map((faq, idx) => (
            <div
              key={faq.id}
              className="p-3 border rounded-lg bg-background/50 space-y-2 group"
            >
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-primary shrink-0 mt-2">
                  Q:
                </span>
                <Input
                  placeholder="What is your question?"
                  value={faq.extra?.question || faq.title || ""}
                  onChange={(e) =>
                    onUpdate(idx, {
                      extra: { ...faq.extra, question: e.target.value },
                    })
                  }
                  className="text-sm font-medium"
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
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-muted-foreground shrink-0 mt-2">
                  A:
                </span>
                <Textarea
                  placeholder="Your answer..."
                  value={faq.extra?.answer || faq.description || ""}
                  onChange={(e) =>
                    onUpdate(idx, {
                      extra: { ...faq.extra, answer: e.target.value },
                      description: e.target.value,
                    })
                  }
                  className="text-xs min-h-[60px]"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


