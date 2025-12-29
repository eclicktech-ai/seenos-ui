"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type {
  ContextItem,
  ContextPerson,
  ContextEntity,
  ContextItemCreate,
  ContextPersonCreate,
  ContextEntityCreate,
} from "@/lib/api/client";
import type { SectionConfig } from "@/lib/context/section-mapping";
import {
  BrandAssetsForm,
  HeroHeadlineForm,
  HeroSubheadlineForm,
  ProblemStatementForm,
  WhoWeServeForm,
  AboutUsForm,
  ContactInfoForm,
  FAQForm,
  CreatorsForm,
  CoverageForm,
  ProductsServicesForm,
  LandingPagesForm,
  SimpleItemListForm,
  PlatformSelectForm,
  DualFieldForm,
  MonitoringScopeForm,
} from "@/app/components/context-forms";

interface ContextEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SectionConfig | null;
  onSuccess?: () => void;
}

export function ContextEditDialog({
  open,
  onOpenChange,
  config,
  onSuccess,
}: ContextEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    onConfirm: () => {},
  });



  
  // Singleton state
  const [singletonData, setSingletonData] = useState<Record<string, any>>({});
  const [singletonVersion, setSingletonVersion] = useState<number>(1);
  const [singletonJsonText, setSingletonJsonText] = useState<string>("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Items/Persons/Entities state
  const [items, setItems] = useState<
    (ContextItem | ContextPerson | ContextEntity)[]
  >([]);
  const [editingItem, setEditingItem] = useState<
    (ContextItem | ContextPerson | ContextEntity) | null
  >(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state for creating/editing
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Track modified items that need saving
  const [dirtyItems, setDirtyItems] = useState<Set<string>>(new Set());
  
  // Track pending operations (create/delete)
  const [pendingCreations, setPendingCreations] = useState<(ContextItem | ContextPerson | ContextEntity)[]>([]);
  const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set());

  // Load data when dialog opens
  useEffect(() => {
    if (open && config) {
      loadData();
    } else if (!open) {
      // Reset state when closing
      setSingletonData({});
      setSingletonJsonText("{}");
      setJsonError(null);
      setItems([]);
      setEditingItem(null);
      setIsCreating(false);
      setFormData({});
      setDirtyItems(new Set());
      setPendingCreations([]);
      setPendingDeletions(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, config]);

  // Update JSON text when singleton data changes (only for fallback JSON editor)
  useEffect(() => {
    if (config?.dataType === "singleton") {
      // Only update JSON text for sections that use JSON editor (unknown sections)
      // Known sections have their own form components, so they don't need JSON editor
      const knownSections = [
        "brand_assets",
        "hero_headline",
        "hero_subheadline",
        "problem_statement",
        "who_we_serve",
        "about_us",
        "contact_info",
        "monitoring_scope",
      ];
      // Only update JSON text for unknown sections that will use JSON editor
      if (!knownSections.includes(config.section)) {
        setSingletonJsonText(JSON.stringify(singletonData, null, 2));
      }
    }
  }, [singletonData, config]);

  // ============ Helpers ============
  // Helper to ensure social links have unique IDs
  const ensureSocialLinkId = (link: any): any => {
    if (link.id) return link;
    return { ...link, id: `social-link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
  };

  // Helper to strip IDs from social links before sending to API
  const stripSocialLinkIds = (links: any[]): any[] => {
    return (links || []).map((link: any) => {
      const { id: _id, ...linkWithoutId } = link;
      return linkWithoutId;
    });
  };

  // 兼容后端返回 camelCase / snake_case 字段，确保表单能正常回填
  const normalizeContextPerson = (p: any): ContextPerson => {
    const socialLinksRaw = p?.social_links ?? p?.socialLinks ?? [];
    const social_links = Array.isArray(socialLinksRaw)
      ? socialLinksRaw
          .map((x: any) => ({
            id: x?.id || `social-link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            platform: x?.platform ?? x?.Platform ?? "",
            url: x?.url ?? x?.URL ?? "",
          }))
          .filter((x: any) => x.platform || x.url)
      : [];

    return {
      id: p.id,
      user_id: p.user_id ?? p.userId ?? "",
      category: p.category,
      section: p.section,
      name: p.name ?? "",
      title: p.title ?? null,
      bio: p.bio ?? null,
      photo_url: p.photo_url ?? p.photoUrl ?? null,
      platform: p.platform ?? null,
      handle: p.handle ?? null,
      url: p.url ?? null,
      role: p.role ?? null,
      social_links,
      notes: p.notes ?? null,
      extra: p.extra ?? {},
      sequence: p.sequence ?? 0,
      version: p.version ?? 1,
      created_at: p.created_at ?? p.createdAt ?? new Date().toISOString(),
      updated_at: p.updated_at ?? p.updatedAt ?? new Date().toISOString(),
      deleted_at: p.deleted_at ?? p.deletedAt ?? null,
    };
  };

  // ============ Singleton Normalizers (UI <-> API) ============
  // Helper function to get field value from multiple possible paths (supports camelCase, snake_case, nested, flat)
  const getFieldValue = (obj: any, paths: string[]): string => {
    for (const path of paths) {
      const parts = path.split('.');
      let value: any = obj;
      for (const part of parts) {
        if (value == null) break;
        value = value[part];
      }
      if (value != null && value !== "") {
        return String(value);
      }
    }
    return "";
  };

  const toUiBrandAssets = (raw: any) => {
    // Accept both the "flat" shape (from context/all) and the nested UI shape.
    // context/all example:
    // { brandName: "SeoPage.ai", brandSubtitle: "...", metaDescription: "...", logoUrl: "...", primaryColor: "...", secondaryColor: "...", toneOfVoice: "..." }
    const brandNameRaw = raw?.brandName;
    const brandSubtitleRaw = raw?.brandSubtitle;
    const brandNameObj =
      typeof brandNameRaw === "string"
        ? { name: brandNameRaw, subtitle: typeof brandSubtitleRaw === "string" ? brandSubtitleRaw : "" }
        : (brandNameRaw && typeof brandNameRaw === "object")
          ? { name: brandNameRaw.name || "", subtitle: brandNameRaw.subtitle || "" }
          : { name: "", subtitle: typeof brandSubtitleRaw === "string" ? brandSubtitleRaw : "" };

    return {
      // nested UI shape
      brandName: brandNameObj,
      metaDescription: getFieldValue(raw, ["metaDescription", "meta_description"]),
      images: {
        ogImage: getFieldValue(raw, ["images.ogImage", "images.og_image", "ogImage", "og_image"]),
        favicon: getFieldValue(raw, ["images.favicon", "favicon", "faviconUrl", "favicon_url"]),
      },
      logos: {
        fullLogoLight: getFieldValue(raw, ["logos.fullLogoLight", "logos.full_logo_light", "logoUrl", "logo_url"]),
        fullLogoDark: getFieldValue(raw, ["logos.fullLogoDark", "logos.full_logo_dark", "logoUrlDark", "logo_url_dark"]),
        iconOnlyLight: getFieldValue(raw, ["logos.iconOnlyLight", "logos.icon_only_light", "iconUrl", "icon_url"]),
        iconOnlyDark: getFieldValue(raw, ["logos.iconOnlyDark", "logos.icon_only_dark", "iconUrlDark", "icon_url_dark"]),
      },
      colors: {
        primaryLight: getFieldValue(raw, ["colors.primaryLight", "colors.primary_light", "primaryColor", "primary_color", "colors.primary"]),
        primaryDark: getFieldValue(raw, ["colors.primaryDark", "colors.primary_dark"]),
        secondaryLight: getFieldValue(raw, ["colors.secondaryLight", "colors.secondary_light", "secondaryColor", "secondary_color", "colors.secondary"]),
        secondaryDark: getFieldValue(raw, ["colors.secondaryDark", "colors.secondary_dark"]),
      },
      typography: {
        heading: getFieldValue(raw, ["typography.heading", "typography.heading_font", "headingFont", "heading_font", "typography.fontFamily"]),
        body: getFieldValue(raw, ["typography.body", "typography.body_font", "bodyFont", "body_font", "typography.bodyFont"]),
      },
      tone: getFieldValue(raw, ["tone", "toneOfVoice", "tone_of_voice"]),
      languages: getFieldValue(raw, ["languages", "supportedLanguages", "supported_languages"]),
    };
  };

  const toApiBrandAssets = (ui: any) => {
    // Convert UI nested shape back to the "flat" shape the backend currently emits in /context/all,
    // while still keeping extra nested fields for forward compatibility.
    const payload: any = {
      brandName: ui?.brandName?.name ?? "",
      brandSubtitle: ui?.brandName?.subtitle ?? "",
      metaDescription: ui?.metaDescription ?? "",
      logoUrl: ui?.logos?.fullLogoLight ?? "",
      primaryColor: ui?.colors?.primaryLight ?? "",
      secondaryColor: ui?.colors?.secondaryLight ?? "",
      toneOfVoice: ui?.tone ?? "",
      // preserve richer fields too (backend stores JSON, so this is safe)
      images: ui?.images ?? {},
      logos: ui?.logos ?? {},
      colors: ui?.colors ?? {},
      typography: ui?.typography ?? {},
      languages: ui?.languages ?? "",
    };

    // Drop empty strings to keep payload tidy
    Object.keys(payload).forEach((k) => {
      const v = payload[k];
      if (v === "") delete payload[k];
    });

    return payload;
  };

  const toApiSingletonData = (section: string, ui: any) => {
    switch (section) {
      case "problem_statement": {
        // Convert object array to string array format that backend expects
        // UI format: { painPoints: [{ title: "...", description: "..." }] }
        // API format: { painPoints: ["...", "..."] } or { painPoints: [{ title: "..." }] }
        const painPoints = ui?.painPoints || [];
        return {
          painPoints: painPoints.map((pp: any) => {
            // If backend accepts string format, convert to string
            // Otherwise keep as object
            return typeof pp === "string" ? pp : (pp?.title || "");
          }),
        };
      }
      case "who_we_serve": {
        // Convert object array to string array format that backend expects
        // UI format: { targetAudiences: [{ name: "...", description: "..." }] }
        // API format: { targetAudiences: ["...", "..."] }
        const targetAudiences = ui?.targetAudiences || [];
        return {
          targetAudiences: targetAudiences.map((ta: any) => {
            // If backend accepts string format, convert to string
            // Otherwise keep as object
            return typeof ta === "string" ? ta : (ta?.name || "");
          }),
        };
      }
      default:
        return ui;
    }
  };

  const toUiSingletonData = (section: string, raw: any) => {
    switch (section) {
      case "brand_assets":
        return toUiBrandAssets(raw);
      case "hero_headline":
        // raw may be hero_section
        return { headline: raw?.headline ?? "" };
      case "hero_subheadline":
        // raw may be hero_section
        return { subheadline: raw?.subheadline ?? "" };
      case "problem_statement": {
        // Convert raw data to UI format, handling both camelCase and snake_case
        // Support both string array format: ["item1", "item2"] 
        // and object array format: [{ title: "item1" }, { title: "item2" }]
        const painPointsRaw = raw?.painPoints || raw?.pain_points || [];
        return {
          painPoints: Array.isArray(painPointsRaw)
            ? painPointsRaw.map((pp: any) => {
                // If it's a string, convert to object format
                if (typeof pp === "string") {
                  return { title: pp, description: "" };
                }
                // If it's already an object, use it directly
                return {
                  title: pp?.title || pp?.name || "",
                  description: pp?.description || "",
                };
              })
            : [],
        };
      }
      case "who_we_serve": {
        // Convert raw data to UI format, handling both camelCase and snake_case
        // Support both string array format: ["item1", "item2"] 
        // and object array format: [{ name: "item1" }, { name: "item2" }]
        const targetAudiencesRaw = raw?.targetAudiences || raw?.target_audiences || [];
        return {
          targetAudiences: Array.isArray(targetAudiencesRaw)
            ? targetAudiencesRaw.map((ta: any) => {
                // If it's a string, convert to object format
                if (typeof ta === "string") {
                  return { name: ta, description: "" };
                }
                // If it's already an object, use it directly
                return {
                  name: ta?.name || "",
                  description: ta?.description || "",
                };
              })
            : [],
        };
      }
      default:
        return raw || {};
    }
  };

  const normalizeContextEntity = (e: any): ContextEntity => {
    return {
      id: e.id,
      user_id: e.user_id ?? e.userId ?? "",
      category: e.category,
      section: e.section,
      name: e.name ?? "",
      platform: e.platform ?? null,
      handle: e.handle ?? null,
      url: e.url ?? null,
      entity_type: e.entity_type ?? e.entityType ?? null,
      event_date: e.event_date ?? e.eventDate ?? null,
      location: e.location ?? null,
      notes: e.notes ?? null,
      extra: e.extra ?? {},
      sequence: e.sequence ?? 0,
      version: e.version ?? 1,
      created_at: e.created_at ?? e.createdAt ?? new Date().toISOString(),
      updated_at: e.updated_at ?? e.updatedAt ?? new Date().toISOString(),
      deleted_at: e.deleted_at ?? e.deletedAt ?? null,
    };
  };

  const inferSocialPlatform = (url: string): string | null => {
    const u = (url || "").toLowerCase();
    if (!u) return null;
    if (u.includes("x.com/") || u.includes("twitter.com/")) return "X";
    if (u.includes("linkedin.com/")) return "LinkedIn";
    if (u.includes("facebook.com/")) return "Facebook";
    if (u.includes("instagram.com/")) return "Instagram";
    if (u.includes("youtube.com/") || u.includes("youtu.be/")) return "YouTube";
    if (u.includes("tiktok.com/")) return "TikTok";
    if (u.includes("threads.net/")) return "Threads";
    if (u.includes("pinterest.")) return "Pinterest";
    if (u.includes("producthunt.com/") || u.includes("producthunt")) return "Product Hunt";
    if (u.includes("openhunts.com/") || u.includes("openhunts")) return "OpenHunts";
    if (u.includes("github.com/")) return "GitHub";
    if (u.includes("reddit.com/")) return "Reddit";
    if (u.includes("discord.gg/") || u.includes("discord.com/")) return "Discord";
    return "Other";
  };

  const normalizeSocialProfilesEntities = (entities: ContextEntity[]): ContextEntity[] => {
    const platformOrder = [
      "X",
      "LinkedIn",
      "Facebook",
      "Instagram",
      "YouTube",
      "TikTok",
      "Threads",
      "Pinterest",
      "Product Hunt",
      "OpenHunts",
      "GitHub",
      "Reddit",
      "Discord",
      "Other",
    ];
    const allowed = new Set(platformOrder);

    const canonicalizeUrl = (url: string | null) =>
      (url || "")
        .trim()
        .replace(/\/+$/, "")
        .toLowerCase();

    // 1) normalize platform + name
    const normalized = entities.map((e) => {
      const url = e.url || "";
      const inferred = inferSocialPlatform(url);
      const current = (e.platform || e.name || "").trim();
      const platform = allowed.has(current) ? current : inferred || "Other";

      return {
        ...e,
        platform,
        // 如果 name 是空，默认用 platform（避免左侧是空的下拉）
        name: e.name || platform,
      };
    });

    // 2) dedupe by url (keep first)
    const seen = new Set<string>();
    const deduped: ContextEntity[] = [];
    for (const e of normalized) {
      const key = canonicalizeUrl(e.url);
      if (!key) {
        deduped.push(e);
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(e);
    }

    // 3) sort
    deduped.sort((a, b) => {
      const ai = platformOrder.indexOf(a.platform || "Other");
      const bi = platformOrder.indexOf(b.platform || "Other");
      if (ai !== bi) return ai - bi;
      return canonicalizeUrl(a.url).localeCompare(canonicalizeUrl(b.url));
    });

    return deduped;
  };

  const enrichPersonsFromContextAll = async (people: ContextPerson[]): Promise<ContextPerson[]> => {
    // 只在明显缺字段时才触发（避免额外请求）
    const missingAny = people.some((p) => !p.platform && !p.url && !p.handle && !p.photo_url);
    if (!missingAny) return people;

    try {
      const all = await apiClient.getContextAll();
      const offsiteKols = (all as any)?.offsite?.persons?.kols || [];
      const onsiteLeadership = (all as any)?.onsite?.persons?.leadership_team || [];
      const mergedPool: any[] = [...offsiteKols, ...onsiteLeadership];

      const byId = new Map<string, any>();
      for (const raw of mergedPool) {
        if (raw?.id) byId.set(raw.id, raw);
      }

      return people.map((p) => {
        const raw = byId.get(p.id);
        if (!raw) return p;

        // raw 是 data.json 形态（camelCase），p 是 /context/persons 形态（snake_case）
        const merged: any = {
          id: p.id,
          user_id: p.user_id || raw.user_id || raw.userId || "",
          category: p.category || raw.category,
          section: p.section || raw.section,
          name: p.name || raw.name || "",
          title: p.title ?? raw.title ?? null,
          bio: p.bio ?? raw.bio ?? null,
          photo_url: p.photo_url ?? raw.photo_url ?? raw.photoUrl ?? raw.extra?.image_url ?? null,
          platform: p.platform ?? raw.platform ?? raw.extra?.platform ?? null,
          handle: p.handle ?? raw.handle ?? raw.extra?.handle ?? null,
          url: p.url ?? raw.url ?? raw.extra?.url ?? null,
          role: p.role ?? raw.role ?? raw.extra?.role ?? null,
          social_links: (p.social_links?.length ? p.social_links : (raw.social_links ?? raw.socialLinks)) ?? [],
          notes: p.notes ?? raw.notes ?? raw.extra?.notes ?? null,
          extra: { ...(raw.extra || {}), ...(p.extra || {}) },
          sequence: p.sequence ?? raw.sequence ?? 0,
          version: p.version ?? raw.version ?? 1,
          created_at: p.created_at ?? raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
          updated_at: p.updated_at ?? raw.updated_at ?? raw.updatedAt ?? new Date().toISOString(),
          deleted_at: p.deleted_at ?? raw.deleted_at ?? raw.deletedAt ?? null,
        };

        return normalizeContextPerson(merged);
      });
    } catch (e) {
      console.warn("[ContextEditDialog] Failed to enrich persons from /context/all:", e);
      return people;
    }
  };

  const enrichEntitiesFromContextAll = async (entities: ContextEntity[], section: string): Promise<ContextEntity[]> => {
    // 只在明显缺字段时才触发（避免额外请求）
    const missingAny = entities.some((e) => !e.platform && !e.name && !e.url);
    if (!missingAny) return entities;

    try {
      const all = await apiClient.getContextAll();
      const pool = (all as any)?.offsite?.entities?.[section] || [];
      const byId = new Map<string, any>();
      for (const raw of pool) {
        if (raw?.id) byId.set(raw.id, raw);
      }

      return entities.map((e) => {
        const raw = byId.get(e.id);
        if (!raw) return e;

        const merged: any = {
          id: e.id,
          user_id: e.user_id || raw.user_id || raw.userId || "",
          category: e.category || raw.category,
          section: e.section || raw.section,
          name: e.name || raw.name || "",
          platform: e.platform ?? raw.platform ?? null,
          handle: e.handle ?? raw.handle ?? null,
          url: e.url ?? raw.url ?? null,
          entity_type: e.entity_type ?? raw.entity_type ?? raw.entityType ?? null,
          event_date: e.event_date ?? raw.event_date ?? raw.eventDate ?? null,
          location: e.location ?? raw.location ?? null,
          notes: e.notes ?? raw.notes ?? null,
          extra: { ...(raw.extra || {}), ...(e.extra || {}) },
          sequence: e.sequence ?? raw.sequence ?? 0,
          version: e.version ?? raw.version ?? 1,
          created_at: e.created_at ?? raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
          updated_at: e.updated_at ?? raw.updated_at ?? raw.updatedAt ?? new Date().toISOString(),
          deleted_at: e.deleted_at ?? raw.deleted_at ?? raw.deletedAt ?? null,
        };

        return normalizeContextEntity(merged);
      });
    } catch (e) {
      console.warn("[ContextEditDialog] Failed to enrich entities from /context/all:", e);
      return entities;
    }
  };

  const loadData = async () => {
    if (!config) {
      return;
    }

    setLoading(true);
    try {
      if (config.dataType === "singleton") {
        // Some singleton sections in the UI are "virtual" and actually live under a different
        // section in /context/all (e.g. hero_headline/subheadline are inside hero_section).
        const section = config.section;
        let raw: any = {};
        let version = 0; // Start with 0 (new data) instead of 1

        try {
          const data = await apiClient.getSingleton(section);
          raw = data.data || {};
          version = data.version ?? 0;
        } catch (error: any) {
          // 404 means no data yet, which is fine
          if (error.status !== 404) {
            throw error;
          }
          // If getSingleton returns 404, check if data exists in /context/all
          // If it does, we need to try getting the singleton again or use a different approach
          raw = {};
          version = 0; // Use 0 for new data
        }

        // Enrich from /context/all when the singleton is missing or when the UI section
        // is actually stored under a different singleton.
        const needContextAll =
          (section === "hero_headline" && !raw?.headline) ||
          (section === "hero_subheadline" && !raw?.subheadline) ||
          (section === "brand_assets" && (!raw || Object.keys(raw).length === 0)) ||
          (section === "monitoring_scope" && (!raw || Object.keys(raw).length === 0));

        if (needContextAll) {
          try {
            const all = await apiClient.getContextAll();
            if (section === "hero_headline" || section === "hero_subheadline") {
              raw = (all as any)?.onsite?.singletons?.hero_section || raw;
            } else if (section === "brand_assets") {
              raw = (all as any)?.onsite?.singletons?.brand_assets || raw;
            } else if (section === "monitoring_scope") {
              // Check if monitoring_scope exists in offsite singletons
              const monitoringScopeData = (all as any)?.offsite?.singletons?.monitoring_scope;
              if (monitoringScopeData && Object.keys(monitoringScopeData).length > 0) {
                raw = monitoringScopeData;
                // If we found data in /context/all but getSingleton returned 404,
                // try to get the singleton again to get the correct version
                try {
                  const data = await apiClient.getSingleton(section);
                  version = data.version ?? 0;
                  // Use the data from getSingleton if available (more up-to-date)
                  if (data.data && Object.keys(data.data).length > 0) {
                    raw = data.data;
                  }
                } catch (e: any) {
                  // If still 404, data might be new, keep version as 0
                  if (e?.status !== 404) {
                    console.warn("[ContextEditDialog] Failed to get singleton version:", e);
                  }
                }
              }
            }
          } catch (e) {
            console.warn("[ContextEditDialog] Failed to enrich singleton from /context/all:", e);
          }
        }

        const uiData = toUiSingletonData(section, raw);
        setSingletonData(uiData);
        setSingletonVersion(version);
        setSingletonJsonText(JSON.stringify(uiData || {}, null, 2));
      } else if (config.dataType === "items") {
        // Special handling for hero_ctas - load from hero_section singleton if items endpoint is empty
        if (config.section === "hero_ctas") {
          try {
            const response = await apiClient.getItems({
              category: config.category,
              section: config.section,
              limit: 100,
            });
            
            // If no items found, try loading from hero_section singleton
            if (response.items.length === 0) {
              try {
                const all = await apiClient.getContextAll();
                const ctas = (all as any)?.onsite?.singletons?.hero_section?.ctas || [];
                
                // Convert singleton ctas format to items format
                const ctaItems: ContextItem[] = ctas.map((cta: any, index: number) => ({
                  id: `temp_cta_${index}`,
                  user_id: "",
                  category: config.category,
                  section: config.section,
                  sequence: index,
                  title: cta.text || "",
                  description: cta.url || "",
                  url: cta.url || "",
                  image_url: null,
                  notes: null,
                  extra: {},
                  version: 1,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  deleted_at: null,
                }));
                
                setItems(ctaItems);
                
                // Mark all as pending creations so they'll be saved properly
                setPendingCreations(ctaItems);
              } catch (e) {
                console.warn("[ContextEditDialog] Failed to load hero_ctas from hero_section:", e);
                setItems(response.items);
              }
            } else {
              setItems(response.items);
            }
          } catch (error) {
            console.error("[ContextEditDialog] Failed to load hero_ctas items:", error);
            setItems([]);
          }
        } else {
          // Default items loading
          const response = await apiClient.getItems({
            category: config.category,
            section: config.section,
            limit: 100,
          });
          setItems(response.items);
        }
      } else if (config.dataType === "persons") {
        const response = await apiClient.getPersons({
          category: config.category,
          section: config.section,
          limit: 100,
        });
        // 兼容后端返回字段格式（camelCase vs snake_case）
        const normalized = (response.items || []).map((p: any) => normalizeContextPerson(p));
        const enriched = await enrichPersonsFromContextAll(normalized);
        setItems(enriched);
      } else if (config.dataType === "entities") {
        const response = await apiClient.getEntities({
          category: config.category,
          section: config.section,
          limit: 100,
        });
        const normalized = (response.items || []).map((e: any) => normalizeContextEntity(e));
        const enriched = await enrichEntitiesFromContextAll(normalized, config.section);

        // 针对 social_profiles：自动识别平台、去重、排序
        if (config.section === "social_profiles") {
          setItems(normalizeSocialProfilesEntities(enriched));
        } else {
          setItems(enriched);
        }
      }
    } catch (error: any) {
      console.error('[ContextEditDialog] Failed to load data:', error);
      toast.error("Failed to load data", {
        description: error.message || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSingleton = async () => {
    if (!config) return;

    // Validate JSON before saving
    if (jsonError) {
      toast.error("Invalid JSON", {
        description: "Please fix JSON syntax errors before saving",
      });
      return;
    }

    setSaving(true);
    try {
      // Some UI singletons are virtual fields inside another singleton (hero_section).
      if (config.section === "hero_headline" || config.section === "hero_subheadline") {
        // Fetch current hero_section to preserve other fields (e.g. ctas)
        let currentHero: any = {};
        let heroVersion = 1;
        try {
          const hero = await apiClient.getSingleton("hero_section");
          currentHero = hero.data || {};
          heroVersion = hero.version ?? 1;
        } catch (e: any) {
          if (e?.status !== 404) throw e;
        }

        const merged = {
          ...currentHero,
          ...(config.section === "hero_headline"
            ? { headline: (singletonData as any)?.headline ?? "" }
            : { subheadline: (singletonData as any)?.subheadline ?? "" }),
        };

        await apiClient.upsertSingleton("hero_section", merged, heroVersion);
      } else if (config.section === "brand_assets") {
        await apiClient.upsertSingleton(
          "brand_assets",
          toApiBrandAssets(singletonData),
          singletonVersion
        );
      } else if (config.section === "problem_statement" || config.section === "who_we_serve") {
        await apiClient.upsertSingleton(
          config.section,
          toApiSingletonData(config.section, singletonData),
          singletonVersion
        );
      } else {
        await apiClient.upsertSingleton(
          config.section,
          singletonData,
          singletonVersion
        );
      }

      toast.success("Saved successfully");
      await loadData(); // Reload to get updated version
      onSuccess?.(); // Call after loadData
    } catch (error: any) {
      console.error('[ContextEditDialog] Failed to save singleton:', error);
      if (error.status === 409) {
        toast.error("Version conflict", {
          description: "Data was modified by another user. Please refresh.",
        });
        loadData(); // Reload to get latest version
      } else {
        toast.error("Failed to save", {
          description: error.message || "Please try again",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!config || (dirtyItems.size === 0 && pendingCreations.length === 0 && pendingDeletions.size === 0)) return;

    setSaving(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      // 1. Process deletions first
      for (const itemId of pendingDeletions) {
        try {
          if (config.dataType === "items") {
            await apiClient.deleteItem(itemId);
          } else if (config.dataType === "persons") {
            await apiClient.deletePerson(itemId);
          } else if (config.dataType === "entities") {
            await apiClient.deleteEntity(itemId);
          }
          successCount++;
        } catch (error: any) {
          errorCount++;
          console.error(`[ContextEditDialog] Failed to delete item ${itemId}:`, error);
        }
      }

      // 2. Process creations
      for (const item of pendingCreations) {
        try {
          if (config.dataType === "items") {
            const contextItem = item as ContextItem;
            const createData: ContextItemCreate = {
              category: config.category,
              section: config.section,
              title: contextItem.title || null,
              description: contextItem.description || null,
              url: contextItem.url || null,
              image_url: contextItem.image_url || null,
              notes: contextItem.notes || null,
              extra: contextItem.extra || {},
            };
            await apiClient.createItem(createData);
          } else if (config.dataType === "persons") {
            const person = item as ContextPerson;
            const createData: ContextPersonCreate = {
              category: config.category,
              section: config.section,
              name: person.name || "",
              title: person.title || null,
              bio: person.bio || null,
              photo_url: person.photo_url || null,
              platform: person.platform || null,
              handle: person.handle || null,
              url: person.url || null,
              role: person.role || null,
              social_links: person.social_links || [],
              notes: person.notes || null,
              extra: person.extra || {},
            };
            await apiClient.createPerson(createData);
          } else if (config.dataType === "entities") {
            const entity = item as ContextEntity;
            const createData: ContextEntityCreate = {
              category: config.category,
              section: config.section,
              name: entity.name || "",
              platform: entity.platform || null,
              handle: entity.handle || null,
              url: entity.url || null,
              entity_type: entity.entity_type || null,
              event_date: entity.event_date || null,
              location: entity.location || null,
              notes: entity.notes || null,
              extra: entity.extra || {},
            };
            await apiClient.createEntity(createData);
          }
          successCount++;
        } catch (error: any) {
          errorCount++;
          console.error(`[ContextEditDialog] Failed to create item:`, error);
        }
      }

      // 3. Process updates (exclude pending creations - they have temp IDs)
      const itemsToUpdate = items.filter((item) => 
        dirtyItems.has(item.id) && 
        !pendingDeletions.has(item.id) && 
        !item.id.startsWith('temp_')  // Skip items that are being created
      );
      for (const item of itemsToUpdate) {
        try {
          if (config.dataType === "items") {
            const contextItem = item as ContextItem;
            const updateData = {
              title: contextItem.title || null,
              description: contextItem.description || null,
              url: contextItem.url || null,
              image_url: contextItem.image_url || null,
              notes: contextItem.notes || null,
              extra: contextItem.extra || {},
            };
            await apiClient.updateItem(item.id, updateData);
          } else if (config.dataType === "persons") {
            const person = item as ContextPerson;
            const updateData = {
              name: person.name,
              title: person.title || null,
              bio: person.bio || null,
              photo_url: person.photo_url || null,
              platform: person.platform || null,
              handle: person.handle || null,
              url: person.url || null,
              role: person.role || null,
              social_links: person.social_links || [],
              notes: person.notes || null,
              extra: person.extra || {},
            };
            await apiClient.updatePerson(item.id, updateData);
          } else if (config.dataType === "entities") {
            const entity = item as ContextEntity;
            const updateData = {
              name: entity.name,
              platform: entity.platform || null,
              handle: entity.handle || null,
              url: entity.url || null,
              entity_type: entity.entity_type || null,
              event_date: entity.event_date || null,
              location: entity.location || null,
              notes: entity.notes || null,
              extra: entity.extra || {},
            };
            await apiClient.updateEntity(item.id, updateData);
          }
          successCount++;
        } catch (error: any) {
          errorCount++;
          console.error(`[ContextEditDialog] Failed to save item ${item.id}:`, error);
          console.error('[ContextEditDialog] Error details:', {
            message: error.message,
            status: error.status,
            response: error.response,
          });
        }
      }

      if (errorCount === 0) {
        // Special handling: Sync hero_ctas to hero_section singleton
        if (config.section === "hero_ctas" && config.dataType === "items") {
          try {
            // Fetch the updated items after all operations
            const updatedResponse = await apiClient.getItems({
              category: config.category,
              section: config.section,
              limit: 100,
            });
            
            // Convert items to ctas format for hero_section singleton
            const ctas = updatedResponse.items.map((item) => ({
              text: item.title || "",
              url: item.url || item.description || "",
            }));
            
            // Fetch current hero_section to preserve other fields
            let currentHero: any = {};
            let heroVersion = 1;
            try {
              const hero = await apiClient.getSingleton("hero_section");
              currentHero = hero.data || {};
              heroVersion = hero.version ?? 1;
            } catch (e: any) {
              if (e?.status !== 404) throw e;
            }
            
            // Update hero_section with new ctas
            const merged = {
              ...currentHero,
              ctas,
            };
            
            await apiClient.upsertSingleton("hero_section", merged, heroVersion);
            console.log("[ContextEditDialog] Synced hero_ctas to hero_section singleton");
          } catch (e) {
            console.error("[ContextEditDialog] Failed to sync hero_ctas to hero_section:", e);
            // Don't fail the whole operation if sync fails
          }
        }
        
        toast.success(`Saved ${successCount} change${successCount > 1 ? 's' : ''}`);
        // Load fresh data from server first
        await loadData();
        // Then clear pending states after data is loaded
        setDirtyItems(new Set());
        setPendingCreations([]);
        setPendingDeletions(new Set());
        // Finally notify parent to refresh
        onSuccess?.(); 
      } else {
        toast.error(`Failed to save ${errorCount} of ${successCount + errorCount} changes`);
        await loadData(); // Reload to restore correct state
      }
    } catch (error: any) {
      toast.error("Failed to save changes", {
        description: error.message || "Please try again",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSingleton = async () => {
    if (!config) return;

    setConfirmDialog({
      open: true,
      title: "Delete Data",
      description: "Are you sure you want to delete this data? This action cannot be undone.",
      onConfirm: async () => {
    setDeleting(true);
    try {
      await apiClient.deleteSingleton(config.section);
      toast.success("Deleted successfully");
      setSingletonData({});
      onSuccess?.();
    } catch (error: any) {
      toast.error("Failed to delete", {
        description: error.message || "Please try again",
      });
    } finally {
      setDeleting(false);
    }
      },
    });
  };

  const handleCreateItem = () => {
    setIsCreating(true);
    setEditingItem(null);
    setFormData({
      category: config?.category,
      section: config?.section,
      social_links: config?.dataType === "persons" ? [] : undefined,
    });
  };

  const handleEditItem = (item: ContextItem | ContextPerson | ContextEntity) => {
    setEditingItem(item);
    setIsCreating(false);
    setFormData({
      ...(config?.dataType === "items"
        ? {
            title: (item as ContextItem).title || "",
            description: (item as ContextItem).description || "",
            url: (item as ContextItem).url || "",
            image_url: (item as ContextItem).image_url || "",
            notes: (item as ContextItem).notes || "",
            extra: (item as ContextItem).extra || {},
          }
        : config?.dataType === "persons"
        ? {
            name: (item as ContextPerson).name || "",
            title: (item as ContextPerson).title || "",
            bio: (item as ContextPerson).bio || "",
            photo_url: (item as ContextPerson).photo_url || "",
            platform: (item as ContextPerson).platform || "",
            handle: (item as ContextPerson).handle || "",
            url: (item as ContextPerson).url || "",
            role: (item as ContextPerson).role || "",
            notes: (item as ContextPerson).notes || "",
            social_links: ((item as ContextPerson).social_links || []).map(ensureSocialLinkId),
            extra: (item as ContextPerson).extra || {},
          }
        : {
            name: (item as ContextEntity).name || "",
            platform: (item as ContextEntity).platform || "",
            handle: (item as ContextEntity).handle || "",
            url: (item as ContextEntity).url || "",
            entity_type: (item as ContextEntity).entity_type || "",
            event_date: (item as ContextEntity).event_date || "",
            location: (item as ContextEntity).location || "",
            notes: (item as ContextEntity).notes || "",
            extra: (item as ContextEntity).extra || {},
          }),
    });
  };

  const handleSaveItem = async () => {
    if (!config || !editingItem && !isCreating) return;

    setSaving(true);
    try {
      const extra = formData.extra || {};

      if (isCreating) {
        // Create new item
        if (config.dataType === "items") {
          const data: ContextItemCreate = {
            category: config.category,
            section: config.section,
            title: formData.title || null,
            description: formData.description || null,
            url: formData.url || null,
            image_url: formData.image_url || null,
            notes: formData.notes || null,
            extra,
          };
          await apiClient.createItem(data);
        } else if (config.dataType === "persons") {
          const data: ContextPersonCreate = {
            category: config.category,
            section: config.section,
            name: formData.name || "",
            title: formData.title || null,
            bio: formData.bio || null,
            photo_url: formData.photo_url || null,
            platform: formData.platform || null,
            handle: formData.handle || null,
            url: formData.url || null,
            role: formData.role || null,
            social_links: stripSocialLinkIds(formData.social_links || []),
            notes: formData.notes || null,
            extra,
          };
          await apiClient.createPerson(data);
        } else if (config.dataType === "entities") {
          const data: ContextEntityCreate = {
            category: config.category,
            section: config.section,
            name: formData.name || "",
            platform: formData.platform || null,
            handle: formData.handle || null,
            url: formData.url || null,
            entity_type: formData.entity_type || null,
            event_date: formData.event_date || null,
            location: formData.location || null,
            notes: formData.notes || null,
            extra,
          };
          await apiClient.createEntity(data);
        }
        toast.success("Created successfully");
      } else if (editingItem) {
        // Update existing item
        const version =
          "version" in editingItem ? editingItem.version : undefined;

        if (config.dataType === "items") {
          await apiClient.updateItem(
            editingItem.id,
            {
              title: formData.title || null,
              description: formData.description || null,
              url: formData.url || null,
              image_url: formData.image_url || null,
              notes: formData.notes || null,
              extra,
            },
            version
          );
        } else if (config.dataType === "persons") {
          await apiClient.updatePerson(
            editingItem.id,
            {
              name: formData.name || "",
              title: formData.title || null,
              bio: formData.bio || null,
              photo_url: formData.photo_url || null,
              platform: formData.platform || null,
              handle: formData.handle || null,
              url: formData.url || null,
              role: formData.role || null,
              social_links: stripSocialLinkIds(formData.social_links || []),
              notes: formData.notes || null,
              extra,
            },
            version
          );
        } else if (config.dataType === "entities") {
          await apiClient.updateEntity(
            editingItem.id,
            {
              name: formData.name || "",
              platform: formData.platform || null,
              handle: formData.handle || null,
              url: formData.url || null,
              entity_type: formData.entity_type || null,
              event_date: formData.event_date || null,
              location: formData.location || null,
              notes: formData.notes || null,
              extra,
            },
            version
          );
        }
        toast.success("Updated successfully");
      }

      setIsCreating(false);
      setEditingItem(null);
      setFormData({});
      onSuccess?.();
      loadData();
    } catch (error: any) {
      if (error.status === 409) {
        toast.error("Version conflict", {
          description: "Data was modified by another user. Please refresh.",
        });
        loadData();
      } else {
        toast.error(isCreating ? "Failed to create" : "Failed to update", {
          description: error.message || "Please try again",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item: ContextItem | ContextPerson | ContextEntity) => {
    setConfirmDialog({
      open: true,
      title: "Delete Item",
      description: "Are you sure you want to delete this item? This action cannot be undone.",
      onConfirm: async () => {
    setDeleting(true);
    try {
      if (config?.dataType === "items") {
        await apiClient.deleteItem(item.id);
      } else if (config?.dataType === "persons") {
        await apiClient.deletePerson(item.id);
      } else if (config?.dataType === "entities") {
        await apiClient.deleteEntity(item.id);
      }
      toast.success("Deleted successfully");
      onSuccess?.();
      loadData();
    } catch (error: any) {
      toast.error("Failed to delete", {
        description: error.message || "Please try again",
      });
    } finally {
      setDeleting(false);
    }
      },
    });
  };

  const renderSingletonForm = () => {
    if (!config) return null;

    // Render specific form based on section
    const renderForm = () => {
      switch (config.section) {
        case "brand_assets":
          return (
            <BrandAssetsForm
              data={singletonData as any}
              onChange={(data: any) => setSingletonData(data)}
            />
          );
        case "hero_headline":
          return (
            <HeroHeadlineForm
              data={singletonData as any}
              onChange={(data: any) => setSingletonData(data)}
            />
          );
        case "hero_subheadline":
          return (
            <HeroSubheadlineForm
              data={singletonData as any}
              onChange={(data: any) => setSingletonData(data)}
            />
          );
        case "problem_statement":
          return (
            <ProblemStatementForm
              data={singletonData as any}
              onChange={(data: any) => setSingletonData(data)}
            />
          );
        case "who_we_serve":
          return (
            <WhoWeServeForm
              data={singletonData as any}
              onChange={(data: any) => setSingletonData(data)}
            />
          );
        case "about_us":
          return (
            <AboutUsForm
              data={singletonData as any}
              onChange={(data: any) => setSingletonData(data)}
            />
          );
        case "contact_info":
          return (
            <ContactInfoForm
              data={singletonData as any}
              onChange={(data: any) => setSingletonData(data)}
            />
          );
        case "monitoring_scope":
          return (
            <MonitoringScopeForm
              data={singletonData as any}
              onChange={(data: any) => setSingletonData(data)}
            />
          );
        default:
          // Fallback to JSON editor for unknown sections
          return (
            <div className="space-y-2">
              <Label>Data (JSON)</Label>
              <Textarea
                value={singletonJsonText}
                onChange={(e) => {
                  setSingletonJsonText(e.target.value);
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setSingletonData(parsed);
                    setJsonError(null);
                  } catch (err) {
                    setJsonError(
                      err instanceof Error ? err.message : "Invalid JSON"
                    );
                  }
                }}
                className={cn(
                  "font-mono text-xs",
                  jsonError && "border-destructive"
                )}
                rows={10}
              />
              {jsonError ? (
                <p className="text-xs text-destructive mt-1">{jsonError}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Edit the JSON data directly
                </p>
              )}
            </div>
          );
      }
    };

    return (
      <div className="space-y-4">
        {renderForm()}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSaveSingleton} disabled={saving || !!jsonError}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
          {Object.keys(singletonData).length > 0 && (
            <Button
              variant="destructive"
              onClick={handleDeleteSingleton}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderItemsList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    // For Items type, render specific form components based on section
    if (config?.dataType === "items") {
      // Filter out items pending deletion for display
      const itemsList = (items as ContextItem[]).filter(item => !pendingDeletions.has(item.id));
      
      const handleAdd = () => {
        // Create temporary item with a unique temporary ID
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const newItem: ContextItem = {
          id: tempId,
          user_id: "", // Temporary, will be set by backend
          category: config.category,
          section: config.section,
          sequence: 0,
          title: "",
          description: "",
          url: "",
          image_url: "",
          notes: "",
          extra: config.section === "faqs" ? { question: "", answer: "" } : {},
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        };
        
        // Add to pending creations
        setPendingCreations((prev) => [...prev, newItem]);
        
        // Add to items list for immediate display
        setItems((prev) => [...prev, newItem]);
      };

      const handleUpdate = (index: number, updates: Partial<ContextItem>) => {
        const item = itemsList[index];
        
        // Update local state immediately - find the correct index in the full items list
        setItems((prevItems) => {
          const actualIndex = prevItems.findIndex((prevItem) => prevItem.id === item.id);
          if (actualIndex === -1) {
            return prevItems; // Item not found
          }
          
          const newItems = [...prevItems];
          const currentItem = newItems[actualIndex];
          
          // Deep merge for extra field to avoid losing nested properties
          const mergedExtra = updates.extra !== undefined
            ? { ...(currentItem.extra || {}), ...updates.extra }
            : currentItem.extra;
          
          newItems[actualIndex] = { 
            ...currentItem, 
            ...updates,
            extra: mergedExtra
          };
          return newItems;
        });

        // Mark item as dirty (needs saving)
        setDirtyItems((prev) => new Set(prev).add(item.id));
      };

      const handleDelete = (index: number) => {
        const item = itemsList[index];
        
        // If this is a pending creation, just remove it from pending creations
        if (item.id.startsWith('temp_')) {
          setPendingCreations((prev) => prev.filter((i) => i.id !== item.id));
          setItems((prev) => prev.filter((i) => i.id !== item.id));
        } else {
          // Mark existing item for deletion
          setPendingDeletions((prev) => new Set(prev).add(item.id));
        }
      };

      // Render specific form based on section
      switch (config.section) {
        case "faqs":
          return (
            <ScrollArea className="h-[500px]">
              <FAQForm
                items={itemsList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            </ScrollArea>
          );
        case "use_cases":
          return (
            <ScrollArea className="h-[500px]">
              <SimpleItemListForm
                items={itemsList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label="Use Cases"
                emptyText="Click + to add use cases"
                placeholder="Marketing automation, Sales CRM..."
                getValue={(item: ContextItem) => item.title || ""}
                getUpdate={(value: string) => ({ title: value })}
              />
            </ScrollArea>
          );
        case "industries":
          return (
            <ScrollArea className="h-[500px]">
              <SimpleItemListForm
                items={itemsList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label="Industries"
                emptyText="Click + to add industries"
                placeholder="SaaS, E-commerce, Healthcare..."
                getValue={(item: ContextItem) => item.title || ""}
                getUpdate={(value: string) => ({ title: value })}
              />
            </ScrollArea>
          );
        case "hero_ctas":
          return (
            <ScrollArea className="h-[500px]">
              <DualFieldForm
                items={itemsList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label="Call to Action (CTA)"
                emptyText="Click + to add CTA"
                field1={{
                  placeholder: "Button text...",
                  getValue: (item) => item.title || "",
                  getUpdate: (value) => ({ title: value }),
                  className: "w-1/3",
                }}
                field2={{
                  placeholder: "URL: /signup or https://...",
                  getValue: (item) => item.url || item.description || "",
                  getUpdate: (value) => ({ url: value, description: value }),
                  className: "flex-1",
                }}
              />
            </ScrollArea>
          );
        case "hero_media":
          return (
            <ScrollArea className="h-[500px]">
              <SimpleItemListForm
                items={itemsList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label="Feature Images / Videos"
                emptyText="Click + to add media"
                placeholder="https://... (image or video URL)"
                getValue={(item: ContextItem) => item.image_url || item.title || ""}
                getUpdate={(value: string) => ({ image_url: value, title: value })}
              />
            </ScrollArea>
          );
        case "hero_metrics":
          return (
            <ScrollArea className="h-[500px]">
              <SimpleItemListForm
                items={itemsList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label="Key Metrics / Social Proof"
                emptyText="Click + to add metrics"
                placeholder="e.g. 10K+ users / 99.9% uptime / $2M saved / 500+ reviews / 50+ countries"
                getValue={(item: ContextItem) => item.title || ""}
                getUpdate={(value: string) => ({ title: value })}
              />
            </ScrollArea>
          );
        case "testimonials":
          return (
            <ScrollArea className="h-[500px]">
              <SimpleItemListForm
                items={itemsList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label="Testimonials"
                emptyText="Click + to add testimonials"
                placeholder='"Quote..."'
                getValue={(item: ContextItem) => item.description || item.title || ""}
                getUpdate={(value: string) => ({ description: value, title: value })}
                spacing="sm"
                iconSize="sm"
              />
            </ScrollArea>
          );
        case "case_studies":
          return (
            <ScrollArea className="h-[500px]">
              <SimpleItemListForm
                items={itemsList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label="Case Studies"
                emptyText="Click + to add case studies"
                placeholder="URL..."
                getValue={(item: ContextItem) => item.url || ""}
                getUpdate={(value: string) => ({ url: value })}
                spacing="sm"
                iconSize="sm"
              />
            </ScrollArea>
          );
        case "trust_badges": {
          // Differentiate based on label
          const trustBadgeConfig = {
            Awards: {
              label: "Awards & Certs",
              emptyText: "Click + to add awards",
              placeholder: "ISO 27001 / G2 Leader...",
            },
            Guarantees: {
              label: "Guarantees",
              emptyText: "Click + to add guarantees",
              placeholder: "30-day refund / 99.9% SLA...",
            },
            Integrations: {
              label: "Integrations",
              emptyText: "Click + to add integrations",
              placeholder: "Slack / Salesforce / Zapier...",
            },
            default: {
              label: "Trust Badges",
              emptyText: "Click + to add logos",
              placeholder: "Company...",
            },
          };
          const badgeConfig =
            trustBadgeConfig[config.label as keyof typeof trustBadgeConfig] ||
            trustBadgeConfig.default;
          return (
            <ScrollArea className="h-[500px]">
              <SimpleItemListForm
                items={itemsList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label={badgeConfig.label}
                emptyText={badgeConfig.emptyText}
                placeholder={badgeConfig.placeholder}
                getValue={(item: ContextItem) => item.title || ""}
                getUpdate={(value: string) => ({ title: value })}
                spacing="sm"
                iconSize="sm"
              />
            </ScrollArea>
          );
        }
        case "landing_pages":
          return (
            <ScrollArea className="h-[500px]">
              <LandingPagesForm
                items={itemsList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label={config.label}
              />
            </ScrollArea>
          );
        case "key_pages":
        case "resources":
        case "blog_posts":
        case "sitemap_urls":
        case "header_links":
        case "footer_links":
        case "target_keywords":
          return (
            <ScrollArea className="h-[500px]">
              <SimpleItemListForm
                items={itemsList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label={config.label}
                emptyText={`Click + to add ${config.label.toLowerCase()}`}
                placeholder="Page name or URL..."
                getValue={(item: ContextItem) => item.title || item.url || ""}
                getUpdate={(value: string) => {
                  // If it looks like a URL, put it in url field, otherwise in title
                  if (
                    value.startsWith("http://") ||
                    value.startsWith("https://") ||
                    value.startsWith("/")
                  ) {
                    return { url: value, title: value };
                  } else {
                    return { title: value };
                  }
                }}
              />
            </ScrollArea>
          );
        case "press_coverage":
          return (
            <ScrollArea className="h-[500px]">
              <CoverageForm
                items={itemsList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label={config.label}
              />
            </ScrollArea>
          );
        case "products_services":
          return (
            <ScrollArea className="h-[500px]">
              <ProductsServicesForm
                items={itemsList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label={config.label}
              />
            </ScrollArea>
          );
        default:
          // Fallback to generic form for unknown sections
          if (isCreating || editingItem) {
            return renderItemForm();
          }
          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">
                  {items.length} {config?.label || "items"}
                </h3>
                <Button onClick={handleCreateItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New
                </Button>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {(item as ContextItem).title ||
                            (item as ContextItem).extra?.question ||
                            "Untitled"}
                        </p>
                        {(item as ContextItem).description && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {(item as ContextItem).description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteItem(item)}
                          disabled={deleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No items yet. Click "Add New" to create one.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
      }
    }

    // For Entities type, render specific form components based on section
    if (config?.dataType === "entities") {
      // Filter out entities pending deletion for display
      const entitiesList = (items as ContextEntity[]).filter(entity => !pendingDeletions.has(entity.id));
      
      const handleAdd = () => {
        // Create temporary entity with a unique temporary ID
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const newEntity: ContextEntity = {
          id: tempId,
          user_id: "", // Temporary, will be set by backend
          category: config.category,
          section: config.section,
          sequence: 0,
          name: "",
          platform: null,
          handle: null,
          url: null,
          entity_type: null,
          event_date: null,
          location: null,
          notes: null,
          extra: {},
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        };
        
        // Add to pending creations
        setPendingCreations((prev) => [...prev, newEntity]);
        
        // Add to items list for immediate display
        setItems((prev) => [...prev, newEntity]);
      };

      const handleUpdate = (index: number, updates: Partial<ContextEntity>) => {
        const entity = entitiesList[index];
        
        // Update local state immediately - find the correct index in the full items list
        setItems((prevItems) => {
          const actualIndex = prevItems.findIndex((item) => item.id === entity.id);
          if (actualIndex === -1) {
            return prevItems; // Entity not found
          }
          
          const newItems = [...prevItems];
          const currentEntity = newItems[actualIndex] as ContextEntity;
          
          // Deep merge for extra field to avoid losing nested properties
          const mergedExtra = updates.extra !== undefined
            ? { ...(currentEntity.extra || {}), ...updates.extra }
            : currentEntity.extra;
          
          newItems[actualIndex] = { 
            ...currentEntity, 
            ...updates,
            extra: mergedExtra
          };
          return newItems;
        });

        // Mark entity as dirty (needs saving)
        setDirtyItems((prev) => new Set(prev).add(entity.id));
      };

      const handleDelete = (index: number) => {
        const entity = entitiesList[index];
        
        // If this is a pending creation, just remove it from pending creations
        if (entity.id.startsWith('temp_')) {
          setPendingCreations((prev) => prev.filter((i) => i.id !== entity.id));
          setItems((prev) => prev.filter((i) => i.id !== entity.id));
        } else {
          // Mark existing entity for deletion
          setPendingDeletions((prev) => new Set(prev).add(entity.id));
        }
      };

      // Render specific form based on section
      switch (config.section) {
        case "social_profiles":
          return (
            <ScrollArea className="h-[500px]">
              <PlatformSelectForm
                items={entitiesList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label={config.label}
                platforms={[
                  "X",
                  "LinkedIn",
                  "Facebook",
                  "Instagram",
                  "YouTube",
                  "TikTok",
                  "Threads",
                  "Pinterest",
                  "Product Hunt",
                  "OpenHunts",
                  "GitHub",
                  "Reddit",
                  "Discord",
                  "Podcast",
                  "Newsletter",
                  "Blog",
                  "Other",
                ]}
                defaultPlatform="X"
                urlPlaceholder="URL"
              />
            </ScrollArea>
          );
        case "review_platforms":
          return (
            <ScrollArea className="h-[500px]">
              <PlatformSelectForm
                items={entitiesList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label={config.label}
                platforms={[
                  "G2",
                  "Capterra",
                  "TrustRadius",
                  "Trustpilot",
                  "Gartner",
                  "Glassdoor",
                  "Yelp",
                  "Other",
                ]}
                defaultPlatform="G2"
                urlPlaceholder="Profile URL"
                onPlatformChange={(value: string) => ({ platform: value, name: value })}
              />
            </ScrollArea>
          );
        case "community_forums":
          return (
            <ScrollArea className="h-[500px]">
              <PlatformSelectForm
                items={entitiesList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label={config.label}
                platforms={["Reddit", "Discord", "Slack", "Telegram", "GitHub", "Other"]}
                defaultPlatform="Reddit"
                urlPlaceholder="Community URL"
                onPlatformChange={(value: string) => ({ platform: value, name: value })}
              />
            </ScrollArea>
          );
        default:
          // Fallback to generic form for unknown sections
          if (isCreating || editingItem) {
            return renderItemForm();
          }
          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">
                  {items.length} {config?.label || "entities"}
                </h3>
                <Button onClick={handleCreateItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New
                </Button>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {(item as ContextEntity).name}
                        </p>
                        {(item as ContextEntity).platform && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {(item as ContextEntity).platform}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteItem(item)}
                          disabled={deleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No items yet. Click "Add New" to create one.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
      }
    }

    // For Persons type, render specific form components based on section
    if (config?.dataType === "persons") {
      // Filter out persons pending deletion for display
      const personsList = (items as ContextPerson[]).filter(person => !pendingDeletions.has(person.id));
      
      const handleAdd = () => {
        // Create temporary person with a unique temporary ID
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const newPerson: ContextPerson = {
          id: tempId,
          user_id: "", // Temporary, will be set by backend
          category: config.category,
          section: config.section,
          sequence: 0,
          name: "",
          title: null,
          bio: null,
          photo_url: null,
          platform: null,
          handle: null,
          url: null,
          role: null,
          notes: null,
          social_links: [],
          extra: {},
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        };
        
        // Add to pending creations
        setPendingCreations((prev) => [...prev, newPerson]);
        
        // Add to items list for immediate display
        setItems((prev) => [...prev, newPerson]);
      };

      const handleUpdate = (index: number, updates: Partial<ContextPerson>) => {
        const person = personsList[index];
        
        // Update local state immediately - find the correct index in the full items list
        setItems((prevItems) => {
          const actualIndex = prevItems.findIndex((item) => item.id === person.id);
          if (actualIndex === -1) {
            return prevItems; // Person not found
          }
          
          const newItems = [...prevItems];
          const currentPerson = newItems[actualIndex] as ContextPerson;
          
          // Deep merge for extra field and arrays
          const mergedExtra = updates.extra !== undefined
            ? { ...(currentPerson.extra || {}), ...updates.extra }
            : currentPerson.extra;
          
          const mergedSocialLinks = updates.social_links !== undefined
            ? updates.social_links
            : currentPerson.social_links;
          
          newItems[actualIndex] = { 
            ...currentPerson, 
            ...updates,
            extra: mergedExtra,
            social_links: mergedSocialLinks
          };
          return newItems;
        });

        // Mark person as dirty (needs saving)
        setDirtyItems((prev) => new Set(prev).add(person.id));
      };

      const handleDelete = (index: number) => {
        const person = personsList[index];
        
        // If this is a pending creation, just remove it from pending creations
        if (person.id.startsWith('temp_')) {
          setPendingCreations((prev) => prev.filter((i) => i.id !== person.id));
          setItems((prev) => prev.filter((i) => i.id !== person.id));
        } else {
          // Mark existing person for deletion
          setPendingDeletions((prev) => new Set(prev).add(person.id));
        }
      };

      // Render specific form based on section
      switch (config.section) {
        case "kols":
          return (
            <ScrollArea className="h-[500px]">
              <CreatorsForm
                items={personsList}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                label={config.label}
              />
            </ScrollArea>
          );
        default:
          // Fallback to generic form for unknown sections
          if (isCreating || editingItem) {
            return renderItemForm();
          }
          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">
                  {items.length} {config?.label || "persons"}
                </h3>
                <Button onClick={handleCreateItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New
                </Button>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {(item as ContextPerson).name}
                        </p>
                        {(item as ContextPerson).title && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {(item as ContextPerson).title}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteItem(item)}
                          disabled={deleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No items yet. Click "Add New" to create one.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
      }
    }

    // Fallback for unknown types
    if (isCreating || editingItem) {
      return renderItemForm();
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">
            {items.length} {config?.label || "items"}
          </h3>
          <Button onClick={handleCreateItem} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded-md"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {(item as any).name || (item as any).title || "Item"}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditItem(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteItem(item)}
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No items yet. Click "Add New" to create one.
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const renderItemForm = () => {
    if (config?.dataType === "items") {
      return (
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={formData.title || ""}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>
          <div>
            <Label>URL</Label>
            <Input
              value={formData.url || ""}
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Image URL</Label>
            <Input
              value={formData.image_url || ""}
              onChange={(e) =>
                setFormData({ ...formData, image_url: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveItem} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setEditingItem(null);
                setFormData({});
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    if (config?.dataType === "persons") {
      return (
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label>Title</Label>
            <Input
              value={formData.title || ""}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea
              value={formData.bio || ""}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              rows={3}
            />
          </div>
          <div>
            <Label>Photo URL</Label>
            <Input
              value={formData.photo_url || ""}
              onChange={(e) =>
                setFormData({ ...formData, photo_url: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Platform</Label>
            <Input
              value={formData.platform || ""}
              onChange={(e) =>
                setFormData({ ...formData, platform: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Handle</Label>
            <Input
              value={formData.handle || ""}
              onChange={(e) =>
                setFormData({ ...formData, handle: e.target.value })
              }
            />
          </div>
          <div>
            <Label>URL</Label>
            <Input
              value={formData.url || ""}
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Role</Label>
            <Input
              value={formData.role || ""}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Social Links</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const socialLinks = formData.social_links || [];
                  setFormData({
                    ...formData,
                    social_links: [...socialLinks, { 
                      id: `social-link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      platform: "", 
                      url: "" 
                    }],
                  });
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Link
              </Button>
            </div>
            <div className="space-y-2">
              {(formData.social_links || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No social links added yet.
                </p>
              ) : (
                (formData.social_links || []).map((link: any) => {
                  // Ensure link has an ID for stable key
                  const linkWithId = ensureSocialLinkId(link);
                  const linkId = linkWithId.id;
                  
                  return (
                    <div
                      key={linkId}
                      className="flex gap-2 p-2 border rounded-md bg-muted/50"
                    >
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Platform (e.g., Twitter, LinkedIn)"
                          value={linkWithId.platform || ""}
                          onChange={(e) => {
                            const newLinks = (formData.social_links || []).map((l: any) => {
                              const lWithId = ensureSocialLinkId(l);
                              return lWithId.id === linkId 
                                ? { ...lWithId, platform: e.target.value }
                                : lWithId;
                            });
                            setFormData({ ...formData, social_links: newLinks });
                          }}
                        />
                        <Input
                          placeholder="URL"
                          value={linkWithId.url || ""}
                          onChange={(e) => {
                            const newLinks = (formData.social_links || []).map((l: any) => {
                              const lWithId = ensureSocialLinkId(l);
                              return lWithId.id === linkId 
                                ? { ...lWithId, url: e.target.value }
                                : lWithId;
                            });
                            setFormData({ ...formData, social_links: newLinks });
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => {
                          const newLinks = (formData.social_links || [])
                            .map(ensureSocialLinkId)
                            .filter((l: any) => l.id !== linkId);
                          setFormData({ ...formData, social_links: newLinks });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveItem} disabled={saving || !formData.name}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setEditingItem(null);
                setFormData({});
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    if (config?.dataType === "entities") {
      return (
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label>Platform</Label>
            <Input
              value={formData.platform || ""}
              onChange={(e) =>
                setFormData({ ...formData, platform: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Handle</Label>
            <Input
              value={formData.handle || ""}
              onChange={(e) =>
                setFormData({ ...formData, handle: e.target.value })
              }
            />
          </div>
          <div>
            <Label>URL</Label>
            <Input
              value={formData.url || ""}
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Entity Type</Label>
            <Input
              value={formData.entity_type || ""}
              onChange={(e) =>
                setFormData({ ...formData, entity_type: e.target.value })
              }
              placeholder="official, direct, indirect"
            />
          </div>
          <div>
            <Label>Event Date</Label>
            <Input
              type="date"
              lang="en"
              value={formData.event_date || ""}
              onChange={(e) =>
                setFormData({ ...formData, event_date: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Location</Label>
            <Input
              value={formData.location || ""}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveItem} disabled={saving || !formData.name}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setEditingItem(null);
                setFormData({});
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{config.label}</DialogTitle>
          <DialogDescription>
            Manage {config.dataType} data for {config.section}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {config.dataType === "singleton"
            ? renderSingletonForm()
            : renderItemsList()}
        </ScrollArea>

        {/* Footer with Save button */}
        {config.dataType !== "singleton" && (dirtyItems.size > 0 || pendingCreations.length > 0 || pendingDeletions.size > 0) && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {(() => {
                const changes = [];
                if (pendingCreations.length > 0) changes.push(`${pendingCreations.length} new`);
                if (dirtyItems.size > 0) changes.push(`${dirtyItems.size} modified`);
                if (pendingDeletions.size > 0) changes.push(`${pendingDeletions.size} deleted`);
                return `${changes.join(', ')} - unsaved`;
              })()}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDirtyItems(new Set());
                  setPendingCreations([]);
                  setPendingDeletions(new Set());
                  loadData(); // Reload to discard changes
                }}
                disabled={saving}
              >
                Discard
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ ...confirmDialog, open })
        }
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        variant="destructive"
        confirmText="Delete"
      />
    </Dialog>
  );
}

