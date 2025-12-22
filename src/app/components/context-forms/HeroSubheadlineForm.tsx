"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface HeroSubheadlineData {
  subheadline?: string;
}

interface HeroSubheadlineFormProps {
  data: HeroSubheadlineData;
  onChange: (data: HeroSubheadlineData) => void;
}

export function HeroSubheadlineForm({
  data,
  onChange,
}: HeroSubheadlineFormProps) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1 block">Subheadline</Label>
      <Textarea
        placeholder="Supporting statement that expands on the headline..."
        value={data.subheadline || ""}
        onChange={(e) => onChange({ subheadline: e.target.value })}
        className="min-h-[60px] bg-background/80"
      />
    </div>
  );
}

