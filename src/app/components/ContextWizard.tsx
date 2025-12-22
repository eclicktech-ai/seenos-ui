"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContextMenu } from "@/providers/ContextProvider";
import { Plus, X, Link2, ShoppingBag, Layout, Users, Megaphone, MessageSquare, Target, Globe, FileText, Rss, Map, Palette, BookOpen, Flag, AlertTriangle, Zap, Building2, Star, UserCircle, Info, HelpCircle, Newspaper, Network, Save, Cloud, Upload, Edit, Loader2 } from "lucide-react";
import { ContextEditDialog } from "@/app/components/ContextEditDialog";
import { getSectionConfig, type SectionConfig } from "@/lib/context/section-mapping";
import { v4 as uuidv4 } from 'uuid';
import {
  LandingPage,
  ProductService,
  PricingPlan,
  TeamMember,
  WebsiteContent,
  OfficialAccount,
  Partnership,
  CustomerReview,
  Competitor,
  AudiencePersona,
  MarketIntelligence,
  BlogPost,
  PressRelease,
  SocialMediaContent,
  UserUpload,
  CommunityForum,
  QAPlatform,
  MediaSource,
  ReviewPlatform,
  EcommercePlatform,
  InfluencerAccount,
  ProfessionalNetwork,
  DirectoryListing,
  ExecutiveAccount,
  BacklinkSource,
  ExternalEvent,
} from "@/app/types/context";

interface ContextWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "onSite" | "offSite" | "knowledge";
}

export function ContextWizard({ open, onOpenChange, defaultTab = "onSite" }: ContextWizardProps) {
  const { contextData, updateOnSite, updateOffSite, updateKnowledge, reloadContextData } = useContextMenu();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogConfig, setEditDialogConfig] = useState<SectionConfig | null>(null);

  // Helper function to open ContextEditDialog
  const openEditDialog = (label: string) => {
    const config = getSectionConfig(label);
    if (config) {
      setEditDialogConfig(config);
      setEditDialogOpen(true);
    }
  };

  // Load data when wizard opens (only once per open)
  const [isLoadingData, setIsLoadingData] = React.useState(false);
  const lastOpenStateRef = React.useRef(false);
  
  // Check if we have any data to avoid showing loading screen unnecessarily
  const hasExistingData = React.useMemo(() => {
    return (
      contextData.onSite.productsServices.length > 0 ||
      contextData.onSite.landingPages.length > 0 ||
      contextData.onSite.blogPosts.length > 0 ||
      contextData.offSite.socialAccounts.length > 0 ||
      contextData.offSite.pressReleases.length > 0
    );
  }, [contextData]);
  
  React.useEffect(() => {
    if (open && !lastOpenStateRef.current) {
      lastOpenStateRef.current = true;
      // Only show loading indicator if we don't have existing data
      if (!hasExistingData) {
        setIsLoadingData(true);
      }
      // Refresh context data when wizard opens to ensure latest data is shown
      reloadContextData().then(() => {
        setIsLoadingData(false);
      }).catch(error => {
        console.error("[ContextWizard] Failed to reload context data:", error);
        setIsLoadingData(false);
      });
    } else if (!open) {
      lastOpenStateRef.current = false;
      setIsLoadingData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Only depend on open state

  // --- Helper Components ---

  // Unified Simple Array Input - for simple string lists
  const SimpleArrayInput = ({
    label,
    values,
    onChange,
    placeholder,
    icon: Icon,
    maxHeight = "none"
  }: {
    label: string,
    values: string[],
    onChange: (values: string[]) => void,
    placeholder?: string,
    icon?: any,
    maxHeight?: string
  }) => {
    const add = () => onChange([...values, ""]);
    const remove = (idx: number) => onChange(values.filter((_, i) => i !== idx));
    const update = (idx: number, val: string) => {
      const newValues = [...values];
      newValues[idx] = val;
      onChange(newValues);
    };

    return (
      <div className="space-y-3">
        {label && (
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">{label}</Label>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={add}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="space-y-2.5" style={maxHeight === "none" ? {} : { maxHeight, overflowY: "auto" }}>
          {values.length === 0 ? (
            <div
              className="text-sm text-muted-foreground text-center py-3 border border-dashed rounded-md cursor-pointer hover:bg-accent/50"
              onClick={add}
            >
              Click + to add{label ? ` ${label.toLowerCase()}` : ''}
            </div>
          ) : (
            values.map((val, idx) => (
              <div key={idx} className="flex gap-2 group">
                <div className="relative flex-1">
                  {Icon && <Icon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />}
                  <Input
                    className={`h-9 text-sm ${Icon ? 'pl-8' : ''}`}
                    value={val}
                    onChange={(e) => update(idx, e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => remove(idx)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Unified Complex List Input - for objects with multiple fields
  const ComplexListInput = <T extends { id: string, [key: string]: any }>({
    label,
    items,
    renderItem,
    onAdd,
    onRemove,
    onChange,
    maxHeight = "none"
  }: {
    label: string;
    items: T[];
    renderItem: (item: T, onChange: (updated: T) => void) => React.ReactNode;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onChange: (updatedItems: T[]) => void;
    maxHeight?: string;
  }) => {
    return (
      <div className="space-y-3">
        {label && (
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">{label}</Label>
            <div className="flex items-center gap-2">
              {items.length > 0 && <span className="text-sm text-muted-foreground/60">{items.length}</span>}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAdd}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-3" style={maxHeight === "none" ? {} : { maxHeight, overflowY: "auto" }}>
          {
            items.length === 0 ? (
              <div
                className="text-sm text-muted-foreground text-center py-3 border border-dashed rounded-md cursor-pointer hover:bg-accent/50"
                onClick={onAdd}
              >
                Click + to add{label ? ` ${label.toLowerCase()}` : ''}
              </div>
            ) : (
              items.map((item, idx) => (
                <div key={item.id} className="relative group rounded-xl border bg-card/50 p-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemove(item.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  {renderItem(item, (updated) => {
                    const newItems = [...items];
                    newItems[idx] = updated;
                    onChange(newItems);
                  })}
                </div>
              ))
            )
          }
        </div >
      </div >
    );
  };

  // --- Render Functions for Complex Types ---

  const renderProductService = (item: ProductService, onChange: (i: ProductService) => void) => {
    const addFeature = () => onChange({ ...item, features: [...(item.features || []), ""] });
    const removeFeature = (idx: number) => onChange({ ...item, features: (item.features || []).filter((_, i) => i !== idx) });
    const updateFeature = (idx: number, val: string) => {
      const newFeatures = [...(item.features || [])];
      newFeatures[idx] = val;
      onChange({ ...item, features: newFeatures });
    };

    const addBenefit = () => onChange({ ...item, benefits: [...(item.benefits || []), ""] });
    const removeBenefit = (idx: number) => onChange({ ...item, benefits: (item.benefits || []).filter((_, i) => i !== idx) });
    const updateBenefit = (idx: number, val: string) => {
      const newBenefits = [...(item.benefits || [])];
      newBenefits[idx] = val;
      onChange({ ...item, benefits: newBenefits });
    };

    const addStep = () => onChange({ ...item, howItWorks: [...(item.howItWorks || []), ""] });
    const removeStep = (idx: number) => onChange({ ...item, howItWorks: (item.howItWorks || []).filter((_, i) => i !== idx) });
    const updateStep = (idx: number, val: string) => {
      const newSteps = [...(item.howItWorks || [])];
      newSteps[idx] = val;
      onChange({ ...item, howItWorks: newSteps });
    };

    const addPlan = () => onChange({ ...item, pricingPlans: [...(item.pricingPlans || []), { name: "", price: "" }] });
    const removePlan = (idx: number) => onChange({ ...item, pricingPlans: (item.pricingPlans || []).filter((_, i) => i !== idx) });
    const updatePlan = (idx: number, field: keyof PricingPlan, val: string) => {
      const newPlans = [...(item.pricingPlans || [])];
      newPlans[idx] = { ...newPlans[idx], [field]: val };
      onChange({ ...item, pricingPlans: newPlans });
    };

    return (
      <div className="space-y-3">
        {/* Basic Info */}
        <div className="flex gap-2">
          <Input
            placeholder="Product/Service Name"
            value={item.name}
            onChange={(e) => onChange({ ...item, name: e.target.value })}
            className="font-medium text-sm flex-1"
          />
          <Input
            placeholder="URL"
            value={item.url || ""}
            onChange={(e) => onChange({ ...item, url: e.target.value })}
            className="text-xs h-9 flex-1"
          />
        </div>

        <Textarea
          placeholder="Description..."
          value={item.description || ""}
          onChange={(e) => onChange({ ...item, description: e.target.value })}
          className="text-xs min-h-[50px]"
        />

        {/* Sub-sections in a grid */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t">
          {/* Features */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Features <span className="text-muted-foreground/60">({(item.features || []).length})</span></span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={addFeature}><Plus className="h-3 w-3" /></Button>
            </div>
            <div className="space-y-1">
              {(item.features || []).length === 0 ? (
                <div className="text-xs text-muted-foreground/60 text-center py-1 border border-dashed rounded cursor-pointer hover:bg-accent/30" onClick={addFeature}>+</div>
              ) : (item.features || []).map((f, idx) => (
                <div key={idx} className="flex gap-1 group">
                  <Input value={f} onChange={(e) => updateFeature(idx, e.target.value)} placeholder="Feature..." className="text-xs h-8 px-2" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => removeFeature(idx)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Benefits <span className="text-muted-foreground/60">({(item.benefits || []).length})</span></span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={addBenefit}><Plus className="h-3 w-3" /></Button>
            </div>
            <div className="space-y-1">
              {(item.benefits || []).length === 0 ? (
                <div className="text-xs text-muted-foreground/60 text-center py-1 border border-dashed rounded cursor-pointer hover:bg-accent/30" onClick={addBenefit}>+</div>
              ) : (item.benefits || []).map((b, idx) => (
                <div key={idx} className="flex gap-1 group">
                  <Input value={b} onChange={(e) => updateBenefit(idx, e.target.value)} placeholder="Benefit..." className="text-xs h-8 px-2" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => removeBenefit(idx)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">How It Works <span className="text-muted-foreground/60">({(item.howItWorks || []).length})</span></span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={addStep}><Plus className="h-3 w-3" /></Button>
            </div>
            <div className="space-y-1">
              {(item.howItWorks || []).length === 0 ? (
                <div className="text-xs text-muted-foreground/60 text-center py-1 border border-dashed rounded cursor-pointer hover:bg-accent/30" onClick={addStep}>+</div>
              ) : (item.howItWorks || []).map((s, idx) => (
                <div key={idx} className="flex gap-1 group">
                  <Input value={s} onChange={(e) => updateStep(idx, e.target.value)} placeholder={`Step ${idx + 1}...`} className="text-xs h-8 px-2" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => removeStep(idx)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Plans */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Pricing <span className="text-muted-foreground/60">({(item.pricingPlans || []).length})</span></span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={addPlan}><Plus className="h-3 w-3" /></Button>
            </div>
            <div className="space-y-1">
              {(item.pricingPlans || []).length === 0 ? (
                <div className="text-xs text-muted-foreground/60 text-center py-1 border border-dashed rounded cursor-pointer hover:bg-accent/30" onClick={addPlan}>+</div>
              ) : (item.pricingPlans || []).map((plan, idx) => (
                <div key={idx} className="flex gap-1 group">
                  <Input value={plan.name} onChange={(e) => updatePlan(idx, "name", e.target.value)} placeholder="Plan..." className="text-xs h-8 px-1 w-1/2" />
                  <Input value={plan.price} onChange={(e) => updatePlan(idx, "price", e.target.value)} placeholder="$0/mo" className="text-xs h-8 px-1 w-1/2" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => removePlan(idx)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const _renderLandingPage = (item: LandingPage, onChange: (i: LandingPage) => void) => (
    <div className="grid gap-3">
      <Input
        placeholder="Page Name (e.g. Summer Campaign)"
        value={item.name}
        onChange={(e) => onChange({ ...item, name: e.target.value })}
        className="font-medium"
      />
      <div className="flex gap-2">
        <Input
          placeholder="https://..."
          value={item.url}
          onChange={(e) => onChange({ ...item, url: e.target.value })}
          className="flex-1 text-xs"
        />
        <select
          className="h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
          value={item.type}
          onChange={(e) => onChange({ ...item, type: e.target.value as any })}
        >
          <option value="product">Product</option>
          <option value="campaign">Campaign</option>
          <option value="event">Event</option>
          <option value="other">Other</option>
        </select>
      </div>
    </div>
  );

  const _renderWebsiteContent = (item: WebsiteContent, onChange: (i: WebsiteContent) => void) => (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <select
          className="h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
          value={item.type}
          onChange={(e) => onChange({ ...item, type: e.target.value as any })}
        >
          <option value="home">Home</option>
          <option value="about">About</option>
          <option value="pricing">Pricing</option>
          <option value="faq">FAQ</option>
          <option value="other">Other</option>
        </select>
        <Input
          placeholder="Page Name"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          className="flex-1"
        />
      </div>
      <Input
        placeholder="https://..."
        value={item.url}
        onChange={(e) => onChange({ ...item, url: e.target.value })}
        className="text-xs"
      />
    </div>
  );

  const renderTeamMember = (item: TeamMember, onChange: (i: TeamMember) => void) => (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <Input
          placeholder="Name"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          className="font-medium flex-1"
        />
        <Input
          placeholder="Role"
          value={item.role}
          onChange={(e) => onChange({ ...item, role: e.target.value })}
          className="flex-1"
        />
      </div>
      <Input
        placeholder="LinkedIn URL"
        value={item.linkedin || ""}
        onChange={(e) => onChange({ ...item, linkedin: e.target.value })}
        className="text-xs"
      />
    </div>
  );

  const _renderOfficialAccount = (item: OfficialAccount, onChange: (i: OfficialAccount) => void) => (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <select
          className="h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
          value={item.platform}
          onChange={(e) => onChange({ ...item, platform: e.target.value as any })}
        >
          <option value="twitter">Twitter</option>
          <option value="linkedin">LinkedIn</option>
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
          <option value="tiktok">TikTok</option>
          <option value="wechat">WeChat</option>
          <option value="other">Other</option>
        </select>
        <Input
          placeholder="Account Name / Handle"
          value={item.accountName}
          onChange={(e) => onChange({ ...item, accountName: e.target.value })}
          className="flex-1"
        />
      </div>
      <Input
        placeholder="Profile URL"
        value={item.url}
        onChange={(e) => onChange({ ...item, url: e.target.value })}
        className="text-xs"
      />
    </div>
  );

  const _renderPartnership = (item: Partnership, onChange: (i: Partnership) => void) => (
    <div className="grid gap-3">
      <Input
        placeholder="Partner Name"
        value={item.name}
        onChange={(e) => onChange({ ...item, name: e.target.value })}
        className="font-medium"
      />
      <div className="flex gap-2">
        <select
          className="h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
          value={item.type}
          onChange={(e) => onChange({ ...item, type: e.target.value as any })}
        >
          <option value="distributor">Distributor</option>
          <option value="technology">Tech Partner</option>
          <option value="media_partner">Media</option>
          <option value="affiliate">Affiliate</option>
          <option value="other">Other</option>
        </select>
        <select
          className="h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
          value={item.status}
          onChange={(e) => onChange({ ...item, status: e.target.value as any })}
        >
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </div>
  );

  const _renderCustomerReview = (item: CustomerReview, onChange: (i: CustomerReview) => void) => (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <Input
          placeholder="Review Source (e.g. G2)"
          value={item.source}
          onChange={(e) => onChange({ ...item, source: e.target.value })}
          className="flex-1"
        />
        <Input
          placeholder="Rating (1-5)"
          type="number"
          value={item.rating || ""}
          onChange={(e) => onChange({ ...item, rating: parseFloat(e.target.value) })}
          className="w-24"
        />
      </div>
      <Textarea
        placeholder="Review content..."
        value={item.content}
        onChange={(e) => onChange({ ...item, content: e.target.value })}
        className="text-xs min-h-[60px]"
      />
    </div>
  );

  const _renderCompetitor = (item: Competitor, onChange: (i: Competitor) => void) => (
    <div className="grid gap-3">
      <Input
        placeholder="Competitor Name"
        value={item.name}
        onChange={(e) => onChange({ ...item, name: e.target.value })}
        className="font-medium"
      />
      <div className="flex gap-2">
        <Input
          placeholder="Website URL"
          value={item.website}
          onChange={(e) => onChange({ ...item, website: e.target.value })}
          className="flex-1 text-xs"
        />
        <select
          className="h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
          value={item.category}
          onChange={(e) => onChange({ ...item, category: e.target.value as any })}
        >
          <option value="direct">Direct</option>
          <option value="indirect">Indirect</option>
          <option value="potential">Potential</option>
        </select>
      </div>
      <Textarea
        placeholder="Strengths, weaknesses, or notes..."
        value={item.description || ""}
        onChange={(e) => onChange({ ...item, description: e.target.value })}
        className="text-xs min-h-[60px]"
      />
    </div>
  );

  const _renderPersona = (item: AudiencePersona, onChange: (i: AudiencePersona) => void) => (
    <div className="grid gap-3">
      <Input
        placeholder="Persona Name (e.g. Tech-Savvy Tina)"
        value={item.name}
        onChange={(e) => onChange({ ...item, name: e.target.value })}
        className="font-medium"
      />
      <Textarea
        placeholder="Description and key traits..."
        value={item.description}
        onChange={(e) => onChange({ ...item, description: e.target.value })}
        className="text-xs min-h-[60px]"
      />
      <Input
        placeholder="Key demographics..."
        value={item.demographics || ""}
        onChange={(e) => onChange({ ...item, demographics: e.target.value })}
        className="text-xs"
      />
    </div>
  );

  const _renderMarketIntel = (item: MarketIntelligence, onChange: (i: MarketIntelligence) => void) => (
    <div className="grid gap-3">
      <Input
        placeholder="Report Title / Trend"
        value={item.title}
        onChange={(e) => onChange({ ...item, title: e.target.value })}
        className="font-medium"
      />
      <div className="flex gap-2">
        <select
          className="h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
          value={item.type}
          onChange={(e) => onChange({ ...item, type: e.target.value as any })}
        >
          <option value="industry_report">Report</option>
          <option value="market_trend">Trend</option>
          <option value="news">News</option>
          <option value="statistics">Stats</option>
          <option value="regulation">Regulation</option>
        </select>
        <Input
          placeholder="Source"
          value={item.source}
          onChange={(e) => onChange({ ...item, source: e.target.value })}
          className="flex-1 text-xs"
        />
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="URL"
          value={item.url || ""}
          onChange={(e) => onChange({ ...item, url: e.target.value })}
          className="text-xs flex-1"
        />
        <Input
          placeholder="Year/Date"
          value={item.year || ""}
          onChange={(e) => onChange({ ...item, year: e.target.value })}
          className="text-xs w-24"
        />
      </div>
      <Textarea
        placeholder="Key takeaways or summary..."
        value={item.summary || ""}
        onChange={(e) => onChange({ ...item, summary: e.target.value })}
        className="text-xs min-h-[50px]"
      />
    </div>
  );

  const _renderPressRelease = (item: PressRelease, onChange: (i: PressRelease) => void) => (
    <div className="grid gap-3">
      <Input
        placeholder="Title / Headline"
        value={item.title}
        onChange={(e) => onChange({ ...item, title: e.target.value })}
        className="font-medium"
      />
      <div className="flex gap-2">
        <select
          className="h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
          value={item.type}
          onChange={(e) => onChange({ ...item, type: e.target.value as any })}
        >
          <option value="press_release">Press Release</option>
          <option value="media_coverage">Media Coverage</option>
          <option value="interview">Interview</option>
          <option value="news_mention">Mention</option>
        </select>
        <Input
          placeholder="Source (e.g. TechCrunch)"
          value={item.source}
          onChange={(e) => onChange({ ...item, source: e.target.value })}
          className="flex-1 text-xs"
        />
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="URL"
          value={item.url}
          onChange={(e) => onChange({ ...item, url: e.target.value })}
          className="flex-1 text-xs"
        />
        <Input
          type="date"
          value={item.publishDate ? item.publishDate.split('T')[0] : ""}
          onChange={(e) => onChange({ ...item, publishDate: e.target.value })}
          className="w-32 text-xs"
        />
      </div>
      <Textarea
        placeholder="Summary or key sentiment..."
        value={item.summary || ""}
        onChange={(e) => onChange({ ...item, summary: e.target.value })}
        className="text-xs min-h-[40px]"
      />
    </div>
  );

  const _renderSocialMediaContent = (item: SocialMediaContent, onChange: (i: SocialMediaContent) => void) => (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <select
          className="h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
          value={item.platform}
          onChange={(e) => onChange({ ...item, platform: e.target.value })}
        >
          <option value="instagram">Instagram</option>
          <option value="twitter">Twitter</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="linkedin">LinkedIn</option>
          <option value="other">Other</option>
        </select>
        <Input
          placeholder="Creator / Account"
          value={item.creatorName}
          onChange={(e) => onChange({ ...item, creatorName: e.target.value })}
          className="flex-1 font-medium text-xs"
        />
      </div>
      <div className="flex gap-2">
        <select
          className="h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
          value={item.type}
          onChange={(e) => onChange({ ...item, type: e.target.value as any })}
        >
          <option value="ugc">UGC</option>
          <option value="kol">KOL (Influencer)</option>
          <option value="koc">KOC</option>
          <option value="paid_partnership">Paid Ad</option>
        </select>
        <Input
          placeholder="Content URL"
          value={item.contentUrl}
          onChange={(e) => onChange({ ...item, contentUrl: e.target.value })}
          className="flex-1 text-xs"
        />
      </div>
      <Textarea
        placeholder="Notes or description..."
        value={item.description || ""}
        onChange={(e) => onChange({ ...item, description: e.target.value })}
        className="text-xs min-h-[40px]"
      />
    </div>
  );

  const _renderUserUpload = (item: UserUpload, onChange: (i: UserUpload) => void) => (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <Input
          placeholder="File Name / Link Title"
          value={item.fileName}
          onChange={(e) => onChange({ ...item, fileName: e.target.value })}
          className="flex-1 font-medium text-sm"
        />
        <select
          className="h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
          value={item.category}
          onChange={(e) => onChange({ ...item, category: e.target.value as any })}
        >
          <option value="internal_doc">Internal Doc</option>
          <option value="brand_guideline">Brand Guide</option>
          <option value="market_research">Market Research</option>
          <option value="user_research">User Research</option>
          <option value="competitor_analysis">Competitor</option>
          <option value="report">Report</option>
          <option value="data_set">Data Set</option>
          <option value="other">Other</option>
        </select>
      </div>
      <Input
        placeholder="URL / File Link"
        value={item.url || ""}
        onChange={(e) => onChange({ ...item, url: e.target.value })}
        className="text-xs"
      />
      <Textarea
        placeholder="Description of contents..."
        value={item.description || ""}
        onChange={(e) => onChange({ ...item, description: e.target.value })}
        className="text-xs min-h-[40px]"
      />
    </div>
  );

  return (
    <>
      <ContextEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        config={editDialogConfig}
        onSuccess={async () => {
          console.log('[ContextWizard] ContextEditDialog onSuccess callback triggered, reloading context data...');
          await reloadContextData();
          console.log('[ContextWizard] Context data reloaded successfully');
        }}
      />
      
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] h-[80vh] flex flex-col p-0 gap-0 [&_.text-xs]:text-sm [&_.h-8]:h-9 [&_.p-4]:p-5 [&_.rounded-lg]:rounded-xl [&_.space-y-3]:space-y-4 [&_.space-y-4]:space-y-5">
        <DialogHeader className="px-8 py-6 border-b shrink-0 bg-muted/30">
          <DialogTitle className="text-lg">Context Wizard</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Define your brand identity, products, team, competitive positioning, and upload supporting knowledge to power smarter agent decisions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
            <div className="px-8 py-4 shrink-0 border-b bg-background/40">
              <TabsList className="grid w-full grid-cols-3 h-12 p-1.5 bg-muted/70 rounded-xl">
                <TabsTrigger value="onSite" className="flex items-center gap-2 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"><Network className="h-4 w-4" /> On-site</TabsTrigger>
                <TabsTrigger value="offSite" className="flex items-center gap-2 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"><Globe className="h-4 w-4" /> Off-site</TabsTrigger>
                <TabsTrigger value="knowledge" className="flex items-center gap-2 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"><BookOpen className="h-4 w-4" /> Knowledge</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {isLoadingData ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading context data...</p>
                  </div>
                </div>
              ) : (
                <>
              {/* On-site Tab */}
              <TabsContent value="onSite" className="p-8 m-0 h-full overflow-y-auto">
                <div className="flex gap-8 pb-12">
                  {/* Left Column - 1/3 Width: Brand Assets & Pages */}
                  <div className="w-1/3 shrink-0 space-y-5">
                    {/* Brand Assets - Expanded */}
                    <div className="p-5 border rounded-xl bg-card/50 space-y-5">
                      <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2">
                        <Palette className="h-5 w-5 text-muted-foreground" /> Brand Assets
                      </h3>
                      <div className="grid gap-3">
                        {/* Homepage Meta Info */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Brand Name *</Label>
                              <Input
                                placeholder="Company or Product Name"
                                value={contextData.onSite.brandInfo.name}
                                onChange={(e) => updateOnSite({
                                  brandInfo: { ...contextData.onSite.brandInfo, name: e.target.value }
                                })}
                                className="text-xs h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Subtitle</Label>
                              <Input
                                placeholder="Your Tagline or Slogan"
                                value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#meta-subtitle")?.name || ""}
                                onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#meta-subtitle"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#meta-subtitle", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                                className="text-xs h-8"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Meta Description</Label>
                            <Textarea
                              placeholder="A compelling description of your website (150-160 characters)..."
                              value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#meta-description")?.name || ""}
                              onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#meta-description"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#meta-description", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                              className="text-xs min-h-[50px]"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Open Graph Image</Label>
                              <Input
                                placeholder="https://... (1200x630)"
                                value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#meta-og-image")?.name || ""}
                                onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#meta-og-image"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#meta-og-image", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                                className="text-xs h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Favicon</Label>
                              <Input
                                placeholder="https://... (32x32)"
                                value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#meta-favicon")?.name || ""}
                                onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#meta-favicon"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#meta-favicon", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                                className="text-xs h-8"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground mb-1 block">Logo URL</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Full Logo (Light)"
                              value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#brand-logo")?.name || ""}
                              onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#brand-logo"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#brand-logo", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                              className="text-xs h-8"
                            />
                            <Input
                              placeholder="Full Logo (Dark)"
                              value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#brand-logo-dark")?.name || ""}
                              onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#brand-logo-dark"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#brand-logo-dark", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                              className="text-xs h-8"
                            />
                            <Input
                              placeholder="Icon Only (Light)"
                              value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#brand-logo-icon")?.name || ""}
                              onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#brand-logo-icon"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#brand-logo-icon", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                              className="text-xs h-8"
                            />
                            <Input
                              placeholder="Icon Only (Dark)"
                              value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#brand-logo-icon-dark")?.name || ""}
                              onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#brand-logo-icon-dark"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#brand-logo-icon-dark", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground mb-1 block">Brand Colors</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Primary (Light): #3B82F6"
                              value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#brand-color-primary")?.name || ""}
                              onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#brand-color-primary"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#brand-color-primary", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                              className="text-xs h-8"
                            />
                            <Input
                              placeholder="Primary (Dark): #60A5FA"
                              value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#brand-color-primary-dark")?.name || ""}
                              onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#brand-color-primary-dark"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#brand-color-primary-dark", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                              className="text-xs h-8"
                            />
                            <Input
                              placeholder="Secondary (Light): #10B981"
                              value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#brand-color-secondary")?.name || ""}
                              onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#brand-color-secondary"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#brand-color-secondary", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                              className="text-xs h-8"
                            />
                            <Input
                              placeholder="Secondary (Dark): #34D399"
                              value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#brand-color-secondary-dark")?.name || ""}
                              onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#brand-color-secondary-dark"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#brand-color-secondary-dark", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Typography / Fonts</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Heading: Inter"
                              value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#brand-font-heading")?.name || ""}
                              onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#brand-font-heading"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#brand-font-heading", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                              className="text-xs h-8"
                            />
                            <Input
                              placeholder="Body: Open Sans"
                              value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#brand-font-body")?.name || ""}
                              onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#brand-font-body"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#brand-font-body", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Tone of Voice</Label>
                          <Input
                            placeholder="Professional, Friendly, Bold..."
                            value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#brand-tone")?.name || ""}
                            onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#brand-tone"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#brand-tone", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Supported Languages</Label>
                          <Input
                            placeholder="English, Spanish, Chinese..."
                            value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#brand-languages")?.name || ""}
                            onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#brand-languages"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#brand-languages", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }}
                            className="text-xs"
                          />
                        </div>

                      </div>
                    </div>

                    {/* Key Website Pages */}
                    <div className="p-5 border rounded-xl bg-card/50 space-y-5">
                      <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2">
                        <Layout className="h-4 w-4 text-muted-foreground" /> Key Website Pages
                      </h3>

                      {/* Row 1: Core Pages */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Core Pages</Label>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Home</Label>
                            <Input placeholder="https://..." value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.type === "home")?.url || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type !== "home"); updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: "Homepage", url: e.target.value, type: "home" as const }] }); }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">About</Label>
                            <Input placeholder="/about" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.type === "about")?.url || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type !== "about"); updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: "About", url: e.target.value, type: "about" as const }] }); }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Contact</Label>
                            <Input placeholder="/contact" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#page-contact")?.name || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#page-contact"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#page-contact", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Careers</Label>
                            <Input placeholder="/careers" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.type === "career")?.url || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type !== "career"); updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: "Careers", url: e.target.value, type: "career" as const }] }); }} className="text-xs h-8" />
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Product Pages */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Product Pages</Label>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Products</Label>
                            <Input placeholder="/products" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#page-products")?.name || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#page-products"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#page-products", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Features</Label>
                            <Input placeholder="/features" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#page-features")?.name || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#page-features"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#page-features", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Pricing</Label>
                            <Input placeholder="/pricing" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.type === "pricing")?.url || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type !== "pricing"); updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: "Pricing", url: e.target.value, type: "pricing" as const }] }); }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Solutions</Label>
                            <Input placeholder="/solutions" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#page-solutions")?.name || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#page-solutions"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#page-solutions", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Resources */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Resources</Label>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Blog</Label>
                            <Input placeholder="/blog" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#page-blog")?.name || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#page-blog"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#page-blog", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Docs</Label>
                            <Input placeholder="/docs" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.type === "documentation")?.url || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type !== "documentation"); updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: "Docs", url: e.target.value, type: "documentation" as const }] }); }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">FAQ</Label>
                            <Input placeholder="/faq" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.type === "faq")?.url || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type !== "faq"); updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: "FAQ", url: e.target.value, type: "faq" as const }] }); }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Cases</Label>
                            <Input placeholder="/case-studies" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.type === "case_study")?.url || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type !== "case_study"); updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: "Case Studies", url: e.target.value, type: "case_study" as const }] }); }} className="text-xs h-8" />
                          </div>
                        </div>
                      </div>

                      {/* Row 4: Legal & Updates */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Legal & Updates</Label>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Terms</Label>
                            <Input placeholder="/terms" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.type === "legal")?.url || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type !== "legal"); updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: "Legal", url: e.target.value, type: "legal" as const }] }); }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Privacy</Label>
                            <Input placeholder="/privacy" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#page-privacy")?.name || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#page-privacy"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#page-privacy", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Changes</Label>
                            <Input placeholder="/changelog" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#page-changelog")?.name || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#page-changelog"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#page-changelog", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Status</Label>
                            <Input placeholder="/status" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#page-status")?.name || ""} onChange={(e) => { const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#page-status"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#page-status", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Landing Pages & Campaigns - Collapsible for large lists */}
                    <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2">
                          <Megaphone className="h-4 w-4 text-muted-foreground" /> Landing Pages <span className="text-xs text-muted-foreground/60 font-medium">({(contextData.onSite.landingPages || []).length})</span>
                        </h3>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Import from Sitemap XML" onClick={() => {
                            const url = prompt("Enter Sitemap XML URL:");
                            if (url) {
                              // Store the sitemap URL for later processing
                              const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#sitemap-landing");
                              updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: url, url: "#sitemap-landing", type: "other" as const }] });
                              alert("Sitemap URL saved. Pages will be imported during processing.");
                            }
                          }}>
                            <Map className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateOnSite({ landingPages: [...contextData.onSite.landingPages, { id: uuidv4(), name: "", url: "", type: "campaign", status: "active", createdAt: new Date().toISOString() }] })}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {contextData.onSite.landingPages.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ landingPages: [...contextData.onSite.landingPages, { id: uuidv4(), name: "", url: "", type: "campaign", status: "active", createdAt: new Date().toISOString() }] })}>
                          Click + to add landing pages
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {contextData.onSite.landingPages.map((page: LandingPage) => (
                            <div key={page.id} className="flex gap-1.5 group">
                              <Input placeholder="Page URL..." value={page.url} onChange={(e) => updateOnSite({ landingPages: contextData.onSite.landingPages.map((p: LandingPage) => p.id === page.id ? { ...p, url: e.target.value } : p) })} className="text-xs h-8" />
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => updateOnSite({ landingPages: contextData.onSite.landingPages.filter((i: LandingPage) => i.id !== page.id) })}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Blog & Resources - Collapsible for large lists */}
                    <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" /> Blog & Resources <span className="text-xs text-muted-foreground/60 font-medium">({(contextData.onSite.blogPosts || []).length})</span>
                        </h3>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Import from RSS Feed" onClick={() => {
                            const url = prompt("Enter RSS Feed URL:");
                            if (url) {
                              // Store the RSS URL for later processing
                              const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url !== "#rss-blog");
                              updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: url, url: "#rss-blog", type: "other" as const }] });
                              alert("RSS URL saved. Posts will be imported during processing.");
                            }
                          }}>
                            <Rss className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateOnSite({ blogPosts: [...contextData.onSite.blogPosts, { id: uuidv4(), url: "", title: "", status: "published" }] })}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {contextData.onSite.blogPosts.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ blogPosts: [...contextData.onSite.blogPosts, { id: uuidv4(), url: "", title: "", status: "published" }] })}>
                          Click + to add blog posts
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {contextData.onSite.blogPosts.map((post: BlogPost) => (
                            <div key={post.id} className="flex gap-1.5 group">
                              <Input placeholder="Blog URL..." value={post.url} onChange={(e) => updateOnSite({ blogPosts: contextData.onSite.blogPosts.map((p: BlogPost) => p.id === post.id ? { ...p, url: e.target.value } : p) })} className="text-xs h-8" />
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => updateOnSite({ blogPosts: contextData.onSite.blogPosts.filter((i: BlogPost) => i.id !== post.id) })}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ========== Right Column - 2/3 Width: One-Page Website Content ========== */}
                  <div className="flex-1 space-y-4">

                    {/* ===== SECTION 1: HERO & VALUE PROP ===== */}
                    <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Flag className="h-4 w-4 text-muted-foreground" /> Hero Section
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Headline / Value Proposition</Label>
                            <Textarea placeholder="Your main headline - the #1 reason customers should choose you" value={contextData.onSite.brandInfo.uniqueSellingPoints?.[0] || ""} onChange={(e) => { const usps = [...(contextData.onSite.brandInfo.uniqueSellingPoints || [])]; usps[0] = e.target.value; updateOnSite({ brandInfo: { ...contextData.onSite.brandInfo, uniqueSellingPoints: usps.filter(Boolean) } }); }} className="min-h-[60px] bg-background/80" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Subheadline</Label>
                            <Textarea placeholder="Supporting statement that expands on the headline..." value={contextData.onSite.brandInfo.tagline || ""} onChange={(e) => updateOnSite({ brandInfo: { ...contextData.onSite.brandInfo, tagline: e.target.value } })} className="min-h-[60px] bg-background/80" />
                          </div>
                          {/* CTA Buttons */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">Call to Action (CTA) {(contextData.onSite.websiteContent || []).filter(c => c.url === "#cta").length > 0 && <span>({(contextData.onSite.websiteContent || []).filter(c => c.url === "#cta").length})</span>}</Label>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#cta", type: "other" as const, description: "" }] })}><Plus className="h-3 w-3" /></Button>
                            </div>
                            <div className="space-y-1.5">
                              {(contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#cta").length === 0 ? (
                                <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#cta", type: "other" as const, description: "" }] })}>
                                  Click + to add CTA
                                </div>
                              ) : (
                                (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#cta").map((item: WebsiteContent) => (
                                  <div key={item.id} className="flex gap-1 group">
                                    <Input placeholder="Button text..." value={item.name} onChange={(e) => {
                                      const updatedContent = contextData.onSite.websiteContent.map((c: WebsiteContent) => c.id === item.id ? { ...c, name: e.target.value } : c);
                                      updateOnSite({ websiteContent: updatedContent });
                                    }} className="text-xs h-8 bg-background/80 w-1/3" />
                                    <Input placeholder="URL: /signup or https://..." value={item.description || ""} onChange={(e) => {
                                      const updatedContent = contextData.onSite.websiteContent.map((c: WebsiteContent) => c.id === item.id ? { ...c, description: e.target.value } : c);
                                      updateOnSite({ websiteContent: updatedContent });
                                    }} className="text-xs h-8 bg-background/80 flex-1" />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => {
                                      updateOnSite({ websiteContent: (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.id !== item.id) });
                                    }}><X className="h-3 w-3" /></Button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {/* Feature Image/Video - Multiple items, moved above Key Metrics */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">Feature Images / Videos {(contextData.onSite.websiteContent || []).filter(c => c.url === "#hero-media").length > 0 && <span>({(contextData.onSite.websiteContent || []).filter(c => c.url === "#hero-media").length})</span>}</Label>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#hero-media", type: "other" as const }] })}><Plus className="h-3 w-3" /></Button>
                            </div>
                            <div className="space-y-1.5">
                              {(contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#hero-media").length === 0 ? (
                                <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#hero-media", type: "other" as const }] })}>
                                  Click + to add media
                                </div>
                              ) : (
                                (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#hero-media").map((item: WebsiteContent) => (
                                  <div key={item.id} className="flex gap-1.5 group">
                                    <Input placeholder="https://... (image or video URL)" value={item.name} onChange={(e) => {
                                      const updatedContent = contextData.onSite.websiteContent.map((c: WebsiteContent) => c.id === item.id ? { ...c, name: e.target.value } : c);
                                      updateOnSite({ websiteContent: updatedContent });
                                    }} className="text-xs h-8 bg-background/80" />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => {
                                      updateOnSite({ websiteContent: (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.id !== item.id) });
                                    }}><X className="h-3 w-3" /></Button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                          {/* Key Metrics - now line by line */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">Key Metrics / Social Proof {(contextData.onSite.websiteContent || []).filter(c => c.url === "#metric").length > 0 && <span>({(contextData.onSite.websiteContent || []).filter(c => c.url === "#metric").length})</span>}</Label>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#metric", type: "other" as const }] })}><Plus className="h-3 w-3" /></Button>
                            </div>
                            <div className="space-y-1.5">
                              {(contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#metric").length === 0 ? (
                                <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#metric", type: "other" as const }] })}>
                                  Click + to add metrics
                                </div>
                              ) : (
                                (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#metric").map((item: WebsiteContent) => (
                                  <div key={item.id} className="flex gap-1.5 group">
                                    <Input placeholder="e.g. 10K+ users / 99.9% uptime / $2M saved / 500+ reviews / 50+ countries" value={item.name} onChange={(e) => {
                                      const updatedContent = contextData.onSite.websiteContent.map((c: WebsiteContent) => c.id === item.id ? { ...c, name: e.target.value } : c);
                                      updateOnSite({ websiteContent: updatedContent });
                                    }} className="text-xs h-8 bg-background/80" />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => {
                                      updateOnSite({ websiteContent: (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.id !== item.id) });
                                    }}><X className="h-3 w-3" /></Button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ===== SECTION 2: PROBLEM & TARGET ===== */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-muted-foreground" /> Problem Statement {(contextData.onSite.websiteContent || []).filter(c => c.url === "#problem").length > 0 && <span className="text-xs text-muted-foreground/60 font-medium">({(contextData.onSite.websiteContent || []).filter(c => c.url === "#problem").length})</span>}</h4>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                            updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#problem", type: "other" as const }] });
                          }}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          {(contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#problem").length === 0 ? (
                            <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#problem", type: "other" as const }] })}>
                              Click + to add pain points
                            </div>
                          ) : (
                            (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#problem").map((item: WebsiteContent) => (
                              <div key={item.id} className="flex gap-1.5 group">
                                <Input placeholder="Customer pain point..." value={item.name} onChange={(e) => {
                                  const updatedContent = contextData.onSite.websiteContent.map((c: WebsiteContent) => c.id === item.id ? { ...c, name: e.target.value } : c);
                                  updateOnSite({ websiteContent: updatedContent });
                                }} className="text-xs h-8" />
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => {
                                  updateOnSite({ websiteContent: (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.id !== item.id) });
                                }}><X className="h-3 w-3" /></Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> Who We Serve {(contextData.onSite.websiteContent || []).filter(c => c.url === "#audience").length > 0 && <span className="text-xs text-muted-foreground/60 font-medium">({(contextData.onSite.websiteContent || []).filter(c => c.url === "#audience").length})</span>}</h4>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                            updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#audience", type: "other" as const }] });
                          }}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          {(contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#audience").length === 0 ? (
                            <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#audience", type: "other" as const }] })}>
                              Click + to add target audiences
                            </div>
                          ) : (
                            (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#audience").map((item: WebsiteContent) => (
                              <div key={item.id} className="flex gap-1.5 group">
                                <Input placeholder="Target segment (e.g., SaaS startups, Enterprise CTOs...)" value={item.name} onChange={(e) => {
                                  const updatedContent = contextData.onSite.websiteContent.map((c: WebsiteContent) => c.id === item.id ? { ...c, name: e.target.value } : c);
                                  updateOnSite({ websiteContent: updatedContent });
                                }} className="text-xs h-8" />
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => {
                                  updateOnSite({ websiteContent: (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.id !== item.id) });
                                }}><X className="h-3 w-3" /></Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ===== Use Cases / Industries ===== */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-muted-foreground" /> Use Cases {(contextData.onSite.websiteContent || []).filter(c => c.url === "#use-case").length > 0 && <span className="text-xs text-muted-foreground/60 font-medium">({(contextData.onSite.websiteContent || []).filter(c => c.url === "#use-case").length})</span>}</h4>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                            updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#use-case", type: "other" as const }] });
                          }}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          {(contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#use-case").length === 0 ? (
                            <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#use-case", type: "other" as const }] })}>
                              Click + to add use cases
                            </div>
                          ) : (
                            (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#use-case").map((item: WebsiteContent) => (
                              <div key={item.id} className="flex gap-1.5 group">
                                <Input placeholder="Marketing automation, Sales CRM..." value={item.name} onChange={(e) => {
                                  const updatedContent = contextData.onSite.websiteContent.map((c: WebsiteContent) => c.id === item.id ? { ...c, name: e.target.value } : c);
                                  updateOnSite({ websiteContent: updatedContent });
                                }} className="text-xs h-8" />
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => {
                                  updateOnSite({ websiteContent: (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.id !== item.id) });
                                }}><X className="h-3 w-3" /></Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /> Industries {(contextData.onSite.websiteContent || []).filter(c => c.url === "#industry").length > 0 && <span className="text-xs text-muted-foreground/60 font-medium">({(contextData.onSite.websiteContent || []).filter(c => c.url === "#industry").length})</span>}</h4>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                            updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#industry", type: "other" as const }] });
                          }}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          {(contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#industry").length === 0 ? (
                            <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#industry", type: "other" as const }] })}>
                              Click + to add industries
                            </div>
                          ) : (
                            (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#industry").map((item: WebsiteContent) => (
                              <div key={item.id} className="flex gap-1.5 group">
                                <Input placeholder="SaaS, E-commerce, Healthcare..." value={item.name} onChange={(e) => {
                                  const updatedContent = contextData.onSite.websiteContent.map((c: WebsiteContent) => c.id === item.id ? { ...c, name: e.target.value } : c);
                                  updateOnSite({ websiteContent: updatedContent });
                                }} className="text-xs h-8" />
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => {
                                  updateOnSite({ websiteContent: (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.id !== item.id) });
                                }}><X className="h-3 w-3" /></Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ===== SECTION 3: SOLUTION / PRODUCTS ===== */}
                    <div className="p-4 border rounded-lg bg-card/50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-muted-foreground" /> Products & Services {contextData.onSite.productsServices.length > 0 && <span className="text-xs text-muted-foreground/60 font-medium">({contextData.onSite.productsServices.length})</span>}</h4>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateOnSite({ productsServices: [...contextData.onSite.productsServices, { id: uuidv4(), name: "", type: "product" }] })}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <ComplexListInput label="products & services" items={contextData.onSite.productsServices} onChange={(items) => updateOnSite({ productsServices: items })} onRemove={(id) => updateOnSite({ productsServices: contextData.onSite.productsServices.filter((i: ProductService) => i.id !== id) })} onAdd={() => updateOnSite({ productsServices: [...contextData.onSite.productsServices, { id: uuidv4(), name: "", type: "product" }] })} renderItem={renderProductService} maxHeight="none" />
                    </div>


                    {/* ===== SECTION 6: SOCIAL PROOF & TRUST ===== */}
                    <div className="p-4 border rounded-lg bg-card/50 space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2"><Star className="h-4 w-4 text-muted-foreground" /> Social Proof & Trust</h4>
                      {/* Row 1: Testimonials, Case Studies, Trust Badges */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Testimonials {(contextData.onSite.websiteContent || []).filter(c => c.type === "testimonial").length > 0 && <span>({(contextData.onSite.websiteContent || []).filter(c => c.type === "testimonial").length})</span>}</Label>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                              updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "", type: "testimonial" as const }] });
                            }}><Plus className="h-3 w-3" /></Button>
                          </div>
                          <div className="space-y-1.5">
                            {(contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type === "testimonial").length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "", type: "testimonial" as const }] })}>
                                Click + to add testimonials
                              </div>
                            ) : (
                              (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type === "testimonial").map((item: WebsiteContent) => (
                                <div key={item.id} className="flex gap-1 group">
                                  <Input placeholder='"Quote..."' value={item.name} onChange={(e) => {
                                    const updatedContent = contextData.onSite.websiteContent.map((c: WebsiteContent) => c.id === item.id ? { ...c, name: e.target.value } : c);
                                    updateOnSite({ websiteContent: updatedContent });
                                  }} className="text-xs h-8" />
                                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => {
                                    updateOnSite({ websiteContent: (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.id !== item.id) });
                                  }}><X className="h-3 w-3" /></Button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Case Studies {(contextData.onSite.websiteContent || []).filter(c => c.type === "case_study").length > 0 && <span>({(contextData.onSite.websiteContent || []).filter(c => c.type === "case_study").length})</span>}</Label>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                              updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "Case Study", url: "", type: "case_study" as const }] });
                            }}><Plus className="h-3 w-3" /></Button>
                          </div>
                          <div className="space-y-1.5">
                            {(contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type === "case_study").length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "Case Study", url: "", type: "case_study" as const }] })}>
                                Click + to add case studies
                              </div>
                            ) : (
                              (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type === "case_study").map((item: WebsiteContent) => (
                                <div key={item.id} className="flex gap-1 group">
                                  <Input placeholder="URL..." value={item.url} onChange={(e) => {
                                    const updatedContent = contextData.onSite.websiteContent.map((c: WebsiteContent) => c.id === item.id ? { ...c, url: e.target.value } : c);
                                    updateOnSite({ websiteContent: updatedContent });
                                  }} className="text-xs h-8" />
                                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => {
                                    updateOnSite({ websiteContent: (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.id !== item.id) });
                                  }}><X className="h-3 w-3" /></Button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Trust Badges {(contextData.onSite.websiteContent || []).filter(c => c.url === "#logo").length > 0 && <span>({(contextData.onSite.websiteContent || []).filter(c => c.url === "#logo").length})</span>}</Label>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                              updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#logo", type: "other" as const }] });
                            }}><Plus className="h-3 w-3" /></Button>
                          </div>
                          <div className="space-y-1.5">
                            {(contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#logo").length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#logo", type: "other" as const }] })}>
                                Click + to add logos
                              </div>
                            ) : (
                              (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#logo").map((item: WebsiteContent) => (
                                <div key={item.id} className="flex gap-1 group">
                                  <Input placeholder="Company..." value={item.name} onChange={(e) => {
                                    const updatedContent = contextData.onSite.websiteContent.map((c: WebsiteContent) => c.id === item.id ? { ...c, name: e.target.value } : c);
                                    updateOnSite({ websiteContent: updatedContent });
                                  }} className="text-xs h-8" />
                                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => {
                                    updateOnSite({ websiteContent: (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.id !== item.id) });
                                  }}><X className="h-3 w-3" /></Button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Row 2: Awards, Guarantees, Integrations */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Awards & Certs {(contextData.onSite.websiteContent || []).filter(c => c.url === "#award").length > 0 && <span>({(contextData.onSite.websiteContent || []).filter(c => c.url === "#award").length})</span>}</Label>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                              updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#award", type: "other" as const }] });
                            }}><Plus className="h-3 w-3" /></Button>
                          </div>
                          <div className="space-y-1.5">
                            {(contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#award").length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#award", type: "other" as const }] })}>
                                Click + to add awards
                              </div>
                            ) : (
                              (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#award").map((item: WebsiteContent) => (
                                <div key={item.id} className="flex gap-1 group">
                                  <Input placeholder="ISO 27001 / G2 Leader..." value={item.name} onChange={(e) => {
                                    const updatedContent = contextData.onSite.websiteContent.map((c: WebsiteContent) => c.id === item.id ? { ...c, name: e.target.value } : c);
                                    updateOnSite({ websiteContent: updatedContent });
                                  }} className="text-xs h-8" />
                                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => {
                                    updateOnSite({ websiteContent: (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.id !== item.id) });
                                  }}><X className="h-3 w-3" /></Button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Guarantees {(contextData.onSite.websiteContent || []).filter(c => c.url === "#guarantee").length > 0 && <span>({(contextData.onSite.websiteContent || []).filter(c => c.url === "#guarantee").length})</span>}</Label>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                              updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#guarantee", type: "other" as const }] });
                            }}><Plus className="h-3 w-3" /></Button>
                          </div>
                          <div className="space-y-1.5">
                            {(contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#guarantee").length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#guarantee", type: "other" as const }] })}>
                                Click + to add guarantees
                              </div>
                            ) : (
                              (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#guarantee").map((item: WebsiteContent) => (
                                <div key={item.id} className="flex gap-1 group">
                                  <Input placeholder="30-day refund / 99.9% SLA..." value={item.name} onChange={(e) => {
                                    const updatedContent = contextData.onSite.websiteContent.map((c: WebsiteContent) => c.id === item.id ? { ...c, name: e.target.value } : c);
                                    updateOnSite({ websiteContent: updatedContent });
                                  }} className="text-xs h-8" />
                                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => {
                                    updateOnSite({ websiteContent: (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.id !== item.id) });
                                  }}><X className="h-3 w-3" /></Button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Integrations {(contextData.onSite.websiteContent || []).filter(c => c.url === "#integration").length > 0 && <span>({(contextData.onSite.websiteContent || []).filter(c => c.url === "#integration").length})</span>}</Label>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                              updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#integration", type: "other" as const }] });
                            }}><Plus className="h-3 w-3" /></Button>
                          </div>
                          <div className="space-y-1.5">
                            {(contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#integration").length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ websiteContent: [...contextData.onSite.websiteContent, { id: uuidv4(), name: "", url: "#integration", type: "other" as const }] })}>
                                Click + to add integrations
                              </div>
                            ) : (
                              (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.url === "#integration").map((item: WebsiteContent) => (
                                <div key={item.id} className="flex gap-1 group">
                                  <Input placeholder="Slack / Salesforce / Zapier..." value={item.name} onChange={(e) => {
                                    const updatedContent = contextData.onSite.websiteContent.map((c: WebsiteContent) => c.id === item.id ? { ...c, name: e.target.value } : c);
                                    updateOnSite({ websiteContent: updatedContent });
                                  }} className="text-xs h-8" />
                                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => {
                                    updateOnSite({ websiteContent: (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.id !== item.id) });
                                  }}><X className="h-3 w-3" /></Button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ===== SECTION 8: TEAM & COMPANY ===== */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg bg-card/50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2"><UserCircle className="h-4 w-4 text-muted-foreground" /> Leadership Team {contextData.onSite.team.length > 0 && <span className="text-xs text-muted-foreground/60 font-medium">({contextData.onSite.team.length})</span>}</h4>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateOnSite({ team: [...contextData.onSite.team, { id: uuidv4(), name: "", role: "" }] })}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <ComplexListInput label="team members" items={contextData.onSite.team} onChange={(items) => updateOnSite({ team: items })} onRemove={(id) => updateOnSite({ team: contextData.onSite.team.filter((i: TeamMember) => i.id !== id) })} onAdd={() => updateOnSite({ team: [...contextData.onSite.team, { id: uuidv4(), name: "", role: "" }] })} renderItem={renderTeamMember} maxHeight="none" />
                      </div>
                      <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2"><Info className="h-4 w-4 text-muted-foreground" /> About Us</h4>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Company Story</Label>
                            <Textarea placeholder="Founded in... Our story..." value={contextData.onSite.brandInfo.foundingStory || ""} onChange={(e) => updateOnSite({ brandInfo: { ...contextData.onSite.brandInfo, foundingStory: e.target.value } })} className="min-h-[50px]" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Mission</Label>
                              <Textarea placeholder="We exist to..." value={contextData.onSite.brandInfo.mission || ""} onChange={(e) => updateOnSite({ brandInfo: { ...contextData.onSite.brandInfo, mission: e.target.value } })} className="min-h-[40px] text-xs" />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Vision</Label>
                              <Textarea placeholder="We envision a world where..." value={contextData.onSite.brandInfo.vision || ""} onChange={(e) => updateOnSite({ brandInfo: { ...contextData.onSite.brandInfo, vision: e.target.value } })} className="min-h-[40px] text-xs" />
                            </div>
                          </div>
                          {/* Core Values */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">Core Values {(contextData.onSite.brandInfo.coreValues || []).length > 0 && <span>({(contextData.onSite.brandInfo.coreValues || []).length})</span>}</Label>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOnSite({ brandInfo: { ...contextData.onSite.brandInfo, coreValues: [...(contextData.onSite.brandInfo.coreValues || []), ""] } })}><Plus className="h-3 w-3" /></Button>
                            </div>
                            <div className="space-y-1">
                              {(contextData.onSite.brandInfo.coreValues || []).length === 0 ? (
                                <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOnSite({ brandInfo: { ...contextData.onSite.brandInfo, coreValues: [""] } })}>
                                  Click + to add core values
                                </div>
                              ) : (contextData.onSite.brandInfo.coreValues || []).map((val, idx) => (
                                <div key={idx} className="flex gap-1 group">
                                  <Input value={val} onChange={(e) => {
                                    const newValues = [...(contextData.onSite.brandInfo.coreValues || [])];
                                    newValues[idx] = e.target.value;
                                    updateOnSite({ brandInfo: { ...contextData.onSite.brandInfo, coreValues: newValues } });
                                  }} placeholder="e.g. Integrity, Innovation..." className="text-xs h-8" />
                                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => {
                                    const newValues = (contextData.onSite.brandInfo.coreValues || []).filter((_, i) => i !== idx);
                                    updateOnSite({ brandInfo: { ...contextData.onSite.brandInfo, coreValues: newValues } });
                                  }}><X className="h-3 w-3" /></Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ===== SECTION 9: FAQ ===== */}
                    <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2"><HelpCircle className="h-4 w-4 text-muted-foreground" /> FAQ {(contextData.onSite.websiteContent || []).filter(c => c.type === "faq").length > 0 && <span className="text-xs text-muted-foreground/60 font-medium">({(contextData.onSite.websiteContent || []).filter(c => c.type === "faq").length})</span>}</h4>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                          const faqContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type === "faq");
                          const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type !== "faq");
                          updateOnSite({ websiteContent: [...otherContent, ...faqContent, { id: uuidv4(), name: "", url: "", type: "faq" as const }] });
                        }}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {(contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type === "faq").length === 0 ? (
                          <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => {
                            const faqContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type === "faq");
                            const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type !== "faq");
                            updateOnSite({ websiteContent: [...otherContent, ...faqContent, { id: uuidv4(), name: "", url: "", type: "faq" as const }] });
                          }}>
                            Click + to add FAQs
                          </div>
                        ) : (
                          (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type === "faq").map((faq: WebsiteContent, idx: number) => (
                            <div key={faq.id} className="p-3 border rounded-lg bg-background/50 space-y-2 group">
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-bold text-primary shrink-0 mt-2">Q:</span>
                                <Input
                                  placeholder="What is your question?"
                                  value={faq.name}
                                  onChange={(e) => {
                                    const allFaqs = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type === "faq");
                                    const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type !== "faq");
                                    allFaqs[idx] = { ...faq, name: e.target.value };
                                    updateOnSite({ websiteContent: [...otherContent, ...allFaqs] });
                                  }}
                                  className="text-sm font-medium"
                                />
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => {
                                  const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.id !== faq.id);
                                  updateOnSite({ websiteContent: otherContent });
                                }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-bold text-muted-foreground shrink-0 mt-2">A:</span>
                                <Textarea
                                  placeholder="Your answer..."
                                  value={faq.description || ""}
                                  onChange={(e) => {
                                    const allFaqs = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type === "faq");
                                    const otherContent = (contextData.onSite.websiteContent || []).filter((c: WebsiteContent) => c.type !== "faq");
                                    allFaqs[idx] = { ...faq, description: e.target.value };
                                    updateOnSite({ websiteContent: [...otherContent, ...allFaqs] });
                                  }}
                                  className="text-xs min-h-[60px]"
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* ===== SECTION 10: CONTACT INFO ===== */}
                    <div className="p-4 border rounded-lg bg-card/50 space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Contact Information</h4>

                      {/* Row 1: Primary Contact Methods */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Primary Contact</Label>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">General Email</Label>
                            <Input placeholder="contact@company.com" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#contact-email")?.name || ""} onChange={(e) => { const otherContent = contextData.onSite.websiteContent.filter((c: WebsiteContent) => c.url !== "#contact-email"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#contact-email", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Sales Email</Label>
                            <Input placeholder="sales@company.com" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#contact-sales")?.name || ""} onChange={(e) => { const otherContent = contextData.onSite.websiteContent.filter((c: WebsiteContent) => c.url !== "#contact-sales"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#contact-sales", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Phone</Label>
                            <Input placeholder="+1 (555) 123-4567" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#contact-phone")?.name || ""} onChange={(e) => { const otherContent = contextData.onSite.websiteContent.filter((c: WebsiteContent) => c.url !== "#contact-phone"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#contact-phone", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Location & Hours */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Location & Hours</Label>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">HQ Address</Label>
                            <Input placeholder="123 Main St, City, Country" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#contact-address")?.name || ""} onChange={(e) => { const otherContent = contextData.onSite.websiteContent.filter((c: WebsiteContent) => c.url !== "#contact-address"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#contact-address", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Business Hours</Label>
                            <Input placeholder="Mon-Fri 9am-5pm EST" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#contact-hours")?.name || ""} onChange={(e) => { const otherContent = contextData.onSite.websiteContent.filter((c: WebsiteContent) => c.url !== "#contact-hours"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#contact-hours", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Timezone</Label>
                            <Input placeholder="UTC-5 / EST / PST..." value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#contact-timezone")?.name || ""} onChange={(e) => { const otherContent = contextData.onSite.websiteContent.filter((c: WebsiteContent) => c.url !== "#contact-timezone"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#contact-timezone", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Support Channels */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Support Channels</Label>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Help Center</Label>
                            <Input placeholder="help.company.com" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#contact-support")?.name || ""} onChange={(e) => { const otherContent = contextData.onSite.websiteContent.filter((c: WebsiteContent) => c.url !== "#contact-support"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#contact-support", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Live Chat</Label>
                            <Input placeholder="Intercom / Zendesk..." value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#support-chat")?.name || ""} onChange={(e) => { const otherContent = contextData.onSite.websiteContent.filter((c: WebsiteContent) => c.url !== "#support-chat"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#support-chat", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Support Email</Label>
                            <Input placeholder="support@company.com" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#support-ticket")?.name || ""} onChange={(e) => { const otherContent = contextData.onSite.websiteContent.filter((c: WebsiteContent) => c.url !== "#support-ticket"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#support-ticket", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Community</Label>
                            <Input placeholder="Discord / Slack..." value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#support-community")?.name || ""} onChange={(e) => { const otherContent = contextData.onSite.websiteContent.filter((c: WebsiteContent) => c.url !== "#support-community"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#support-community", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                        </div>
                      </div>

                      {/* Row 4: Additional Contact Options */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Additional</Label>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Press / Media</Label>
                            <Input placeholder="press@company.com" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#contact-press")?.name || ""} onChange={(e) => { const otherContent = contextData.onSite.websiteContent.filter((c: WebsiteContent) => c.url !== "#contact-press"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#contact-press", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Partnerships</Label>
                            <Input placeholder="partners@company.com" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#contact-partners")?.name || ""} onChange={(e) => { const otherContent = contextData.onSite.websiteContent.filter((c: WebsiteContent) => c.url !== "#contact-partners"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#contact-partners", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Careers</Label>
                            <Input placeholder="careers@company.com" value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#contact-careers")?.name || ""} onChange={(e) => { const otherContent = contextData.onSite.websiteContent.filter((c: WebsiteContent) => c.url !== "#contact-careers"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#contact-careers", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground/70 mb-0.5 block">Newsletter</Label>
                            <Input placeholder="https://..." value={contextData.onSite.websiteContent.find((c: WebsiteContent) => c.url === "#contact-newsletter")?.name || ""} onChange={(e) => { const otherContent = contextData.onSite.websiteContent.filter((c: WebsiteContent) => c.url !== "#contact-newsletter"); if (e.target.value) { updateOnSite({ websiteContent: [...otherContent, { id: uuidv4(), name: e.target.value, url: "#contact-newsletter", type: "other" as const }] }); } else { updateOnSite({ websiteContent: otherContent }); } }} className="text-xs h-8" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Off-site Tab */}
              <TabsContent value="offSite" className="p-8 m-0 h-full overflow-y-auto">
                <div className="flex gap-8 pb-12">
                  {/* Left Column - 1/3 Width: Monitoring, Tracking, Alerts, Collection */}
                  <div className="w-1/3 shrink-0 space-y-5">

                    {/* Section 1: Monitoring Scope */}
                    <div className="p-5 border rounded-xl bg-card/50 space-y-5">
                      <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2">
                        <Target className="h-5 w-5 text-muted-foreground" /> Monitoring Scope
                      </h3>

                      {/* Keywords & Signals */}
                      <div className="space-y-3">
                        <SimpleArrayInput label="Brand Keywords" values={contextData.offSite.monitoringScope.brandKeywords} onChange={(v) => updateOffSite({ monitoringScope: { ...contextData.offSite.monitoringScope, brandKeywords: v } })} placeholder="Brand name, abbreviation..." maxHeight="none" />
                        <SimpleArrayInput label="Product Keywords" values={contextData.offSite.monitoringScope.productKeywords} onChange={(v) => updateOffSite({ monitoringScope: { ...contextData.offSite.monitoringScope, productKeywords: v } })} placeholder="Product name..." maxHeight="none" />
                        <SimpleArrayInput label="Key Persons" values={contextData.offSite.monitoringScope.keyPersons} onChange={(v) => updateOffSite({ monitoringScope: { ...contextData.offSite.monitoringScope, keyPersons: v } })} placeholder="CEO, spokesperson..." maxHeight="none" />
                        <SimpleArrayInput label="Hashtags" values={contextData.offSite.monitoringScope.hashtags} onChange={(v) => updateOffSite({ monitoringScope: { ...contextData.offSite.monitoringScope, hashtags: v } })} placeholder="#CampaignName" maxHeight="none" />
                      </div>

                      {/* Filters */}
                      <div className="space-y-3 pt-2">
                        <SimpleArrayInput label="Required Keywords (AND)" values={contextData.offSite.monitoringScope.requiredKeywords} onChange={(v) => updateOffSite({ monitoringScope: { ...contextData.offSite.monitoringScope, requiredKeywords: v } })} placeholder="Must co-occur..." maxHeight="none" />
                        <SimpleArrayInput label="Excluded Keywords" values={contextData.offSite.monitoringScope.excludedKeywords} onChange={(v) => updateOffSite({ monitoringScope: { ...contextData.offSite.monitoringScope, excludedKeywords: v } })} placeholder="Noise exclusion..." maxHeight="none" />
                      </div>

                      {/* Geographic & Language */}
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-2">
                          <SimpleArrayInput label="Regions" values={contextData.offSite.monitoringScope.regions} onChange={(v) => updateOffSite({ monitoringScope: { ...contextData.offSite.monitoringScope, regions: v } })} placeholder="US, CN, EU..." maxHeight="none" />
                          <SimpleArrayInput label="Languages" values={contextData.offSite.monitoringScope.languages} onChange={(v) => updateOffSite({ monitoringScope: { ...contextData.offSite.monitoringScope, languages: v } })} placeholder="EN, ZH..." maxHeight="none" />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Right Column - 2/3 Width: MECE Layout */}
                  <div className="flex-1 space-y-5">
                    {/* ===== SECTION 1: OWNED PRESENCE (整行) ===== */}
                    <div className="p-5 border rounded-xl bg-card/50 space-y-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /> Owned Presence</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Official Channels */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Official Channels</Label>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs gap-1" 
                              onClick={() => openEditDialog('Official Channels')}
                            >
                              <Edit className="h-3 w-3" />
                              Manage
                            </Button>
                          </div>
                          <div 
                            className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
                            onClick={() => openEditDialog('Official Channels')}
                          >
                            {contextData.offSite.socialAccounts.length === 0 ? (
                              <>Click to add social media channels</>
                            ) : (
                              <>{contextData.offSite.socialAccounts.length} channel{contextData.offSite.socialAccounts.length > 1 ? 's' : ''} configured</>
                            )}
                          </div>
                        </div>
                        {/* Executive Accounts */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Executive Accounts</Label><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOffSite({ executiveAccounts: [...(contextData.offSite.executiveAccounts || []), { id: uuidv4(), name: '', title: '', platform: 'LinkedIn', handle: '', xUrl: '', linkedinUrl: '' } as ExecutiveAccount] })}><Plus className="h-3 w-3" /></Button></div>
                          <div className="space-y-1">
                            {(contextData.offSite.executiveAccounts || []).length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOffSite({ executiveAccounts: [...(contextData.offSite.executiveAccounts || []), { id: uuidv4(), name: '', title: '', platform: 'LinkedIn', handle: '', xUrl: '', linkedinUrl: '' } as ExecutiveAccount] })}>
                                Click + to add executives
                              </div>
                            ) : (
                              (contextData.offSite.executiveAccounts || []).map((e: ExecutiveAccount) => (<div key={e.id} className="flex gap-1 group text-xs items-center"><Input className="h-8 text-xs w-16" placeholder="Name" value={e.name} onChange={(ev) => updateOffSite({ executiveAccounts: (contextData.offSite.executiveAccounts || []).map((x: ExecutiveAccount) => x.id === e.id ? { ...x, name: ev.target.value } : x) })} /><Input className="h-8 text-xs flex-1" placeholder="X URL" value={e.xUrl || ''} onChange={(ev) => updateOffSite({ executiveAccounts: (contextData.offSite.executiveAccounts || []).map((x: ExecutiveAccount) => x.id === e.id ? { ...x, xUrl: ev.target.value } : x) })} /><Input className="h-8 text-xs flex-1" placeholder="LinkedIn URL" value={e.linkedinUrl || e.handle || ''} onChange={(ev) => updateOffSite({ executiveAccounts: (contextData.offSite.executiveAccounts || []).map((x: ExecutiveAccount) => x.id === e.id ? { ...x, linkedinUrl: ev.target.value, handle: ev.target.value } : x) })} /><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => updateOffSite({ executiveAccounts: (contextData.offSite.executiveAccounts || []).filter((x: ExecutiveAccount) => x.id !== e.id) })}><X className="h-3 w-3" /></Button></div>))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ===== ROW 1: Reviews & Community ===== */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Reviews & Listings */}
                      <div className="p-5 border rounded-xl bg-card/50 space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2"><Star className="h-4 w-4 text-muted-foreground" /> Reviews & Listings</h3>
                        {/* Reviews */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Reviews</Label><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOffSite({ reviewPlatforms: [...contextData.offSite.reviewPlatforms, { id: uuidv4(), platform: 'G2', profileUrl: '', fetchDetails: true }] })}><Plus className="h-3 w-3" /></Button></div>
                          <div className="space-y-1">
                            {contextData.offSite.reviewPlatforms.length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOffSite({ reviewPlatforms: [...contextData.offSite.reviewPlatforms, { id: uuidv4(), platform: 'G2', profileUrl: '', fetchDetails: true }] })}>Click + to add reviews</div>
                            ) : (
                              contextData.offSite.reviewPlatforms.map((r: ReviewPlatform) => (<div key={r.id} className="flex gap-1 group text-xs"><select className="h-8 w-24 rounded border px-1 text-xs" value={r.platform || ''} onChange={(e) => updateOffSite({ reviewPlatforms: contextData.offSite.reviewPlatforms.map((x: ReviewPlatform) => x.id === r.id ? { ...x, platform: e.target.value } : x) })}><option>G2</option><option>Capterra</option><option>TrustRadius</option><option>Trustpilot</option><option>Gartner</option><option>Glassdoor</option><option>Yelp</option><option>Product Hunt</option><option>Other</option></select><Input className="h-8 text-xs flex-1" placeholder="Profile URL" value={r.profileUrl} onChange={(e) => updateOffSite({ reviewPlatforms: contextData.offSite.reviewPlatforms.map((x: ReviewPlatform) => x.id === r.id ? { ...x, profileUrl: e.target.value } : x) })} /><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => updateOffSite({ reviewPlatforms: contextData.offSite.reviewPlatforms.filter((x: ReviewPlatform) => x.id !== r.id) })}><X className="h-3 w-3" /></Button></div>))
                            )}
                          </div>
                        </div>
                        {/* Directories */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Directories</Label><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOffSite({ directoryListings: [...(contextData.offSite.directoryListings || []), { id: uuidv4(), directoryName: '', listingUrl: '' }] })}><Plus className="h-3 w-3" /></Button></div>
                          <div className="space-y-1">
                            {(contextData.offSite.directoryListings || []).length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOffSite({ directoryListings: [...(contextData.offSite.directoryListings || []), { id: uuidv4(), directoryName: '', listingUrl: '' }] })}>Click + to add directories</div>
                            ) : (
                              (contextData.offSite.directoryListings || []).map((d: DirectoryListing) => (<div key={d.id} className="flex gap-1 group text-xs"><select className="h-8 w-24 rounded border px-1 text-xs" value={d.directoryName || ''} onChange={(e) => updateOffSite({ directoryListings: (contextData.offSite.directoryListings || []).map((x: DirectoryListing) => x.id === d.id ? { ...x, directoryName: e.target.value } : x) })}><option value="">Select...</option><option>Product Hunt</option><option>Crunchbase</option><option>AngelList</option><option>AlternativeTo</option><option>SaaSHub</option><option>SourceForge</option><option>Other</option></select><Input className="h-8 text-xs flex-1" placeholder="Listing URL" value={d.listingUrl} onChange={(e) => updateOffSite({ directoryListings: (contextData.offSite.directoryListings || []).map((x: DirectoryListing) => x.id === d.id ? { ...x, listingUrl: e.target.value } : x) })} /><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => updateOffSite({ directoryListings: (contextData.offSite.directoryListings || []).filter((x: DirectoryListing) => x.id !== d.id) })}><X className="h-3 w-3" /></Button></div>))
                            )}
                          </div>
                        </div>
                        {/* Storefronts */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Storefronts</Label><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOffSite({ ecommercePlatforms: [...contextData.offSite.ecommercePlatforms, { id: uuidv4(), platform: 'App Store', storeName: '', storeUrl: '', collectReviews: true, collectQA: false, collectRatings: true, collectSalesRank: false }] })}><Plus className="h-3 w-3" /></Button></div>
                          <div className="space-y-1">
                            {contextData.offSite.ecommercePlatforms.length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOffSite({ ecommercePlatforms: [...contextData.offSite.ecommercePlatforms, { id: uuidv4(), platform: 'App Store', storeName: '', storeUrl: '', collectReviews: true, collectQA: false, collectRatings: true, collectSalesRank: false }] })}>Click + to add storefronts</div>
                            ) : (
                              contextData.offSite.ecommercePlatforms.map((e: EcommercePlatform) => (<div key={e.id} className="flex gap-1 group text-xs"><select className="h-8 w-24 rounded border px-1 text-xs" value={e.platform || ''} onChange={(ev) => updateOffSite({ ecommercePlatforms: contextData.offSite.ecommercePlatforms.map((x: EcommercePlatform) => x.id === e.id ? { ...x, platform: ev.target.value } : x) })}><option>App Store</option><option>Google Play</option><option>Microsoft Store</option><option>Amazon</option><option>eBay</option><option>Etsy</option><option>Walmart</option><option>Other</option></select><Input className="h-8 text-xs flex-1" placeholder="Store URL" value={e.storeUrl} onChange={(ev) => updateOffSite({ ecommercePlatforms: contextData.offSite.ecommercePlatforms.map((x: EcommercePlatform) => x.id === e.id ? { ...x, storeUrl: ev.target.value } : x) })} /><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => updateOffSite({ ecommercePlatforms: contextData.offSite.ecommercePlatforms.filter((x: EcommercePlatform) => x.id !== e.id) })}><X className="h-3 w-3" /></Button></div>))
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Community */}
                      <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4 text-muted-foreground" /> Community</h3>
                        {/* Forums */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Forums</Label><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOffSite({ communities: [...contextData.offSite.communities, { id: uuidv4(), platformType: 'Reddit', communityName: '', url: '', tags: [] }] })}><Plus className="h-3 w-3" /></Button></div>
                          <div className="space-y-1">
                            {contextData.offSite.communities.length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOffSite({ communities: [...contextData.offSite.communities, { id: uuidv4(), platformType: 'Reddit', communityName: '', url: '', tags: [] }] })}>Click + to add forums</div>
                            ) : (
                              contextData.offSite.communities.map((c: CommunityForum) => (<div key={c.id} className="flex gap-1 group text-xs"><select className="h-8 w-20 rounded border px-1 text-xs" value={c.platformType || ''} onChange={(e) => updateOffSite({ communities: contextData.offSite.communities.map((x: CommunityForum) => x.id === c.id ? { ...x, platformType: e.target.value } : x) })}><option>Reddit</option><option>Discord</option><option>Slack</option><option>Telegram</option><option>GitHub</option><option>Other</option></select><Input className="h-8 text-xs flex-1" placeholder="Community URL" value={c.url} onChange={(e) => updateOffSite({ communities: contextData.offSite.communities.map((x: CommunityForum) => x.id === c.id ? { ...x, url: e.target.value } : x) })} /><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => updateOffSite({ communities: contextData.offSite.communities.filter((x: CommunityForum) => x.id !== c.id) })}><X className="h-3 w-3" /></Button></div>))
                            )}
                          </div>
                        </div>
                        {/* Q&A */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Q&A</Label><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOffSite({ qaPlatforms: [...contextData.offSite.qaPlatforms, { id: uuidv4(), platform: 'Stack Overflow', monitoringKeywords: [] }] })}><Plus className="h-3 w-3" /></Button></div>
                          <div className="space-y-1">
                            {contextData.offSite.qaPlatforms.length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOffSite({ qaPlatforms: [...contextData.offSite.qaPlatforms, { id: uuidv4(), platform: 'Stack Overflow', monitoringKeywords: [] }] })}>Click + to add Q&A</div>
                            ) : (
                              contextData.offSite.qaPlatforms.map((q: QAPlatform) => (<div key={q.id} className="flex gap-1 group text-xs"><select className="h-8 w-24 rounded border px-1 text-xs" value={q.platform || ''} onChange={(e) => updateOffSite({ qaPlatforms: contextData.offSite.qaPlatforms.map((x: QAPlatform) => x.id === q.id ? { ...x, platform: e.target.value } : x) })}><option>Stack Overflow</option><option>Quora</option><option>Reddit AMA</option><option>Other</option></select><Input className="h-8 text-xs flex-1" placeholder="Profile/Tag URL" value={(q as any).url || ''} onChange={(e) => updateOffSite({ qaPlatforms: contextData.offSite.qaPlatforms.map((x: QAPlatform) => x.id === q.id ? { ...x, url: e.target.value } as any : x) })} /><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => updateOffSite({ qaPlatforms: contextData.offSite.qaPlatforms.filter((x: QAPlatform) => x.id !== q.id) })}><X className="h-3 w-3" /></Button></div>))
                            )}
                          </div>
                        </div>
                        {/* Groups */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Groups</Label><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOffSite({ professionalNetworks: [...(contextData.offSite.professionalNetworks || []), { id: uuidv4(), platform: 'LinkedIn', groupName: '', url: '' }] })}><Plus className="h-3 w-3" /></Button></div>
                          <div className="space-y-1">
                            {(contextData.offSite.professionalNetworks || []).length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOffSite({ professionalNetworks: [...(contextData.offSite.professionalNetworks || []), { id: uuidv4(), platform: 'LinkedIn', groupName: '', url: '' }] })}>Click + to add groups</div>
                            ) : (
                              (contextData.offSite.professionalNetworks || []).map((p: ProfessionalNetwork) => (<div key={p.id} className="flex gap-1 group text-xs"><select className="h-8 w-24 rounded border px-1 text-xs" value={p.platform || ''} onChange={(e) => updateOffSite({ professionalNetworks: (contextData.offSite.professionalNetworks || []).map((x: ProfessionalNetwork) => x.id === p.id ? { ...x, platform: e.target.value } : x) })}><option>LinkedIn</option><option>Facebook</option><option>Slack</option><option>Other</option></select><Input className="h-8 text-xs flex-1" placeholder="Group URL" value={p.url} onChange={(e) => updateOffSite({ professionalNetworks: (contextData.offSite.professionalNetworks || []).map((x: ProfessionalNetwork) => x.id === p.id ? { ...x, url: e.target.value } : x) })} /><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => updateOffSite({ professionalNetworks: (contextData.offSite.professionalNetworks || []).filter((x: ProfessionalNetwork) => x.id !== p.id) })}><X className="h-3 w-3" /></Button></div>))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ===== ROW 2: Media & KOLs ===== */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Media */}
                      <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2"><Newspaper className="h-4 w-4 text-muted-foreground" /> Media</h3>
                        {/* Channels */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Channels</Label><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOffSite({ mediaSources: [...contextData.offSite.mediaSources, { id: uuidv4(), name: '', type: 'news', url: '' }] })}><Plus className="h-3 w-3" /></Button></div>
                          <div className="space-y-1">
                            {contextData.offSite.mediaSources.length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOffSite({ mediaSources: [...contextData.offSite.mediaSources, { id: uuidv4(), name: '', type: 'news', url: '' }] })}>Click + to add channels</div>
                            ) : (
                              contextData.offSite.mediaSources.map((m: MediaSource) => (<div key={m.id} className="flex gap-1 group text-xs"><select className="h-8 w-20 rounded border px-1 text-xs" value={m.type || ''} onChange={(e) => updateOffSite({ mediaSources: contextData.offSite.mediaSources.map((x: MediaSource) => x.id === m.id ? { ...x, type: e.target.value as any } : x) })}><option value="news">News</option><option value="blog">Blog</option><option value="podcast">Podcast</option><option value="newsletter">Newsletter</option><option value="youtube">YouTube</option><option value="other">Other</option></select><Input className="h-8 text-xs flex-1" placeholder="Channel URL" value={m.url} onChange={(e) => updateOffSite({ mediaSources: contextData.offSite.mediaSources.map((x: MediaSource) => x.id === m.id ? { ...x, url: e.target.value } : x) })} /><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => updateOffSite({ mediaSources: contextData.offSite.mediaSources.filter((x: MediaSource) => x.id !== m.id) })}><X className="h-3 w-3" /></Button></div>))
                            )}
                          </div>
                        </div>
                        {/* Coverage */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Coverage</Label><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOffSite({ backlinks: [...(contextData.offSite.backlinks || []), { id: uuidv4(), domain: '', type: 'editorial', doFollow: true }] })}><Plus className="h-3 w-3" /></Button></div>
                          <div className="space-y-1">
                            {(contextData.offSite.backlinks || []).length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOffSite({ backlinks: [...(contextData.offSite.backlinks || []), { id: uuidv4(), domain: '', type: 'editorial', doFollow: true }] })}>Click + to add coverage</div>
                            ) : (
                              (contextData.offSite.backlinks || []).map((b: BacklinkSource) => (<div key={b.id} className="flex gap-1 group text-xs"><select className="h-8 w-20 rounded border px-1 text-xs" value={b.type || ''} onChange={(e) => updateOffSite({ backlinks: (contextData.offSite.backlinks || []).map((x: BacklinkSource) => x.id === b.id ? { ...x, type: e.target.value as any } : x) })}><option value="editorial">Article</option><option value="feature">Feature</option><option value="interview">Interview</option><option value="guest_post">Guest Post</option><option value="review">Review</option><option value="mention">Mention</option><option value="other">Other</option></select><Input className="h-8 text-xs flex-1" placeholder="Post URL" value={b.pageUrl || b.domain} onChange={(e) => updateOffSite({ backlinks: (contextData.offSite.backlinks || []).map((x: BacklinkSource) => x.id === b.id ? { ...x, pageUrl: e.target.value, domain: e.target.value } : x) })} /><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => updateOffSite({ backlinks: (contextData.offSite.backlinks || []).filter((x: BacklinkSource) => x.id !== b.id) })}><X className="h-3 w-3" /></Button></div>))
                            )}
                          </div>
                        </div>
                        {/* Events */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Events</Label><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOffSite({ externalEvents: [...(contextData.offSite.externalEvents || []), { id: uuidv4(), name: '', type: 'conference', role: 'speaker' }] })}><Plus className="h-3 w-3" /></Button></div>
                          <div className="space-y-1">
                            {(contextData.offSite.externalEvents || []).length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOffSite({ externalEvents: [...(contextData.offSite.externalEvents || []), { id: uuidv4(), name: '', type: 'conference', role: 'speaker' }] })}>Click + to add events</div>
                            ) : (
                              (contextData.offSite.externalEvents || []).map((ev: ExternalEvent) => (<div key={ev.id} className="flex gap-1 group text-xs"><select className="h-8 w-20 rounded border px-1 text-xs" value={ev.type} onChange={(e) => updateOffSite({ externalEvents: (contextData.offSite.externalEvents || []).map((x: ExternalEvent) => x.id === ev.id ? { ...x, type: e.target.value as any } : x) })}><option value="conference">Conference</option><option value="summit">Summit</option><option value="webinar">Webinar</option><option value="podcast_appearance">Podcast</option><option value="workshop">Workshop</option><option value="meetup">Meetup</option><option value="award">Award</option><option value="other">Other</option></select><Input className="h-8 text-xs flex-1" placeholder="Event URL" value={ev.url || ''} onChange={(e) => updateOffSite({ externalEvents: (contextData.offSite.externalEvents || []).map((x: ExternalEvent) => x.id === ev.id ? { ...x, url: e.target.value } : x) })} /><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => updateOffSite({ externalEvents: (contextData.offSite.externalEvents || []).filter((x: ExternalEvent) => x.id !== ev.id) })}><X className="h-3 w-3" /></Button></div>))
                            )}
                          </div>
                        </div>
                      </div>
                      {/* KOLs */}
                      <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> KOLs</h3>
                        {/* Creators */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Creators</Label><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOffSite({ influencerAccounts: [...contextData.offSite.influencerAccounts, { id: uuidv4(), name: '', platform: 'YouTube', url: '', role: 'kol', tier: '2' }] })}><Plus className="h-3 w-3" /></Button></div>
                          <div className="space-y-1">
                            {contextData.offSite.influencerAccounts.filter((i: InfluencerAccount) => i.role === 'kol').length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOffSite({ influencerAccounts: [...contextData.offSite.influencerAccounts, { id: uuidv4(), name: '', platform: 'YouTube', url: '', role: 'kol', tier: '2' }] })}>Click + to add creators</div>
                            ) : (
                              contextData.offSite.influencerAccounts.filter((i: InfluencerAccount) => i.role === 'kol').map((i: InfluencerAccount) => (<div key={i.id} className="flex gap-1 group text-xs items-center"><select className="h-8 w-20 rounded border px-1 text-xs" value={i.platform} onChange={(e) => updateOffSite({ influencerAccounts: contextData.offSite.influencerAccounts.map((x: InfluencerAccount) => x.id === i.id ? { ...x, platform: e.target.value } : x) })}><option>YouTube</option><option>TikTok</option><option>Instagram</option><option>X</option><option>Twitch</option><option>Substack</option><option>Other</option></select><Input className="h-8 text-xs flex-1" placeholder="Profile URL" value={i.url} onChange={(e) => updateOffSite({ influencerAccounts: contextData.offSite.influencerAccounts.map((x: InfluencerAccount) => x.id === i.id ? { ...x, url: e.target.value } : x) })} /><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => updateOffSite({ influencerAccounts: contextData.offSite.influencerAccounts.filter((x: InfluencerAccount) => x.id !== i.id) })}><X className="h-3 w-3" /></Button></div>))
                            )}
                          </div>
                        </div>
                        {/* Experts */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Experts</Label><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOffSite({ influencerAccounts: [...contextData.offSite.influencerAccounts, { id: uuidv4(), name: '', platform: 'Analyst', url: '', role: 'analyst', tier: '2' }] })}><Plus className="h-3 w-3" /></Button></div>
                          <div className="space-y-1">
                            {contextData.offSite.influencerAccounts.filter((i: InfluencerAccount) => i.role === 'analyst').length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOffSite({ influencerAccounts: [...contextData.offSite.influencerAccounts, { id: uuidv4(), name: '', platform: 'Analyst', url: '', role: 'analyst', tier: '2' }] })}>Click + to add experts</div>
                            ) : (
                              contextData.offSite.influencerAccounts.filter((i: InfluencerAccount) => i.role === 'analyst').map((i: InfluencerAccount) => (<div key={i.id} className="flex gap-1 group text-xs items-center"><select className="h-8 w-20 rounded border px-1 text-xs" value={i.platform} onChange={(e) => updateOffSite({ influencerAccounts: contextData.offSite.influencerAccounts.map((x: InfluencerAccount) => x.id === i.id ? { ...x, platform: e.target.value } : x) })}><option>Analyst</option><option>Consultant</option><option>Speaker</option><option>Author</option><option>Researcher</option><option>Other</option></select><Input className="h-8 text-xs flex-1" placeholder="Profile URL" value={i.url} onChange={(e) => updateOffSite({ influencerAccounts: contextData.offSite.influencerAccounts.map((x: InfluencerAccount) => x.id === i.id ? { ...x, url: e.target.value } : x) })} /><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => updateOffSite({ influencerAccounts: contextData.offSite.influencerAccounts.filter((x: InfluencerAccount) => x.id !== i.id) })}><X className="h-3 w-3" /></Button></div>))
                            )}
                          </div>
                        </div>
                        {/* Press */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Press</Label><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateOffSite({ influencerAccounts: [...contextData.offSite.influencerAccounts, { id: uuidv4(), name: '', platform: 'Journalist', url: '', role: 'media', tier: '2' }] })}><Plus className="h-3 w-3" /></Button></div>
                          <div className="space-y-1">
                            {contextData.offSite.influencerAccounts.filter((i: InfluencerAccount) => i.role === 'journalist' || i.role === 'media').length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent/50" onClick={() => updateOffSite({ influencerAccounts: [...contextData.offSite.influencerAccounts, { id: uuidv4(), name: '', platform: 'Journalist', url: '', role: 'media', tier: '2' }] })}>Click + to add press</div>
                            ) : (
                              contextData.offSite.influencerAccounts.filter((i: InfluencerAccount) => i.role === 'journalist' || i.role === 'media').map((i: InfluencerAccount) => (<div key={i.id} className="flex gap-1 group text-xs items-center"><select className="h-8 w-20 rounded border px-1 text-xs" value={i.platform} onChange={(e) => updateOffSite({ influencerAccounts: contextData.offSite.influencerAccounts.map((x: InfluencerAccount) => x.id === i.id ? { ...x, platform: e.target.value } : x) })}><option>Journalist</option><option>Editor</option><option>Columnist</option><option>Blogger</option><option>Podcaster</option><option>Other</option></select><Input className="h-8 text-xs flex-1" placeholder="Profile URL" value={i.url} onChange={(e) => updateOffSite({ influencerAccounts: contextData.offSite.influencerAccounts.map((x: InfluencerAccount) => x.id === i.id ? { ...x, url: e.target.value } : x) })} /><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => updateOffSite({ influencerAccounts: contextData.offSite.influencerAccounts.filter((x: InfluencerAccount) => x.id !== i.id) })}><X className="h-3 w-3" /></Button></div>))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </TabsContent>

              {/* Knowledge Tab - NotebookLM Style */}
              <TabsContent value="knowledge" className="p-8 m-0 h-full overflow-y-auto">
                <div className="space-y-7 pb-12">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" /> Knowledge Base
                        <span className="text-sm font-normal text-muted-foreground">({(contextData.knowledge.sources || []).length}/{contextData.knowledge.sourceLimit || 50})</span>
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add files, links, and notes to give the agent deeper context about your business.
                      </p>
                    </div>
                  </div>
                  {/* Upload Zone */}
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-10 text-center hover:border-primary/50 hover:bg-accent/30 transition-all cursor-pointer"
                    onClick={() => {
                      // Trigger file input - placeholder for now
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = '.pdf,.txt,.md,.doc,.docx,.csv,.mp3,.wav,.png,.jpg,.jpeg,.webp,.mp4,.webm';
                      input.onchange = (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (files) {
                          Array.from(files).forEach(file => {
                            const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
                            const newSource = {
                              id: uuidv4(),
                              title: file.name,
                              type: 'uploaded' as const,
                              sourceType: fileExt as any,
                              addedAt: new Date().toISOString(),
                              category: 'internal_doc' as const,
                            };
                            updateKnowledge({ sources: [...(contextData.knowledge.sources || []), newSource] });
                          });
                        }
                      };
                      input.click();
                    }}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Upload sources</p>
                        <p className="text-sm text-muted-foreground">Drag & drop or <span className="text-primary underline">choose file</span> to upload</p>
                      </div>
                      <p className="text-xs text-muted-foreground/70 mt-2">
                        Supported: PDF, TXT, MD, DOCX, XLSX, PPTX, CSV, JSON, HTML, XML, RTF, PNG, JPG, GIF, WEBP, MP3, MP4, WAV, WEBM
                      </p>
                    </div>
                  </div>

                  {/* Quick Add Methods */}
                  <div className="grid grid-cols-4 gap-5">
                    {/* Link Button */}
                    <div className="border rounded-xl p-5 bg-card/50 hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => {
                        const url = prompt('Enter URL (webpage, YouTube, GitHub, or Google Scholar):');
                        if (url) {
                          let sourceType: 'webpage' | 'youtube' | 'github' | 'google_scholar' = 'webpage';
                          if (url.includes('youtube.com') || url.includes('youtu.be')) {
                            sourceType = 'youtube';
                          } else if (url.includes('github.com')) {
                            sourceType = 'github';
                          } else if (url.includes('scholar.google')) {
                            sourceType = 'google_scholar';
                          }
                          const newSource = {
                            id: uuidv4(),
                            title: url.length > 50 ? url.substring(0, 50) + '...' : url,
                            type: 'linked' as const,
                            sourceType: sourceType,
                            url: url,
                            addedAt: new Date().toISOString(),
                          };
                          updateKnowledge({ sources: [...(contextData.knowledge.sources || []), newSource] });
                        }
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-5 w-5 text-muted-foreground" />
                          <p className="font-medium text-sm">Link</p>
                        </div>
                        <p className="text-xs text-muted-foreground">e.g., Webpage, YouTube, GitHub, Scholar...</p>
                      </div>
                    </div>

                    {/* Paste Button */}
                    <div className="border rounded-xl p-5 bg-card/50 hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => {
                        const pasteType = prompt('Paste type (plain_text / markdown / rich_text / code):');
                        if (pasteType && ['plain_text', 'markdown', 'rich_text', 'code'].includes(pasteType.toLowerCase().replace(' ', '_'))) {
                          const text = prompt('Paste your content:');
                          if (text) {
                            const newSource = {
                              id: uuidv4(),
                              title: text.length > 40 ? text.substring(0, 40) + '...' : text,
                              type: 'pasted' as const,
                              sourceType: pasteType.toLowerCase().replace(' ', '_') as any,
                              content: text,
                              addedAt: new Date().toISOString(),
                            };
                            updateKnowledge({ sources: [...(contextData.knowledge.sources || []), newSource] });
                          }
                        }
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <p className="font-medium text-sm">Paste</p>
                        </div>
                        <p className="text-xs text-muted-foreground">e.g., Plain Text, Rich Text, Markdown, Code...</p>
                      </div>
                    </div>

                    {/* Cloud & Notes Button */}
                    <div className="border rounded-xl p-5 bg-card/50 hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => {
                        const service = prompt('Enter service (google_drive / onedrive / notion / obsidian):');
                        if (service && ['google_drive', 'onedrive', 'notion', 'obsidian'].includes(service.toLowerCase().replace(' ', '_'))) {
                          const url = prompt(`Enter ${service} file or page URL:`);
                          if (url) {
                            const newSource = {
                              id: uuidv4(),
                              title: url.length > 50 ? url.substring(0, 50) + '...' : url,
                              type: 'imported' as const,
                              sourceType: service.toLowerCase().replace(' ', '_') as any,
                              url: url,
                              addedAt: new Date().toISOString(),
                            };
                            updateKnowledge({ sources: [...(contextData.knowledge.sources || []), newSource] });
                          }
                        }
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Cloud className="h-5 w-5 text-muted-foreground" />
                          <p className="font-medium text-sm">Cloud & Notes</p>
                        </div>
                        <p className="text-xs text-muted-foreground">e.g., Google Drive, OneDrive, Notion, Obsidian...</p>
                      </div>
                    </div>

                    {/* Saved Artifacts Button */}
                    <div className="border rounded-xl p-5 bg-card/50 hover:bg-accent/30 transition-colors cursor-pointer opacity-60"
                      title="Saved artifacts from agent research will appear here"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Save className="h-5 w-5 text-muted-foreground" />
                          <p className="font-medium text-sm">Saved Artifacts</p>
                        </div>
                        <p className="text-xs text-muted-foreground">e.g., Competitors, FAQs, Keywords, Sitemap...</p>
                      </div>
                    </div>
                  </div>

                  {/* Source Cards - Kanban Layout */}
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground">Added Sources</Label>
                    <div className="grid grid-cols-5 gap-4">
                      {/* Uploaded Column */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Upload className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium">Uploaded</span>
                          <span className="text-xs text-muted-foreground">({(contextData.knowledge.sources || []).filter((s: any) => s.type === 'uploaded').length})</span>
                        </div>
                        <div className="space-y-1">
                          {(contextData.knowledge.sources || []).filter((s: any) => s.type === 'uploaded').length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-2">No uploaded files</p>
                          ) : (contextData.knowledge.sources || []).filter((s: any) => s.type === 'uploaded').map((source: any) => (
                            <div key={source.id} className="group flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/30 transition-colors">
                              <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono shrink-0">.{source.sourceType || 'file'}</span>
                              <span className="text-xs truncate flex-1" title={source.title}>{source.title}</span>
                              <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={() => updateKnowledge({ sources: (contextData.knowledge.sources || []).filter((s: any) => s.id !== source.id) })}>
                                <X className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Linked Column */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Link2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">Linked</span>
                          <span className="text-xs text-muted-foreground">({(contextData.knowledge.sources || []).filter((s: any) => s.type === 'linked').length})</span>
                        </div>
                        <div className="space-y-1">
                          {(contextData.knowledge.sources || []).filter((s: any) => s.type === 'linked').length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-2">No linked URLs</p>
                          ) : (contextData.knowledge.sources || []).filter((s: any) => s.type === 'linked').map((source: any) => (
                            <div key={source.id} className="group flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/30 transition-colors">
                              <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono shrink-0">{source.sourceType || 'link'}</span>
                              <span className="text-xs truncate flex-1" title={source.title}>{source.title}</span>
                              <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={() => updateKnowledge({ sources: (contextData.knowledge.sources || []).filter((s: any) => s.id !== source.id) })}>
                                <X className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pasted Column */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">Pasted</span>
                          <span className="text-xs text-muted-foreground">({(contextData.knowledge.sources || []).filter((s: any) => s.type === 'pasted').length})</span>
                        </div>
                        <div className="space-y-1">
                          {(contextData.knowledge.sources || []).filter((s: any) => s.type === 'pasted').length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-2">No pasted content</p>
                          ) : (contextData.knowledge.sources || []).filter((s: any) => s.type === 'pasted').map((source: any) => (
                            <div key={source.id} className="group flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/30 transition-colors">
                              <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono shrink-0">{source.sourceType || 'txt'}</span>
                              <span className="text-xs truncate flex-1" title={source.title}>{source.title}</span>
                              <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={() => updateKnowledge({ sources: (contextData.knowledge.sources || []).filter((s: any) => s.id !== source.id) })}>
                                <X className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Imported Column */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Cloud className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">Imported</span>
                          <span className="text-xs text-muted-foreground">({(contextData.knowledge.sources || []).filter((s: any) => s.type === 'imported').length})</span>
                        </div>
                        <div className="space-y-1">
                          {(contextData.knowledge.sources || []).filter((s: any) => s.type === 'imported').length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-2">No cloud imports</p>
                          ) : (contextData.knowledge.sources || []).filter((s: any) => s.type === 'imported').map((source: any) => (
                            <div key={source.id} className="group flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/30 transition-colors">
                              <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono shrink-0">{source.sourceType || 'cloud'}</span>
                              <span className="text-xs truncate flex-1" title={source.title}>{source.title}</span>
                              <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={() => updateKnowledge({ sources: (contextData.knowledge.sources || []).filter((s: any) => s.id !== source.id) })}>
                                <X className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Saved Column */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Save className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">Saved</span>
                          <span className="text-xs text-muted-foreground">({(contextData.knowledge.sources || []).filter((s: any) => s.type === 'saved').length})</span>
                        </div>
                        <div className="space-y-1">
                          {(contextData.knowledge.sources || []).filter((s: any) => s.type === 'saved').length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 py-2">No saved artifacts</p>
                          ) : (contextData.knowledge.sources || []).filter((s: any) => s.type === 'saved').map((source: any) => (
                            <div key={source.id} className="group flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/30 transition-colors">
                              <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono shrink-0">{source.sourceType || 'saved'}</span>
                              <span className="text-xs truncate flex-1" title={source.title}>{source.title}</span>
                              <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={() => updateKnowledge({ sources: (contextData.knowledge.sources || []).filter((s: any) => s.id !== source.id) })}>
                                <X className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>


                </div>
              </TabsContent>
              </>
              )}
            </div>
          </Tabs >
        </div >

        <DialogFooter className="pt-4 border-t shrink-0 px-6 py-4 bg-muted/30">
        </DialogFooter>
      </DialogContent >
    </Dialog >
    </>
  );
}

