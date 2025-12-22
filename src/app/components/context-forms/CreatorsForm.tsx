"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { ContextPerson } from "@/lib/api/client";

interface CreatorsFormProps {
  items: ContextPerson[];
  onAdd: () => void;
  onUpdate: (index: number, item: Partial<ContextPerson>) => void;
  onDelete: (index: number) => void;
  label?: string;
}

export function CreatorsForm({
  items,
  onAdd,
  onUpdate,
  onDelete,
  label = "Creators",
}: CreatorsFormProps) {
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
      <div className="space-y-2">
        {items.length === 0 ? (
          <div
            className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50"
            onClick={onAdd}
          >
            Click + to add creators
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={item.id} className="p-3 border rounded-md space-y-2 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground/70 mb-0.5 block">
                      Name *
                    </Label>
                    <Input
                      value={item.name || ""}
                      onChange={(e) => onUpdate(idx, { name: e.target.value })}
                      className="text-xs h-8"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground/70 mb-0.5 block">
                      Title
                    </Label>
                    <Input
                      value={item.title || ""}
                      onChange={(e) => onUpdate(idx, { title: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground/70 mb-0.5 block">
                      Bio
                    </Label>
                    <Textarea
                      value={item.bio || ""}
                      onChange={(e) => onUpdate(idx, { bio: e.target.value })}
                      className="text-xs min-h-[50px]"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground/70 mb-0.5 block">
                        Photo URL
                      </Label>
                      <Input
                        value={item.photo_url || ""}
                        onChange={(e) => onUpdate(idx, { photo_url: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground/70 mb-0.5 block">
                        Platform
                      </Label>
                      <Input
                        value={item.platform || ""}
                        onChange={(e) => onUpdate(idx, { platform: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground/70 mb-0.5 block">
                        Handle
                      </Label>
                      <Input
                        value={item.handle || ""}
                        onChange={(e) => onUpdate(idx, { handle: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground/70 mb-0.5 block">
                        URL
                      </Label>
                      <Input
                        value={item.url || ""}
                        onChange={(e) => onUpdate(idx, { url: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground/70 mb-0.5 block">
                      Notes
                    </Label>
                    <Textarea
                      value={item.notes || ""}
                      onChange={(e) => onUpdate(idx, { notes: e.target.value })}
                      className="text-xs min-h-[50px]"
                      rows={2}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                  onClick={() => onDelete(idx)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


