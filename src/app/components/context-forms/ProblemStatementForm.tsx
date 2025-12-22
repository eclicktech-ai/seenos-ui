"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface PainPoint {
  title: string;
  description?: string;
}

interface ProblemStatementData {
  painPoints?: PainPoint[];
}

interface ProblemStatementFormProps {
  data: ProblemStatementData;
  onChange: (data: ProblemStatementData) => void;
}

export function ProblemStatementForm({
  data,
  onChange,
}: ProblemStatementFormProps) {
  const painPoints = data.painPoints || [];

  const addPainPoint = () => {
    onChange({
      ...data,
      painPoints: [...painPoints, { title: "", description: "" }],
    });
  };

  const updatePainPoint = (index: number, field: keyof PainPoint, value: string) => {
    const updated = [...painPoints];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, painPoints: updated });
  };

  const removePainPoint = (index: number) => {
    onChange({
      ...data,
      painPoints: painPoints.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          Pain Points {painPoints.length > 0 && <span>({painPoints.length})</span>}
        </Label>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={addPainPoint}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-1.5">
        {painPoints.length === 0 ? (
          <div
            className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50"
            onClick={addPainPoint}
          >
            Click + to add pain points
          </div>
        ) : (
          painPoints.map((point, index) => (
            <div key={index} className="flex gap-1.5 group">
              <Input
                placeholder="Customer pain point..."
                value={point.title}
                onChange={(e) =>
                  updatePainPoint(index, "title", e.target.value)
                }
                className="text-xs h-8"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0"
                onClick={() => removePainPoint(index)}
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

