"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Package,
  ListOrdered,
  Zap,
  AlignLeft,
  Quote,
  MousePointer,
  Image,
  Layout,
  CheckCircle,
} from "lucide-react";
import type { BlockType } from "./types";

interface BlockTypeOption {
  type: BlockType;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: "content" | "media" | "layout";
}

const BLOCK_OPTIONS: BlockTypeOption[] = [
  {
    type: "intro",
    label: "Intro",
    description: "Introduction section with headline",
    icon: <FileText size={20} />,
    category: "content",
  },
  {
    type: "text_section",
    label: "Text Section",
    description: "Rich text content block",
    icon: <AlignLeft size={20} />,
    category: "content",
  },
  {
    type: "product_card",
    label: "Product Card",
    description: "Product with pros, cons, rating",
    icon: <Package size={20} />,
    category: "content",
  },
  {
    type: "step",
    label: "Step",
    description: "Tutorial step with instructions",
    icon: <ListOrdered size={20} />,
    category: "content",
  },
  {
    type: "feature",
    label: "Feature",
    description: "Feature highlight with icon",
    icon: <Zap size={20} />,
    category: "content",
  },
  {
    type: "quote",
    label: "Quote",
    description: "Testimonial or quote block",
    icon: <Quote size={20} />,
    category: "content",
  },
  {
    type: "conclusion",
    label: "Conclusion",
    description: "Summary and final CTA",
    icon: <CheckCircle size={20} />,
    category: "content",
  },
  {
    type: "image",
    label: "Image",
    description: "Image with caption",
    icon: <Image size={20} />,
    category: "media",
  },
  {
    type: "hero",
    label: "Hero",
    description: "Hero section with headline",
    icon: <Layout size={20} />,
    category: "layout",
  },
  {
    type: "call_to_action",
    label: "Call to Action",
    description: "CTA button with headline",
    icon: <MousePointer size={20} />,
    category: "layout",
  },
];

interface BlockTypeMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectType: (type: BlockType) => void;
}

export const BlockTypeMenu = React.memo<BlockTypeMenuProps>(
  ({ open, onOpenChange, onSelectType }) => {
    const contentBlocks = BLOCK_OPTIONS.filter((b) => b.category === "content");
    const mediaBlocks = BLOCK_OPTIONS.filter((b) => b.category === "media");
    const layoutBlocks = BLOCK_OPTIONS.filter((b) => b.category === "layout");

    const handleSelect = (type: BlockType) => {
      onSelectType(type);
      onOpenChange(false);
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Block</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Content Blocks */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Content
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {contentBlocks.map((option) => (
                  <Button
                    key={option.type}
                    variant="outline"
                    onClick={() => handleSelect(option.type)}
                    className="h-auto flex-col items-start gap-1 p-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {option.icon}
                      </span>
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Media Blocks */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Media
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {mediaBlocks.map((option) => (
                  <Button
                    key={option.type}
                    variant="outline"
                    onClick={() => handleSelect(option.type)}
                    className="h-auto flex-col items-start gap-1 p-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {option.icon}
                      </span>
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Layout Blocks */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Layout
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {layoutBlocks.map((option) => (
                  <Button
                    key={option.type}
                    variant="outline"
                    onClick={() => handleSelect(option.type)}
                    className="h-auto flex-col items-start gap-1 p-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {option.icon}
                      </span>
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

BlockTypeMenu.displayName = "BlockTypeMenu";

export default BlockTypeMenu;

