"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface HeroHeadlineData {
  headline?: string;
}

interface HeroHeadlineFormProps {
  data: HeroHeadlineData;
  onChange: (data: HeroHeadlineData) => void;
}

export function HeroHeadlineForm({
  data,
  onChange,
}: HeroHeadlineFormProps) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1 block">Headline / Value Proposition</Label>
      <Textarea
        placeholder="Your main headline - the #1 reason customers should choose you"
        value={data.headline || ""}
        onChange={(e) => onChange({ headline: e.target.value })}
        className="min-h-[60px] bg-background/80"
      />
    </div>
  );
}

