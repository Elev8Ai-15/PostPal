/**
 * Content Store - Centralized content management
 * Provides a unified interface for content across the app
 * Uses AsyncStorage for local data and tRPC for server data
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage keys
const KEYS = {
  LOCAL_DRAFTS: "postpal_local_drafts",
  ACTIVITY_LOG: "postpal_activity_log",
  POST_STATS: "postpal_post_stats",
  QUICK_POST_LOG: "postpal_quick_post_log",
} as const;

// Types
export interface LocalDraft {
  id: string;
  title: string;
  content: string;
  contentType: "social" | "blog" | "newsletter" | "video";
  platform: string;
  createdAt: string;
  status: "draft" | "pending" | "approved" | "rejected";
  aiGenerated?: boolean;
}

export interface ActivityEntry {
  id: string;
  type: "created" | "approved" | "scheduled" | "published" | "rejected" | "quick_posted";
  title: string;
  platform?: string;
  timestamp: string;
}

export interface PostStats {
  totalCreated: number;
  totalApproved: number;
  totalScheduled: number;
  totalPublished: number;
  totalQuickPosted: number;
  platformCounts: Record<string, number>;
  weeklyCreated: number;
  weekStartDate: string;
  lastActivityDate: string;
}

const DEFAULT_STATS: PostStats = {
  totalCreated: 0,
  totalApproved: 0,
  totalScheduled: 0,
  totalPublished: 0,
  totalQuickPosted: 0,
  platformCounts: {},
  weeklyCreated: 0,
  weekStartDate: new Date().toISOString(),
  lastActivityDate: "",
};

// ============ LOCAL DRAFTS ============

export async function getLocalDrafts(): Promise<LocalDraft[]> {
  try {
    const stored = await AsyncStorage.getItem(KEYS.LOCAL_DRAFTS);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (error) {
    console.error("Failed to load local drafts:", error);
    return [];
  }
}

export async function getPendingDrafts(): Promise<LocalDraft[]> {
  const drafts = await getLocalDrafts();
  return drafts.filter(d => d.status === "draft" || d.status === "pending");
}

export async function updateDraftStatus(id: string, status: LocalDraft["status"]): Promise<void> {
  try {
    const drafts = await getLocalDrafts();
    const updated = drafts.map(d => d.id === id ? { ...d, status } : d);
    await AsyncStorage.setItem(KEYS.LOCAL_DRAFTS, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to update draft status:", error);
  }
}

export async function updateDraftContent(id: string, content: string): Promise<void> {
  try {
    const drafts = await getLocalDrafts();
    const updated = drafts.map(d => d.id === id ? { ...d, content } : d);
    await AsyncStorage.setItem(KEYS.LOCAL_DRAFTS, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to update draft content:", error);
  }
}

export async function deleteDraft(id: string): Promise<void> {
  try {
    const drafts = await getLocalDrafts();
    const updated = drafts.filter(d => d.id !== id);
    await AsyncStorage.setItem(KEYS.LOCAL_DRAFTS, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to delete draft:", error);
  }
}

// ============ ACTIVITY LOG ============

export async function getActivityLog(limit: number = 20): Promise<ActivityEntry[]> {
  try {
    const stored = await AsyncStorage.getItem(KEYS.ACTIVITY_LOG);
    if (stored) {
      const entries: ActivityEntry[] = JSON.parse(stored);
      return entries.slice(0, limit);
    }
    return [];
  } catch (error) {
    console.error("Failed to load activity log:", error);
    return [];
  }
}

export async function logActivity(entry: Omit<ActivityEntry, "id" | "timestamp">): Promise<void> {
  try {
    const existing = await getActivityLog(100);
    const newEntry: ActivityEntry = {
      ...entry,
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...existing].slice(0, 100); // Keep last 100
    await AsyncStorage.setItem(KEYS.ACTIVITY_LOG, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

// ============ POST STATS ============

export async function getPostStats(): Promise<PostStats> {
  try {
    const stored = await AsyncStorage.getItem(KEYS.POST_STATS);
    if (stored) {
      const stats: PostStats = JSON.parse(stored);
      // Reset weekly count if week has passed
      const weekStart = new Date(stats.weekStartDate);
      const now = new Date();
      const daysSinceWeekStart = (now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceWeekStart >= 7) {
        stats.weeklyCreated = 0;
        stats.weekStartDate = now.toISOString();
        await AsyncStorage.setItem(KEYS.POST_STATS, JSON.stringify(stats));
      }
      return stats;
    }
    return { ...DEFAULT_STATS };
  } catch (error) {
    console.error("Failed to load post stats:", error);
    return { ...DEFAULT_STATS };
  }
}

export async function incrementStat(
  action: "created" | "approved" | "scheduled" | "published" | "quick_posted",
  platform?: string
): Promise<void> {
  try {
    const stats = await getPostStats();
    
    switch (action) {
      case "created":
        stats.totalCreated += 1;
        stats.weeklyCreated += 1;
        break;
      case "approved":
        stats.totalApproved += 1;
        break;
      case "scheduled":
        stats.totalScheduled += 1;
        break;
      case "published":
        stats.totalPublished += 1;
        break;
      case "quick_posted":
        stats.totalQuickPosted += 1;
        break;
    }
    
    if (platform) {
      stats.platformCounts[platform] = (stats.platformCounts[platform] || 0) + 1;
    }
    
    stats.lastActivityDate = new Date().toISOString();
    await AsyncStorage.setItem(KEYS.POST_STATS, JSON.stringify(stats));
  } catch (error) {
    console.error("Failed to increment stat:", error);
  }
}

// ============ QUICK POST LOG ============

export interface QuickPostEntry {
  id: string;
  platform: string;
  contentPreview: string;
  timestamp: string;
}

export async function logQuickPost(platform: string, content: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(KEYS.QUICK_POST_LOG);
    const existing: QuickPostEntry[] = stored ? JSON.parse(stored) : [];
    const entry: QuickPostEntry = {
      id: `qp_${Date.now()}`,
      platform,
      contentPreview: content.substring(0, 100),
      timestamp: new Date().toISOString(),
    };
    const updated = [entry, ...existing].slice(0, 50);
    await AsyncStorage.setItem(KEYS.QUICK_POST_LOG, JSON.stringify(updated));
    
    // Also increment stats and log activity
    await incrementStat("quick_posted", platform);
    await logActivity({
      type: "quick_posted",
      title: `Quick posted to ${platform}`,
      platform,
    });
  } catch (error) {
    console.error("Failed to log quick post:", error);
  }
}

// ============ HELPERS ============

export function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function hasAnyData(stats: PostStats): boolean {
  return stats.totalCreated > 0 || stats.totalQuickPosted > 0;
}
