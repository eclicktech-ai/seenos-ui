"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface AboutUsData {
  companyStory?: string;
  mission?: string;
  vision?: string;
  coreValues?: string[];
  foundedYear?: number;
  headquarters?: string;
}

interface AboutUsFormProps {
  data: AboutUsData;
  onChange: (data: AboutUsData) => void;
}

export function AboutUsForm({ data, onChange }: AboutUsFormProps) {
  const coreValues = data.coreValues || [];

  const addCoreValue = () => {
    onChange({
      ...data,
      coreValues: [...coreValues, ""],
    });
  };

  const updateCoreValue = (index: number, value: string) => {
    const updated = [...coreValues];
    updated[index] = value;
    onChange({ ...data, coreValues: updated });
  };

  const removeCoreValue = (index: number) => {
    onChange({
      ...data,
      coreValues: coreValues.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-2">
      {/* Company Story */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Company Story</Label>
        <Textarea
          placeholder="Founded in... Our story..."
          value={data.companyStory || ""}
          onChange={(e) => onChange({ ...data, companyStory: e.target.value })}
          className="min-h-[50px]"
        />
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Mission</Label>
          <Textarea
            placeholder="We exist to..."
            value={data.mission || ""}
            onChange={(e) => onChange({ ...data, mission: e.target.value })}
            className="min-h-[40px] text-xs"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Vision</Label>
          <Textarea
            placeholder="We envision a world where..."
            value={data.vision || ""}
            onChange={(e) => onChange({ ...data, vision: e.target.value })}
            className="min-h-[40px] text-xs"
          />
        </div>
      </div>

      {/* Core Values */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            Core Values {coreValues.length > 0 && <span>({coreValues.length})</span>}
          </Label>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={addCoreValue}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="space-y-1">
          {coreValues.length === 0 ? (
            <div
              className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50"
              onClick={addCoreValue}
            >
              Click + to add core values
            </div>
          ) : (
            coreValues.map((value, index) => (
              <div key={index} className="flex gap-1 group">
                <Input
                  value={value}
                  onChange={(e) => updateCoreValue(index, e.target.value)}
                  placeholder="e.g. Integrity, Innovation..."
                  className="text-xs h-8"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={() => removeCoreValue(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

