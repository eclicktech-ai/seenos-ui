/**
 * Data Normalizers - Convert between API and UI formats
 */

import type { ContextPerson, ContextEntity } from "@/lib/api/client";

/**
 * Normalize ContextPerson to handle both camelCase and snake_case
 */
export function normalizeContextPerson(p: any): ContextPerson {
  const socialLinksRaw = p?.social_links ?? p?.socialLinks ?? [];
  const social_links = Array.isArray(socialLinksRaw)
    ? socialLinksRaw
        .map((x: any) => ({
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
}

/**
 * Normalize ContextEntity
 */
export function normalizeContextEntity(e: any): ContextEntity {
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
}

/**
 * Infer social media platform from URL
 */
export function inferSocialPlatform(url: string): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "Twitter/X";
  if (lower.includes("linkedin.com")) return "LinkedIn";
  if (lower.includes("facebook.com")) return "Facebook";
  if (lower.includes("instagram.com")) return "Instagram";
  if (lower.includes("youtube.com")) return "YouTube";
  if (lower.includes("tiktok.com")) return "TikTok";
  if (lower.includes("reddit.com")) return "Reddit";
  if (lower.includes("github.com")) return "GitHub";
  return null;
}

/**
 * Normalize social profiles entities
 */
export function normalizeSocialProfilesEntities(
  entities: ContextEntity[]
): ContextEntity[] {
  return entities.map((e) => {
    const inferredPlatform = inferSocialPlatform(e.url || "");
    return {
      ...e,
      platform: e.platform || inferredPlatform || "Other",
    };
  });
}







