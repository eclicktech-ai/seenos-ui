/**
 * OnSite Tab Component
 * Displays on-site brand information and website content
 */

import React from "react";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import {
  Palette,
  Layout,
  Flag,
  AlertTriangle,
  Users,
  Zap,
  Building2,
  ShoppingBag,
  Star,
  UserCircle,
  Info,
  HelpCircle,
  MessageSquare,
  Megaphone,
  BookOpen,
} from "lucide-react";
import type { TabProps } from "../types";
import { ReadOnlyField } from "../components/ReadOnlyField";
import { SectionHeader } from "../components/SectionHeader";
import { SubSectionHeader } from "../components/SubSectionHeader";
import { EditableSectionLabel } from "../components/EditableSectionLabel";

export function OnSiteTab({ contextData, openEditDialog }: TabProps) {
  return (
    <TabsContent value="onSite" className="p-8 m-0 h-full overflow-y-auto">
      <div className="flex gap-8 pb-12">
        {/* Left Column - 1/3 Width: Brand Assets & Pages */}
        <div className="w-1/3 shrink-0 space-y-5">
          {/* Brand Assets - Expanded */}
          <div className="p-5 border rounded-xl bg-card/50 space-y-5">
            <SectionHeader 
              icon={Palette} 
              title="Brand Assets" 
              label="Brand Assets" 
              onEdit={openEditDialog}
            />
            <div className="grid gap-3">
              {/* Homepage Meta Info */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground/70 mb-0.5 block">
                      Brand Name *
                    </Label>
                    <ReadOnlyField
                      value={contextData.onSite.brandInfo.name}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground/70 mb-0.5 block">
                      Subtitle
                    </Label>
                    <ReadOnlyField
                      value={
                        contextData.onSite.websiteContent.find(
                          (c: any) => c.url === "#meta-subtitle"
                        )?.name
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground/70 mb-0.5 block">
                    Meta Description
                  </Label>
                  <ReadOnlyField
                    value={
                      contextData.onSite.websiteContent.find(
                        (c: any) => c.url === "#meta-description"
                      )?.name
                    }
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground/70 mb-0.5 block">
                      Open Graph Image
                    </Label>
                    <ReadOnlyField
                      value={
                        contextData.onSite.websiteContent.find(
                          (c: any) => c.url === "#meta-og-image"
                        )?.name
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground/70 mb-0.5 block">
                      Favicon
                    </Label>
                    <ReadOnlyField
                      value={
                        contextData.onSite.websiteContent.find(
                          (c: any) => c.url === "#meta-favicon"
                        )?.name
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Logo URL
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  <ReadOnlyField
                    value={
                      contextData.onSite.websiteContent.find(
                        (c: any) => c.url === "#brand-logo"
                      )?.name
                    }
                  />
                  <ReadOnlyField
                    value={
                      contextData.onSite.websiteContent.find(
                        (c: any) => c.url === "#brand-logo-dark"
                      )?.name
                    }
                  />
                  <ReadOnlyField
                    value={
                      contextData.onSite.websiteContent.find(
                        (c: any) => c.url === "#brand-logo-icon"
                      )?.name
                    }
                  />
                  <ReadOnlyField
                    value={
                      contextData.onSite.websiteContent.find(
                        (c: any) => c.url === "#brand-logo-icon-dark"
                      )?.name
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Brand Colors
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  <ReadOnlyField
                    value={
                      contextData.onSite.websiteContent.find(
                        (c: any) => c.url === "#brand-color-primary"
                      )?.name
                    }
                  />
                  <ReadOnlyField
                    value={
                      contextData.onSite.websiteContent.find(
                        (c: any) => c.url === "#brand-color-primary-dark"
                      )?.name
                    }
                  />
                  <ReadOnlyField
                    value={
                      contextData.onSite.websiteContent.find(
                        (c: any) => c.url === "#brand-color-secondary"
                      )?.name
                    }
                  />
                  <ReadOnlyField
                    value={
                      contextData.onSite.websiteContent.find(
                        (c: any) => c.url === "#brand-color-secondary-dark"
                      )?.name
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Typography / Fonts
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  <ReadOnlyField
                    value={
                      contextData.onSite.websiteContent.find(
                        (c: any) => c.url === "#brand-font-heading"
                      )?.name
                    }
                  />
                  <ReadOnlyField
                    value={
                      contextData.onSite.websiteContent.find(
                        (c: any) => c.url === "#brand-font-body"
                      )?.name
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Tone of Voice
                </Label>
                <ReadOnlyField
                  value={
                    contextData.onSite.websiteContent.find(
                      (c: any) => c.url === "#brand-tone"
                    )?.name
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Supported Languages
                </Label>
                <ReadOnlyField
                  value={
                    contextData.onSite.websiteContent.find(
                      (c: any) => c.url === "#brand-languages"
                    )?.name
                  }
                />
              </div>
            </div>
          </div>

          {/* Key Website Pages */}
          <div className="p-5 border rounded-xl bg-card/50 space-y-5">
            <SectionHeader 
              icon={Layout} 
              title="Key Website Pages" 
              label="Key Pages" 
              onEdit={openEditDialog}
            />

            {/* Row 1: Core Pages */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">
                Core Pages
              </Label>
              <div className="space-y-2">
                {(() => {
                  const corePages = contextData.onSite.websiteContent.filter(
                    (c: any) => ["home", "about", "contact", "career"].includes(c.type)
                  );
                  if (corePages.length === 0) {
                    return (
                      <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                        No core pages
                      </div>
                    );
                  }
                  return corePages.map((page: any) => (
                    <div key={page.id} className="p-3 border rounded-lg bg-muted/30">
                      <div className="font-medium text-sm">
                        {page.name || "Untitled"}
                      </div>
                      {page.url && (
                        <div className="text-xs text-blue-600 mt-1">{page.url}</div>
                      )}
                      {page.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {page.description}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Row 2: Product Pages */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">
                Product Pages
              </Label>
              <div className="space-y-2">
                {(() => {
                  const productPages = contextData.onSite.websiteContent.filter(
                    (c: any) => c.type === "product"
                  );
                  if (productPages.length === 0) {
                    return (
                      <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                        No product pages
                      </div>
                    );
                  }
                  return productPages.map((page: any) => (
                    <div key={page.id} className="p-3 border rounded-lg bg-muted/30">
                      <div className="font-medium text-sm">
                        {page.name || "Untitled"}
                      </div>
                      {page.url && (
                        <div className="text-xs text-blue-600 mt-1">{page.url}</div>
                      )}
                      {page.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {page.description}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Row 3: Resources */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">
                Resources
              </Label>
              <div className="space-y-2">
                {(() => {
                  const resourcePages = contextData.onSite.websiteContent.filter(
                    (c: any) => ["documentation", "faq", "case_study"].includes(c.type)
                  );
                  if (resourcePages.length === 0) {
                    return (
                      <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                        No resource pages
                      </div>
                    );
                  }
                  return resourcePages.map((page: any) => (
                    <div key={page.id} className="p-3 border rounded-lg bg-muted/30">
                      <div className="font-medium text-sm">
                        {page.name || "Untitled"}
                      </div>
                      {page.url && (
                        <div className="text-xs text-blue-600 mt-1">{page.url}</div>
                      )}
                      {page.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {page.description}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Row 4: Legal & Updates */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">
                Legal & Updates
              </Label>
              <div className="space-y-2">
                {(() => {
                  const legalPages = contextData.onSite.websiteContent.filter(
                    (c: any) => c.type === "legal"
                  );
                  if (legalPages.length === 0) {
                    return (
                      <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                        No legal pages
                      </div>
                    );
                  }
                  return legalPages.map((page: any) => (
                    <div key={page.id} className="p-3 border rounded-lg bg-muted/30">
                      <div className="font-medium text-sm">
                        {page.name || "Untitled"}
                      </div>
                      {page.url && (
                        <div className="text-xs text-blue-600 mt-1">{page.url}</div>
                      )}
                      {page.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {page.description}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Landing Pages */}
          <div className="p-4 border rounded-lg bg-card/50 space-y-3">
            <SubSectionHeader
              icon={Megaphone}
              title="Landing Pages"
              label="Landing Pages"
              count={contextData.onSite.landingPages?.length || 0}
              onEdit={openEditDialog}
            />
            <div className="space-y-2">
              {contextData.onSite.landingPages.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                  No landing pages
                </div>
              ) : (
                contextData.onSite.landingPages.map((page: any) => (
                  <div key={page.id} className="p-3 border rounded-lg bg-muted/30">
                    <div className="font-medium text-sm">
                      {page.name || "Untitled"}
                    </div>
                    {page.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {page.description}
                      </div>
                    )}
                    {page.url && (
                      <div className="text-xs text-blue-600 mt-1">{page.url}</div>
                    )}
                    {page.type && page.type !== "other" && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Type: {page.type}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Blog & Resources */}
          <div className="p-4 border rounded-lg bg-card/50 space-y-3">
            <SubSectionHeader
              icon={BookOpen}
              title="Blog & Resources"
              label="Blog Posts"
              count={contextData.onSite.blogPosts?.length || 0}
              onEdit={openEditDialog}
            />
            <div className="space-y-1.5">
              {contextData.onSite.blogPosts.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                  No blog posts
                </div>
              ) : (
                contextData.onSite.blogPosts.map((post: any) => (
                  <ReadOnlyField
                    key={post.id}
                    value={post.url}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - 2/3 Width: One-Page Website Content */}
        <div className="flex-1 space-y-4">
          {/* Hero Section */}
          <div className="p-4 border rounded-lg bg-card/50 space-y-3">
            <SubSectionHeader 
              icon={Flag} 
              title="Hero Section" 
              label="Hero Section"
              onEdit={openEditDialog}
            />
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-3">
                <div>
                  <EditableSectionLabel
                    label="Headline / Value Proposition"
                    onEdit={openEditDialog}
                    editLabel="Headline"
                  />
                  <ReadOnlyField
                    value={contextData.onSite.brandInfo.uniqueSellingPoints?.[0]}
                  />
                </div>
                <div>
                  <EditableSectionLabel
                    label="Subheadline"
                    onEdit={openEditDialog}
                    editLabel="Subheadline"
                  />
                  <ReadOnlyField
                    value={contextData.onSite.brandInfo.tagline}
                  />
                </div>
                {/* CTA Buttons */}
                <div className="space-y-2">
                  <EditableSectionLabel
                    label="Call to Action (CTA)"
                    count={(contextData.onSite.websiteContent || []).filter(
                      (c: any) => c.url === "#cta"
                    ).length}
                    onEdit={openEditDialog}
                    editLabel="Call to Action"
                  />
                  <div className="space-y-1.5">
                    {(contextData.onSite.websiteContent || []).filter(
                      (c: any) => c.url === "#cta"
                    ).length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                        No CTAs
                      </div>
                    ) : (
                      (contextData.onSite.websiteContent || [])
                        .filter((c: any) => c.url === "#cta")
                        .map((item: any) => (
                          <div key={item.id} className="flex gap-1">
                            <ReadOnlyField
                              value={item.name}
                              className="w-1/3"
                            />
                            <ReadOnlyField
                              value={item.description}
                              className="flex-1"
                            />
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {/* Feature Image/Video */}
                <div className="space-y-2">
                  <EditableSectionLabel
                    label="Feature Images / Videos"
                    count={(contextData.onSite.websiteContent || []).filter(
                      (c: any) => c.url === "#hero-media"
                    ).length}
                    onEdit={openEditDialog}
                    editLabel="Media"
                  />
                  <div className="space-y-1.5">
                    {(contextData.onSite.websiteContent || []).filter(
                      (c: any) => c.url === "#hero-media"
                    ).length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                        No media
                      </div>
                    ) : (
                      (contextData.onSite.websiteContent || [])
                        .filter((c: any) => c.url === "#hero-media")
                        .map((item: any) => (
                          <ReadOnlyField
                            key={item.id}
                            value={item.name}
                          />
                        ))
                    )}
                  </div>
                </div>
                {/* Key Metrics */}
                <div className="space-y-2">
                  <EditableSectionLabel
                    label="Key Metrics / Social Proof"
                    count={(contextData.onSite.websiteContent || []).filter(
                      (c: any) => c.url === "#metric"
                    ).length}
                    onEdit={openEditDialog}
                    editLabel="Metrics"
                  />
                  <div className="space-y-1.5">
                    {(contextData.onSite.websiteContent || []).filter(
                      (c: any) => c.url === "#metric"
                    ).length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                        No metrics
                      </div>
                    ) : (
                      (contextData.onSite.websiteContent || [])
                        .filter((c: any) => c.url === "#metric")
                        .map((item: any) => (
                          <ReadOnlyField
                            key={item.id}
                            value={item.name}
                          />
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Problem & Target */}
          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 border rounded-lg bg-card/50 space-y-3">
              <SubSectionHeader
                icon={AlertTriangle}
                title="Problem Statement"
                label="Problem Statement"
                count={
                  (contextData.onSite.websiteContent || []).filter(
                    (c: any) => c.url === "#problem"
                  ).length
                }
                onEdit={openEditDialog}
              />
              <div className="space-y-1.5">
                {(contextData.onSite.websiteContent || []).filter(
                  (c: any) => c.url === "#problem"
                ).length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                    No pain points
                  </div>
                ) : (
                  (contextData.onSite.websiteContent || [])
                    .filter((c: any) => c.url === "#problem")
                    .map((item: any) => (
                      <ReadOnlyField
                        key={item.id}
                        value={item.name}
                      />
                    ))
                )}
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-card/50 space-y-3">
              <SubSectionHeader
                icon={Users}
                title="Who We Serve"
                label="Who We Serve"
                count={
                  (contextData.onSite.websiteContent || []).filter(
                    (c: any) => c.url === "#audience"
                  ).length
                }
                onEdit={openEditDialog}
              />
              <div className="space-y-1.5">
                {(contextData.onSite.websiteContent || []).filter(
                  (c: any) => c.url === "#audience"
                ).length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                    No target audiences
                  </div>
                ) : (
                  (contextData.onSite.websiteContent || [])
                    .filter((c: any) => c.url === "#audience")
                    .map((item: any) => (
                      <ReadOnlyField
                        key={item.id}
                        value={item.name}
                      />
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Use Cases / Industries */}
          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 border rounded-lg bg-card/50 space-y-3">
              <SubSectionHeader
                icon={Zap}
                title="Use Cases"
                label="Use Cases"
                count={
                  (contextData.onSite.websiteContent || []).filter(
                    (c: any) => c.url === "#use-case"
                  ).length
                }
                onEdit={openEditDialog}
              />
              <div className="space-y-1.5">
                {(contextData.onSite.websiteContent || []).filter(
                  (c: any) => c.url === "#use-case"
                ).length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                    No use cases
                  </div>
                ) : (
                  (contextData.onSite.websiteContent || [])
                    .filter((c: any) => c.url === "#use-case")
                    .map((item: any) => (
                      <ReadOnlyField
                        key={item.id}
                        value={item.name}
                      />
                    ))
                )}
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-card/50 space-y-3">
              <SubSectionHeader
                icon={Building2}
                title="Industries"
                label="Industries"
                count={
                  (contextData.onSite.websiteContent || []).filter(
                    (c: any) => c.url === "#industry"
                  ).length
                }
                onEdit={openEditDialog}
              />
              <div className="space-y-1.5">
                {(contextData.onSite.websiteContent || []).filter(
                  (c: any) => c.url === "#industry"
                ).length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                    No industries
                  </div>
                ) : (
                  (contextData.onSite.websiteContent || [])
                    .filter((c: any) => c.url === "#industry")
                    .map((item: any) => (
                      <ReadOnlyField
                        key={item.id}
                        value={item.name}
                      />
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Products & Services */}
          <div className="p-4 border rounded-lg bg-card/50">
            <SubSectionHeader
              icon={ShoppingBag}
              title="Products & Services"
              label="Products & Services"
              count={contextData.onSite.productsServices?.length || 0}
              onEdit={openEditDialog}
            />
            <div className="mt-3 space-y-2">
              {contextData.onSite.productsServices.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                  No products or services
                </div>
              ) : (
                contextData.onSite.productsServices.map((item: any) => (
                  <div key={item.id} className="p-3 border rounded-lg bg-muted/30">
                    <div className="font-medium text-sm">
                      {item.name || "Untitled"}
                    </div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.description}
                      </div>
                    )}
                    {item.url && (
                      <div className="text-xs text-blue-600 mt-1">{item.url}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Social Proof & Trust */}
          <div className="p-4 border rounded-lg bg-card/50 space-y-4">
            <SubSectionHeader 
              icon={Star} 
              title="Social Proof & Trust" 
              label="Social Proof & Trust"
              onEdit={openEditDialog}
            />
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Testimonials
                  {(contextData.onSite.websiteContent || []).filter(
                    (c: any) => c.type === "testimonial"
                  ).length > 0 && (
                    <span>
                      {" "}
                      (
                      {
                        (contextData.onSite.websiteContent || []).filter(
                          (c: any) => c.type === "testimonial"
                        ).length
                      }
                      )
                    </span>
                  )}
                </Label>
                <div className="space-y-1.5">
                  {(contextData.onSite.websiteContent || []).filter(
                    (c: any) => c.type === "testimonial"
                  ).length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                      No testimonials
                    </div>
                  ) : (
                    (contextData.onSite.websiteContent || [])
                      .filter((c: any) => c.type === "testimonial")
                      .map((item: any) => (
                        <ReadOnlyField
                          key={item.id}
                          value={item.name}
                        />
                      ))
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Case Studies
                  {(contextData.onSite.websiteContent || []).filter(
                    (c: any) => c.type === "case_study"
                  ).length > 0 && (
                    <span>
                      {" "}
                      (
                      {
                        (contextData.onSite.websiteContent || []).filter(
                          (c: any) => c.type === "case_study"
                        ).length
                      }
                      )
                    </span>
                  )}
                </Label>
                <div className="space-y-1.5">
                  {(contextData.onSite.websiteContent || []).filter(
                    (c: any) => c.type === "case_study"
                  ).length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                      No case studies
                    </div>
                  ) : (
                    (contextData.onSite.websiteContent || [])
                      .filter((c: any) => c.type === "case_study")
                      .map((item: any) => (
                        <ReadOnlyField
                          key={item.id}
                          value={item.url || item.name || ""}
                        />
                      ))
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Trust Badges (Awards / Certs / Guarantees / Integrations)
                  {(contextData.onSite.websiteContent || []).filter(
                    (c: any) => c.url === "#trust-badge"
                  ).length > 0 && (
                    <span>
                      {" "}
                      (
                      {
                        (contextData.onSite.websiteContent || []).filter(
                          (c: any) => c.url === "#trust-badge"
                        ).length
                      }
                      )
                    </span>
                  )}
                </Label>
                <div className="space-y-1.5">
                  {(contextData.onSite.websiteContent || []).filter(
                    (c: any) => c.url === "#trust-badge"
                  ).length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                      No trust badges
                    </div>
                  ) : (
                    (contextData.onSite.websiteContent || [])
                      .filter((c: any) => c.url === "#trust-badge")
                      .map((item: any) => (
                        <ReadOnlyField
                          key={item.id}
                          value={item.name}
                        />
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Leadership Team */}
          <div className="p-4 border rounded-lg bg-card/50 space-y-3">
            <SubSectionHeader
              icon={UserCircle}
              title="Leadership Team"
              label="Leadership Team"
              count={contextData.onSite.team?.length || 0}
              onEdit={openEditDialog}
            />
            <div className="space-y-2">
              {contextData.onSite.team.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                  No team members
                </div>
              ) : (
                contextData.onSite.team.map((member: any) => (
                  <div key={member.id} className="p-3 border rounded-lg bg-muted/30">
                    <div className="font-medium text-sm">{member.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {member.role}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* About Us */}
          <div className="p-4 border rounded-lg bg-card/50 space-y-3">
            <SubSectionHeader 
              icon={Info} 
              title="About Us" 
              label="About Us"
              onEdit={openEditDialog}
            />
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Mission
                </Label>
                <ReadOnlyField
                  value={contextData.onSite.brandInfo.mission}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Vision
                </Label>
                <ReadOnlyField
                  value={contextData.onSite.brandInfo.vision}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Story
                </Label>
                <ReadOnlyField
                  value={(contextData.onSite.brandInfo as any).story}
                />
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="p-4 border rounded-lg bg-card/50 space-y-3">
            <SubSectionHeader
              icon={HelpCircle}
              title="FAQ"
              label="FAQ"
              count={
                (contextData.onSite.websiteContent || []).filter(
                  (c: any) => c.type === "faq"
                ).length
              }
              onEdit={openEditDialog}
            />
            <div className="space-y-2">
              {(contextData.onSite.websiteContent || []).filter(
                (c: any) => c.type === "faq"
              ).length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
                  No FAQs
                </div>
              ) : (
                (contextData.onSite.websiteContent || [])
                  .filter((c: any) => c.type === "faq")
                  .map((item: any) => (
                    <div key={item.id} className="p-3 border rounded-lg bg-muted/30 space-y-1">
                      {item.name && (
                        <div className="text-sm font-medium text-foreground">
                          Q: {item.name}
                        </div>
                      )}
                      {item.description && (
                        <div className="text-xs text-muted-foreground">
                          A: {item.description}
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="p-4 border rounded-lg bg-card/50 space-y-3">
            <SubSectionHeader 
              icon={MessageSquare} 
              title="Contact Information" 
              label="Contact Info"
              onEdit={openEditDialog}
            />
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Email
                </Label>
                <ReadOnlyField
                  value={
                    contextData.onSite.websiteContent.find(
                      (c: any) => c.url === "#contact-email"
                    )?.name
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Phone
                </Label>
                <ReadOnlyField
                  value={
                    contextData.onSite.websiteContent.find(
                      (c: any) => c.url === "#contact-phone"
                    )?.name
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Address
                </Label>
                <ReadOnlyField
                  value={
                    contextData.onSite.websiteContent.find(
                      (c: any) => c.url === "#contact-address"
                    )?.name
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}

