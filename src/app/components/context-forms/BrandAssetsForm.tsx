"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface BrandAssetsData {
  brandName?: {
    name?: string;
    subtitle?: string;
  };
  metaDescription?: string;
  images?: {
    favicon?: string;
    ogImage?: string;
  };
  logos?: {
    fullLogoLight?: string;
    fullLogoDark?: string;
    iconOnlyLight?: string;
    iconOnlyDark?: string;
  };
  colors?: {
    primaryLight?: string;
    primaryDark?: string;
    secondaryLight?: string;
    secondaryDark?: string;
  };
  typography?: {
    heading?: string;
    body?: string;
  };
  tone?: string;
  languages?: string;
}

interface BrandAssetsFormProps {
  data: BrandAssetsData;
  onChange: (data: BrandAssetsData) => void;
}

export function BrandAssetsForm({ data, onChange }: BrandAssetsFormProps) {
  const updateNested = (path: string[], value: any) => {
    const newData = { ...data };
    let current: any = newData;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    onChange(newData);
  };

  return (
    <div className="grid gap-3">
      {/* Homepage Meta Info */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Brand Name *</Label>
            <Input
              placeholder="Company or Product Name"
              value={data.brandName?.name || ""}
              onChange={(e) =>
                updateNested(["brandName", "name"], e.target.value)
              }
              className="text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Subtitle</Label>
            <Input
              placeholder="Your Tagline or Slogan"
              value={data.brandName?.subtitle || ""}
              onChange={(e) =>
                updateNested(["brandName", "subtitle"], e.target.value)
              }
              className="text-xs h-8"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Meta Description</Label>
          <Textarea
            placeholder="A compelling description of your website (150-160 characters)..."
            value={data.metaDescription || ""}
            onChange={(e) => updateNested(["metaDescription"], e.target.value)}
            className="text-xs min-h-[50px]"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Open Graph Image</Label>
            <Input
              placeholder="https://... (1200x630)"
              value={data.images?.ogImage || ""}
              onChange={(e) =>
                updateNested(["images", "ogImage"], e.target.value)
              }
              className="text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Favicon</Label>
            <Input
              placeholder="https://... (32x32)"
              value={data.images?.favicon || ""}
              onChange={(e) =>
                updateNested(["images", "favicon"], e.target.value)
              }
              className="text-xs h-8"
            />
          </div>
        </div>
      </div>

      {/* Logo URL */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground mb-1 block">Logo URL</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Full Logo (Light)"
            value={data.logos?.fullLogoLight || ""}
            onChange={(e) =>
              updateNested(["logos", "fullLogoLight"], e.target.value)
            }
            className="text-xs h-8"
          />
          <Input
            placeholder="Full Logo (Dark)"
            value={data.logos?.fullLogoDark || ""}
            onChange={(e) =>
              updateNested(["logos", "fullLogoDark"], e.target.value)
            }
            className="text-xs h-8"
          />
          <Input
            placeholder="Icon Only (Light)"
            value={data.logos?.iconOnlyLight || ""}
            onChange={(e) =>
              updateNested(["logos", "iconOnlyLight"], e.target.value)
            }
            className="text-xs h-8"
          />
          <Input
            placeholder="Icon Only (Dark)"
            value={data.logos?.iconOnlyDark || ""}
            onChange={(e) =>
              updateNested(["logos", "iconOnlyDark"], e.target.value)
            }
            className="text-xs h-8"
          />
        </div>
      </div>

      {/* Brand Colors */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground mb-1 block">Brand Colors</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Primary (Light): #3B82F6"
            value={data.colors?.primaryLight || ""}
            onChange={(e) =>
              updateNested(["colors", "primaryLight"], e.target.value)
            }
            className="text-xs h-8"
          />
          <Input
            placeholder="Primary (Dark): #60A5FA"
            value={data.colors?.primaryDark || ""}
            onChange={(e) =>
              updateNested(["colors", "primaryDark"], e.target.value)
            }
            className="text-xs h-8"
          />
          <Input
            placeholder="Secondary (Light): #10B981"
            value={data.colors?.secondaryLight || ""}
            onChange={(e) =>
              updateNested(["colors", "secondaryLight"], e.target.value)
            }
            className="text-xs h-8"
          />
          <Input
            placeholder="Secondary (Dark): #34D399"
            value={data.colors?.secondaryDark || ""}
            onChange={(e) =>
              updateNested(["colors", "secondaryDark"], e.target.value)
            }
            className="text-xs h-8"
          />
        </div>
      </div>

      {/* Typography */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Typography / Fonts</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Heading: Inter"
            value={data.typography?.heading || ""}
            onChange={(e) =>
              updateNested(["typography", "heading"], e.target.value)
            }
            className="text-xs h-8"
          />
          <Input
            placeholder="Body: Open Sans"
            value={data.typography?.body || ""}
            onChange={(e) =>
              updateNested(["typography", "body"], e.target.value)
            }
            className="text-xs h-8"
          />
        </div>
      </div>

      {/* Tone of Voice */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Tone of Voice</Label>
        <Input
          placeholder="Professional, Friendly, Bold..."
          value={data.tone || ""}
          onChange={(e) => updateNested(["tone"], e.target.value)}
          className="text-xs"
        />
      </div>

      {/* Supported Languages */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Supported Languages</Label>
        <Input
          placeholder="English, Spanish, Chinese..."
          value={data.languages || ""}
          onChange={(e) => updateNested(["languages"], e.target.value)}
          className="text-xs"
        />
      </div>
    </div>
  );
}

