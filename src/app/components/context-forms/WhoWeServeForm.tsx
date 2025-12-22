"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface TargetAudience {
  name: string;
  description?: string;
}

interface WhoWeServeData {
  targetAudiences?: TargetAudience[];
}

interface WhoWeServeFormProps {
  data: WhoWeServeData;
  onChange: (data: WhoWeServeData) => void;
}

export function WhoWeServeForm({ data, onChange }: WhoWeServeFormProps) {
  const audiences = data.targetAudiences || [];

  const addAudience = () => {
    onChange({
      ...data,
      targetAudiences: [...audiences, { name: "", description: "" }],
    });
  };

  const updateAudience = (
    index: number,
    field: keyof TargetAudience,
    value: string
  ) => {
    const updated = [...audiences];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, targetAudiences: updated });
  };

  const removeAudience = (index: number) => {
    onChange({
      ...data,
      targetAudiences: audiences.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          Target Audiences {audiences.length > 0 && <span>({audiences.length})</span>}
        </Label>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={addAudience}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-1.5">
        {audiences.length === 0 ? (
          <div
            className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50"
            onClick={addAudience}
          >
            Click + to add target audiences
          </div>
        ) : (
          audiences.map((audience, index) => (
            <div key={index} className="flex gap-1.5 group">
              <Input
                placeholder="Target segment (e.g., SaaS startups, Enterprise CTOs...)"
                value={audience.name}
                onChange={(e) =>
                  updateAudience(index, "name", e.target.value)
                }
                className="text-xs h-8"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0"
                onClick={() => removeAudience(index)}
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

