// 数据转换：将 Context API 响应格式转换为 ContextData 格式

import { v4 as uuidv4 } from 'uuid';
import type { ContextData, OnSiteContext, OffSiteContext, KnowledgeContext } from '@/app/types/context';

// API 响应类型
interface ContextApiResponse {
  brand?: {
    brand?: { brand_name?: string; tagline?: string };
    hero?: { headline?: string; subheadline?: string };
    contact?: { email?: string; phone?: string; address?: string };
  };
  onsite?: {
    singletons?: Record<string, any>;
    items?: Record<string, any[]>;
    persons?: Record<string, any[]>;
  };
  offsite?: {
    singletons?: Record<string, any>;
    items?: Record<string, any[]>;
    persons?: Record<string, any[]>;
    entities?: Record<string, any[]>;
  };
}

/**
 * 将 Context API 响应转换为 ContextData 格式
 */
export function mapApiResponseToContextData(apiResponse: ContextApiResponse): ContextData {
  const { brand = {}, onsite = {}, offsite = {} } = apiResponse;

  // ============ Helpers ============
  // 后端返回的 singleton 可能是 { data: {...}, version: ... } 或者直接是 {...}
  const unwrapSingleton = (v: any) => {
    if (!v || typeof v !== "object") return v;
    if ("data" in v) return (v as any).data;
    return v;
  };

  const getOnsiteSingleton = (section: string) =>
    unwrapSingleton((onsite as any).singletons?.[section]) || {};
  const getOffsiteSingleton = (section: string) =>
    unwrapSingleton((offsite as any).singletons?.[section]) || {};

  const ensureString = (v: any): string => (typeof v === "string" ? v : v == null ? "" : String(v));
  const ensureStringArray = (v: any): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean) : [];

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
        return ensureString(value);
      }
    }
    return "";
  };

  const normalizeReviewPlatform = (platformOrName: any, profileUrl?: any): string => {
    const raw = ensureString(platformOrName).trim();
    const rawLower = raw.toLowerCase();
    const urlLower = ensureString(profileUrl).toLowerCase();
    const s = `${rawLower} ${urlLower}`;

    // Match by URL/domain first (most reliable)
    if (s.includes("trustpilot")) return "Trustpilot";
    if (s.includes("trustradius")) return "TrustRadius";
    if (s.includes("capterra")) return "Capterra";
    if (s.includes("g2.com") || s === "g2" || s.includes(" g2 ")) return "G2";
    if (s.includes("producthunt") || s.includes("product hunt")) return "Product Hunt";
    if (s.includes("gartner")) return "Gartner";
    if (s.includes("glassdoor")) return "Glassdoor";
    if (s.includes("yelp")) return "Yelp";

    // Match by known names
    const allowed = new Set([
      "G2",
      "Capterra",
      "TrustRadius",
      "Trustpilot",
      "Gartner",
      "Glassdoor",
      "Yelp",
      "Product Hunt",
      "Other",
    ]);

    // Try a simple title-case normalization for inputs like "trustpilot"
    const titleCase = raw
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    if (allowed.has(titleCase)) return titleCase;
    if (allowed.has(raw)) return raw;

    return "Other";
  };

  const brandAssetsSingleton = getOnsiteSingleton("brand_assets");
  const heroSectionSingleton = getOnsiteSingleton("hero_section");
  const contactInfoSingleton = getOnsiteSingleton("contact_info");
  const monitoringScopeSingleton = getOffsiteSingleton("monitoring_scope");

  // data.json / 部分后端字段兼容：
  // brand.brand.brandName 可能是 string，也可能是 { name, subtitle }
  const brandNameFromAssets =
    typeof brandAssetsSingleton?.brandName === "string"
      ? brandAssetsSingleton.brandName
      : brandAssetsSingleton?.brandName?.name;

  const brandNameFromBrand =
    (brand as any)?.brand?.brand_name ||
    (brand as any)?.brand?.brandName ||
    (brand as any)?.brand?.name;

  const brandTaglineFromBrand =
    (brand as any)?.brand?.tagline ||
    (brand as any)?.brand?.brandSubtitle ||
    (brand as any)?.hero?.subheadline;

  const heroHeadline =
    ensureString((brand as any)?.hero?.headline) ||
    ensureString(heroSectionSingleton?.headline) ||
    ensureString(getOnsiteSingleton("hero_headline")?.headline);

  const heroSubheadline =
    ensureString((brand as any)?.hero?.subheadline) ||
    ensureString(heroSectionSingleton?.subheadline) ||
    ensureString(getOnsiteSingleton("hero_subheadline")?.subheadline);
  
  // 转换 Onsite 数据
  const onSite: OnSiteContext = {
    brandInfo: {
      name: ensureString(brandNameFromBrand || brandNameFromAssets),
      tagline: ensureString(brandTaglineFromBrand || heroSubheadline),
      mission: ensureString(getOnsiteSingleton("about_us")?.mission),
      vision: ensureString(getOnsiteSingleton("about_us")?.vision),
      coreValues: Array.isArray(getOnsiteSingleton("about_us")?.coreValues) ? getOnsiteSingleton("about_us").coreValues : [],
      foundingStory: ensureString(getOnsiteSingleton("about_us")?.companyStory),
      uniqueSellingPoints: heroHeadline ? [heroHeadline] : [],
    },
    brandAssets: [],
    productsServices: (onsite.items?.products_services || []).map((item: any) => ({
      id: uuidv4(),
      name: item.title || item.name || "",
      type: "product" as const,
      url: item.url || undefined,
      description: item.description || "",
      features: (item.extra?.features || item.features || []).map((f: any) => typeof f === 'string' ? f : f.name || f.title || f),
      benefits: (item.extra?.benefits || item.benefits || []).map((b: any) => typeof b === 'string' ? b : b.name || b.title || b),
      howItWorks: (item.extra?.how_it_works || item.howItWorks || []).map((h: any) => typeof h === 'string' ? h : h.name || h.title || h),
      pricingPlans: (item.extra?.pricing_plans || item.pricingPlans || []).map((p: any) => ({
        name: p.name || "",
        price: p.price || "",
        features: (p.features || []).map((f: any) => typeof f === 'string' ? f : f.name || f.title || f),
      })),
    })),
    landingPages: (onsite.items?.landing_pages || []).map((item: any) => ({
      id: uuidv4(),
      name: item.title || item.name || "",
      url: item.url || "",
      type: (item.extra?.type || item.type || "other") as "product" | "campaign" | "event" | "signup" | "download" | "other",
      status: "active" as const,
      description: item.description || "",
      createdAt: item.created_at || new Date().toISOString(),
    })),
    blogPosts: (onsite.items?.blog_posts || []).map((item: any) => ({
      id: uuidv4(),
      title: item.title || item.name || "",
      url: item.url || "",
      category: item.extra?.category || item.category || undefined,
      status: "published" as const,
      publishDate: item.extra?.publishDate || item.publishDate || item.created_at || undefined,
      tags: item.extra?.tags || item.tags || undefined,
    })),
    websiteContent: [
      // ============ Brand Assets -> WebsiteContent (用于 UI 渲染) ============
      ...(ensureString(brandAssetsSingleton?.brandSubtitle) ? [{
        id: uuidv4(),
        name: ensureString(brandAssetsSingleton.brandSubtitle),
        url: "#meta-subtitle",
        type: "other" as const,
      }] : []),
      ...(ensureString((brandAssetsSingleton as any)?.metaDescription || (brand as any)?.brand?.metaDescription) ? [{
        id: uuidv4(),
        name: ensureString((brandAssetsSingleton as any)?.metaDescription || (brand as any)?.brand?.metaDescription),
        url: "#meta-description",
        type: "other" as const,
      }] : []),
      // Logo URLs - support both flat and nested structure
      ...(getFieldValue(brandAssetsSingleton, ["logos.fullLogoLight", "logos.full_logo_light", "logoUrl", "logo_url"]) ? [{
        id: uuidv4(),
        name: getFieldValue(brandAssetsSingleton, ["logos.fullLogoLight", "logos.full_logo_light", "logoUrl", "logo_url"]),
        url: "#brand-logo",
        type: "other" as const,
      }] : []),
      ...(getFieldValue(brandAssetsSingleton, ["logos.fullLogoDark", "logos.full_logo_dark", "logoUrlDark", "logo_url_dark"]) ? [{
        id: uuidv4(),
        name: getFieldValue(brandAssetsSingleton, ["logos.fullLogoDark", "logos.full_logo_dark", "logoUrlDark", "logo_url_dark"]),
        url: "#brand-logo-dark",
        type: "other" as const,
      }] : []),
      ...(getFieldValue(brandAssetsSingleton, ["logos.iconOnlyLight", "logos.icon_only_light", "iconUrl", "icon_url"]) ? [{
        id: uuidv4(),
        name: getFieldValue(brandAssetsSingleton, ["logos.iconOnlyLight", "logos.icon_only_light", "iconUrl", "icon_url"]),
        url: "#brand-logo-icon",
        type: "other" as const,
      }] : []),
      ...(getFieldValue(brandAssetsSingleton, ["logos.iconOnlyDark", "logos.icon_only_dark", "iconUrlDark", "icon_url_dark"]) ? [{
        id: uuidv4(),
        name: getFieldValue(brandAssetsSingleton, ["logos.iconOnlyDark", "logos.icon_only_dark", "iconUrlDark", "icon_url_dark"]),
        url: "#brand-logo-icon-dark",
        type: "other" as const,
      }] : []),
      // Colors - support both flat and nested structure
      ...(getFieldValue(brandAssetsSingleton, ["colors.primaryLight", "colors.primary_light", "primaryColor", "primary_color", "colors.primary"]) ? [{
        id: uuidv4(),
        name: getFieldValue(brandAssetsSingleton, ["colors.primaryLight", "colors.primary_light", "primaryColor", "primary_color", "colors.primary"]),
        url: "#brand-color-primary",
        type: "other" as const,
      }] : []),
      ...(getFieldValue(brandAssetsSingleton, ["colors.primaryDark", "colors.primary_dark"]) ? [{
        id: uuidv4(),
        name: getFieldValue(brandAssetsSingleton, ["colors.primaryDark", "colors.primary_dark"]),
        url: "#brand-color-primary-dark",
        type: "other" as const,
      }] : []),
      ...(getFieldValue(brandAssetsSingleton, ["colors.secondaryLight", "colors.secondary_light", "secondaryColor", "secondary_color", "colors.secondary"]) ? [{
        id: uuidv4(),
        name: getFieldValue(brandAssetsSingleton, ["colors.secondaryLight", "colors.secondary_light", "secondaryColor", "secondary_color", "colors.secondary"]),
        url: "#brand-color-secondary",
        type: "other" as const,
      }] : []),
      ...(getFieldValue(brandAssetsSingleton, ["colors.secondaryDark", "colors.secondary_dark"]) ? [{
        id: uuidv4(),
        name: getFieldValue(brandAssetsSingleton, ["colors.secondaryDark", "colors.secondary_dark"]),
        url: "#brand-color-secondary-dark",
        type: "other" as const,
      }] : []),
      // Typography - support both flat and nested structure
      ...(getFieldValue(brandAssetsSingleton, ["typography.heading", "typography.heading_font", "headingFont", "heading_font", "typography.fontFamily"]) ? [{
        id: uuidv4(),
        name: getFieldValue(brandAssetsSingleton, ["typography.heading", "typography.heading_font", "headingFont", "heading_font", "typography.fontFamily"]),
        url: "#brand-font-heading",
        type: "other" as const,
      }] : []),
      ...(getFieldValue(brandAssetsSingleton, ["typography.body", "typography.body_font", "bodyFont", "body_font", "typography.bodyFont"]) ? [{
        id: uuidv4(),
        name: getFieldValue(brandAssetsSingleton, ["typography.body", "typography.body_font", "bodyFont", "body_font", "typography.bodyFont"]),
        url: "#brand-font-body",
        type: "other" as const,
      }] : []),
      // Images - ogImage and favicon
      ...(getFieldValue(brandAssetsSingleton, ["images.ogImage", "images.og_image", "ogImage", "og_image"]) ? [{
        id: uuidv4(),
        name: getFieldValue(brandAssetsSingleton, ["images.ogImage", "images.og_image", "ogImage", "og_image"]),
        url: "#meta-og-image",
        type: "other" as const,
      }] : []),
      ...(getFieldValue(brandAssetsSingleton, ["images.favicon", "favicon", "faviconUrl", "favicon_url"]) ? [{
        id: uuidv4(),
        name: getFieldValue(brandAssetsSingleton, ["images.favicon", "favicon", "faviconUrl", "favicon_url"]),
        url: "#meta-favicon",
        type: "other" as const,
      }] : []),
      // Tone of Voice
      ...(getFieldValue(brandAssetsSingleton, ["tone", "toneOfVoice", "tone_of_voice"]) ? [{
        id: uuidv4(),
        name: getFieldValue(brandAssetsSingleton, ["tone", "toneOfVoice", "tone_of_voice"]),
        url: "#brand-tone",
        type: "other" as const,
      }] : []),
      // Languages
      ...(getFieldValue(brandAssetsSingleton, ["languages", "supportedLanguages", "supported_languages"]) ? [{
        id: uuidv4(),
        name: getFieldValue(brandAssetsSingleton, ["languages", "supportedLanguages", "supported_languages"]),
        url: "#brand-languages",
        type: "other" as const,
      }] : []),

      // ============ Hero Section -> CTA / Metrics / Media ============
      // Hero CTAs - from singleton or items
      ...(Array.isArray(heroSectionSingleton?.ctas) ? heroSectionSingleton.ctas.map((cta: any) => ({
        id: uuidv4(),
        name: ensureString(cta?.text || cta?.title),
        url: "#cta",
        type: "other" as const,
        description: ensureString(cta?.url || cta?.description),
      })) : []),
      // Hero CTAs from items
      ...((onsite.items?.hero_ctas || []).map((cta: any) => ({
        id: uuidv4(),
        name: ensureString(cta?.title || cta?.text),
        url: "#cta",
        type: "other" as const,
        description: ensureString(cta?.url || cta?.description),
      }))),
      // Hero Metrics - from singleton or items
      ...(Array.isArray(heroSectionSingleton?.metrics) ? heroSectionSingleton.metrics.map((m: any) => ({
        id: uuidv4(),
        name: ensureString(m?.value && m?.label ? `${m.value} · ${m.label}` : (m?.value || m?.label || m?.title || m?.name)),
        url: "#metric",
        type: "other" as const,
      })) : []),
      // Hero Metrics from items
      ...((onsite.items?.hero_metrics || []).map((m: any) => ({
        id: uuidv4(),
        name: ensureString(m?.title || m?.name || m?.value || ""),
        url: "#metric",
        type: "other" as const,
      }))),
      // Hero Media - from items
      ...((onsite.items?.hero_media || []).map((m: any) => ({
        id: uuidv4(),
        name: ensureString(m?.image_url || m?.imageUrl || m?.title || m?.url || ""),
        url: "#hero-media",
        type: "other" as const,
      }))),

      // ============ Header/Footer/Sitemap Links（直接渲染入口） ============
      ...(((onsite as any).items?.header_links || []) as any[]).map((item: any) => ({
        id: uuidv4(),
        name: ensureString(item.title || item.name || item.url),
        url: "#header-link",
        type: "other" as const,
        description: ensureString(item.url),
      })),
      ...(((onsite as any).items?.footer_links || []) as any[]).map((item: any) => ({
        id: uuidv4(),
        name: ensureString(item.title || item.name || item.url),
        url: "#footer-link",
        type: "other" as const,
        description: ensureString(item.url),
      })),
      ...(((onsite as any).items?.sitemap_urls || []) as any[]).map((item: any) => ({
        id: uuidv4(),
        name: ensureString(item.title || item.name || item.url),
        url: "#sitemap-url",
        type: "other" as const,
        description: ensureString(item.url),
      })),

      // ============ Core Pages / Key Pages ============
      // Map core_pages and key_pages to websiteContent with proper type based on pageType
      ...(((onsite as any).items?.core_pages || (onsite as any).items?.key_pages || []) as any[]).map((item: any) => {
        const pageType = item.extra?.pageType || item.pageType || "other";
        // Map pageType to websiteContent type
        let type: string = "other";
        if (pageType === "home") type = "home";
        else if (pageType === "about") type = "about";
        else if (pageType === "contact") type = "contact";
        else if (pageType === "career") type = "career";
        else if (pageType === "pricing") type = "pricing";
        else if (pageType === "faq") type = "faq";
        else if (pageType === "legal") type = "legal";
        else if (pageType === "documentation") type = "documentation";
        else if (pageType === "product") type = "product";
        else if (pageType === "case_study") type = "case_study";
        
        return {
          id: item.id || uuidv4(),
          name: ensureString(item.title || item.name || ""),
          url: ensureString(item.url || ""),
          type: type as any,
          description: ensureString(item.description || ""),
        };
      }),

      // Problem Statement
      // Support both string array format: ["item1", "item2"] 
      // and object array format: [{ title: "item1" }, { title: "item2" }]
      ...(getOnsiteSingleton("problem_statement")?.painPoints || []).map((pp: any) => ({
        id: uuidv4(),
        name: typeof pp === "string" ? pp : (pp?.title || pp?.name || ""),
        url: "#problem",
        type: "other" as const,
        description: typeof pp === "string" ? "" : (pp?.description || ""),
      })),
      // Who We Serve - targetAudiences
      // Support both string array format: ["item1", "item2"] 
      // and object array format: [{ name: "item1" }, { name: "item2" }]
      ...(getOnsiteSingleton("who_we_serve")?.targetAudiences || []).map((ta: any) => ({
        id: uuidv4(),
        name: typeof ta === "string" ? ta : (ta?.name || ""),
        url: "#audience",
        type: "other" as const,
        description: typeof ta === "string" ? "" : (ta?.description || ""),
      })),
      // Who We Serve - industries (from singleton, not items)
      ...(Array.isArray(getOnsiteSingleton("who_we_serve")?.industries) ? getOnsiteSingleton("who_we_serve").industries.map((ind: any) => ({
        id: uuidv4(),
        name: typeof ind === "string" ? ind : (ind?.name || ind?.title || ""),
        url: "#industry",
        type: "other" as const,
        description: typeof ind === "string" ? "" : (ind?.description || ""),
      })) : []),
      // Use Cases
      ...(onsite.items?.use_cases || []).map((uc: any) => ({
        id: uuidv4(),
        name: uc.title || uc.name || "",
        url: "#use-case",
        type: "other" as const,
        description: uc.description || "",
      })),
      // Industries
      ...(onsite.items?.industries || []).map((ind: any) => ({
        id: uuidv4(),
        name: ind.title || ind.name || "",
        url: "#industry",
        type: "other" as const,
        description: ind.description || "",
      })),
      // Case Studies
      ...(onsite.items?.case_studies || []).map((cs: any) => ({
        id: uuidv4(),
        name: cs.title || cs.name || "",
        url: cs.url || "",
        type: "case_study" as const,
        description: cs.description || "",
      })),
      // Testimonials
      ...(onsite.items?.testimonials || []).map((t: any) => ({
        id: uuidv4(),
        name: t.title || t.quote || t.name || "",
        url: "",
        type: "testimonial" as const,
        description: t.description || "",
      })),
      // Trust Badges
      ...(onsite.items?.trust_badges || []).map((tb: any) => ({
        id: uuidv4(),
        name: tb.title || tb.name || "",
        url: "#trust-badge",
        type: "other" as const,
        description: tb.description || "",
      })),
      // FAQs
      ...(onsite.items?.faqs || []).map((faq: any) => ({
        id: uuidv4(),
        name: faq.title || faq.extra?.title || faq.extra?.question || faq.question || "",
        url: "",
        type: "faq" as const,
        description: faq.description || faq.extra?.description || faq.extra?.answer || faq.answer || "",
      })),
      // Contact Info
      ...(ensureString((brand as any)?.contact?.email || contactInfoSingleton?.email) ? [{
        id: uuidv4(),
        name: ensureString((brand as any)?.contact?.email || contactInfoSingleton?.email),
        url: "#contact-email",
        type: "other" as const,
      }] : []),
      ...(ensureString((brand as any)?.contact?.phone || contactInfoSingleton?.phone) ? [{
        id: uuidv4(),
        name: ensureString((brand as any)?.contact?.phone || contactInfoSingleton?.phone),
        url: "#contact-phone",
        type: "other" as const,
      }] : []),
      ...(ensureString((brand as any)?.contact?.address || contactInfoSingleton?.address) ? [{
        id: uuidv4(),
        name: ensureString((brand as any)?.contact?.address || contactInfoSingleton?.address),
        url: "#contact-address",
        type: "other" as const,
      }] : []),
    ],
    team: (onsite.persons?.leadership_team || []).map((member: any) => ({
      id: uuidv4(),
      name: member.name || "",
      role: member.title || member.role || "",
      bio: member.bio || member.description || "",
      linkedin: member.social_links?.find((sl: any) => sl.platform === "LinkedIn")?.url || member.linkedin,
    })),
  };

  // 转换 Offsite 数据
  const offSite: OffSiteContext = {
    monitoringScope: {
      brandKeywords: ensureStringArray(monitoringScopeSingleton?.brandKeywords),
      domainName: ensureString(monitoringScopeSingleton?.domainName),
      productKeywords: ensureStringArray(monitoringScopeSingleton?.productKeywords),
      hashtags: ensureStringArray(monitoringScopeSingleton?.hashtags),
      keyPersons: ensureStringArray(monitoringScopeSingleton?.keyPersons),
      languages: ensureStringArray(monitoringScopeSingleton?.languages),
      regions: ensureStringArray(monitoringScopeSingleton?.regions),
      requiredKeywords: ensureStringArray(monitoringScopeSingleton?.requiredKeywords),
      excludedKeywords: ensureStringArray(monitoringScopeSingleton?.excludedKeywords),
    },
    socialAccounts: (offsite.entities?.social_profiles || []).map((sp: any) => ({
      id: uuidv4(),
      platform: sp.platform || "",
      accountName: sp.name || "",
      url: sp.url || "",
      isPriority: sp.entity_type === "official",
    })),
    executiveAccounts: [],
    partnerAccounts: [],
    communities: [],
    qaPlatforms: [],
    professionalNetworks: [],
    mediaSources: [],
    videoPlatforms: [],
    podcastNewsletters: [],
    reviewPlatforms: (offsite.entities?.review_platforms || []).map((rp: any) => {
      return {
        id: rp.id || uuidv4(),
        platform: normalizeReviewPlatform(rp.platform || rp.name, rp.url),
        profileUrl: rp.url || "",
        fetchDetails: true,
      };
    }),
    appStores: [],
    verticalReviewSites: [],
    ecommercePlatforms: [],
    competitorConfigs: (offsite.entities?.competitors || []).map((comp: any) => ({
      id: uuidv4(),
      name: comp.name || "",
      brandKeywords: comp.brandKeywords || [],
      domain: comp.url || "",
      socialAccounts: [],
      reviewLinks: [],
      includeInSOV: true,
    })),
    influencerAccounts: (offsite.persons?.kols || []).map((kol: any) => ({
      id: uuidv4(),
      name: kol.name || "",
      platform: kol.platform || "",
      url: kol.url || kol.handle ? `https://${kol.platform}/${kol.handle}` : "",
      role: "kol" as const,
      tier: "1" as const,
    })),
    searchEngineTracking: [],
    serpCompetitors: [],
    directoryListings: [],
    guestPosts: [],
    backlinks: [],
    externalEvents: [],
    metricsConfig: {
      trackMentionsVolume: true,
      trackSentiment: true,
      trackReach: false,
      trackEngagement: false,
      trackShareOfVoice: false,
      trackReputationScore: false,
      trackTopSources: false,
      benchmarkPeriod: '30d',
      trackCompetitorSOV: false,
    },
    alertConfig: {
      channels: [],
      rules: [],
    },
    collectionSettings: {
      frequency: 'daily',
      historicalDepth: '30d',
      excludeBots: false,
      verifiedOnly: false,
      minEngagement: 0,
    },
    // Legacy fields
    officialAccounts: (offsite.entities?.social_profiles || []).map((sp: any) => ({
      id: uuidv4(),
      platform: sp.platform as any,
      accountName: sp.name || "",
      url: sp.url || "",
      verificationStatus: sp.entity_type === "official" ? "verified" as const : "unverified" as const,
    })),
    pressReleases: (offsite.items?.press_coverage || []).map((item: any) => ({
      id: uuidv4(),
      title: item.title || item.name || "",
      url: item.url || "",
      type: (item.extra?.type || item.type || "media_coverage") as "press_release" | "media_coverage" | "interview" | "news_mention",
      source: item.extra?.publication || item.publication || "",
      publishDate: item.extra?.date || item.date || item.created_at || undefined,
      summary: item.description || item.extra?.snippet || undefined,
    })),
    socialMediaContent: [],
    partnerships: [],
    customerReviews: [],
  };

  // Knowledge 数据使用现有的文件上传 API 单独管理，不从 /api/context/all 获取
  const knowledge: KnowledgeContext = {
    sources: [],
    sourceLimit: 50,
    competitors: [],
    audiencePersonas: [],
    marketIntelligence: [],
    userUploads: [],
    agentGenerated: [],
  };

  return {
    onSite,
    offSite,
    knowledge,
    metadata: {
      lastUpdated: new Date().toISOString(),
      version: "2.0.0",
    },
  };
}

