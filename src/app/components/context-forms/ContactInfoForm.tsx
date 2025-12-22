"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ContactInfoData {
  email?: string;
  salesEmail?: string;
  phone?: string;
  address?: string;
  businessHours?: string;
  timezone?: string;
  helpCenter?: string;
  liveChat?: string;
  supportEmail?: string;
  community?: string;
  pressEmail?: string;
  partnersEmail?: string;
  careersEmail?: string;
  newsletter?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
    crunchbase?: string;
    [key: string]: string | undefined;
  };
}

interface ContactInfoFormProps {
  data: ContactInfoData;
  onChange: (data: ContactInfoData) => void;
}

export function ContactInfoForm({
  data,
  onChange,
}: ContactInfoFormProps) {
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
    <div className="space-y-4">
      {/* Row 1: Primary Contact Methods */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground font-medium">Primary Contact</Label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">General Email</Label>
            <Input
              type="email"
              placeholder="contact@company.com"
              value={data.email || ""}
              onChange={(e) => updateNested(["email"], e.target.value)}
              className="text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Sales Email</Label>
            <Input
              type="email"
              placeholder="sales@company.com"
              value={data.salesEmail || ""}
              onChange={(e) => updateNested(["salesEmail"], e.target.value)}
              className="text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Phone</Label>
            <Input
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={data.phone || ""}
              onChange={(e) => updateNested(["phone"], e.target.value)}
              className="text-xs h-8"
            />
          </div>
        </div>
      </div>

      {/* Row 2: Location & Hours */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground font-medium">Location & Hours</Label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">HQ Address</Label>
            <Input
              placeholder="123 Main St, City, Country"
              value={data.address || ""}
              onChange={(e) => updateNested(["address"], e.target.value)}
              className="text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Business Hours</Label>
            <Input
              placeholder="Mon-Fri 9am-5pm EST"
              value={data.businessHours || ""}
              onChange={(e) => updateNested(["businessHours"], e.target.value)}
              className="text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Timezone</Label>
            <Input
              placeholder="UTC-5 / EST / PST..."
              value={data.timezone || ""}
              onChange={(e) => updateNested(["timezone"], e.target.value)}
              className="text-xs h-8"
            />
          </div>
        </div>
      </div>

      {/* Row 3: Support Channels */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground font-medium">Support Channels</Label>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Help Center</Label>
            <Input
              placeholder="help.company.com"
              value={data.helpCenter || ""}
              onChange={(e) => updateNested(["helpCenter"], e.target.value)}
              className="text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Live Chat</Label>
            <Input
              placeholder="Intercom / Zendesk..."
              value={data.liveChat || ""}
              onChange={(e) => updateNested(["liveChat"], e.target.value)}
              className="text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Support Email</Label>
            <Input
              placeholder="support@company.com"
              value={data.supportEmail || ""}
              onChange={(e) => updateNested(["supportEmail"], e.target.value)}
              className="text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Community</Label>
            <Input
              placeholder="Discord / Slack..."
              value={data.community || ""}
              onChange={(e) => updateNested(["community"], e.target.value)}
              className="text-xs h-8"
            />
          </div>
        </div>
      </div>

      {/* Row 4: Additional Contact Options */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground font-medium">Additional</Label>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Press / Media</Label>
            <Input
              placeholder="press@company.com"
              value={data.pressEmail || ""}
              onChange={(e) => updateNested(["pressEmail"], e.target.value)}
              className="text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Partnerships</Label>
            <Input
              placeholder="partners@company.com"
              value={data.partnersEmail || ""}
              onChange={(e) => updateNested(["partnersEmail"], e.target.value)}
              className="text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Careers</Label>
            <Input
              placeholder="careers@company.com"
              value={data.careersEmail || ""}
              onChange={(e) => updateNested(["careersEmail"], e.target.value)}
              className="text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Newsletter</Label>
            <Input
              placeholder="https://..."
              value={data.newsletter || ""}
              onChange={(e) => updateNested(["newsletter"], e.target.value)}
              className="text-xs h-8"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

