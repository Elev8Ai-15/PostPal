import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

import { desc, and, gte, lte } from "drizzle-orm";
import {
  posts,
  socialAccounts,
  analytics,
  strategies,
  InsertPost,
  InsertSocialAccount,
  InsertAnalytics,
  InsertStrategy,
} from "../drizzle/schema";

// ============ POSTS ============

export async function getUserPosts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt));
}

export async function getPendingPosts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts).where(and(eq(posts.userId, userId), eq(posts.status, "pending"))).orderBy(desc(posts.createdAt));
}

export async function getScheduledPosts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts).where(and(eq(posts.userId, userId), eq(posts.status, "scheduled"))).orderBy(posts.scheduledAt);
}

export async function createPost(data: InsertPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(posts).values(data);
  return result[0].insertId;
}

export async function updatePost(id: number, userId: number, data: Partial<InsertPost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(posts).set(data).where(and(eq(posts.id, id), eq(posts.userId, userId)));
}

export async function deletePost(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(posts).where(and(eq(posts.id, id), eq(posts.userId, userId)));
}

export async function getPostById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(posts).where(and(eq(posts.id, id), eq(posts.userId, userId)));
  return result[0] || null;
}

// ============ SOCIAL ACCOUNTS ============

export async function getUserSocialAccounts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(socialAccounts).where(eq(socialAccounts.userId, userId));
}

export async function connectSocialAccount(data: InsertSocialAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(socialAccounts).values(data);
  return result[0].insertId;
}

export async function updateSocialAccount(id: number, userId: number, data: Partial<InsertSocialAccount>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(socialAccounts).set(data).where(and(eq(socialAccounts.id, id), eq(socialAccounts.userId, userId)));
}

export async function disconnectSocialAccount(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(socialAccounts).set({ isConnected: false }).where(and(eq(socialAccounts.id, id), eq(socialAccounts.userId, userId)));
}

// ============ ANALYTICS ============

export async function getUserAnalytics(userId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  if (startDate && endDate) {
    return db.select().from(analytics).where(
      and(
        eq(analytics.userId, userId),
        gte(analytics.date, startDate),
        lte(analytics.date, endDate)
      )
    ).orderBy(desc(analytics.date));
  }
  
  return db.select().from(analytics).where(eq(analytics.userId, userId)).orderBy(desc(analytics.date));
}

export async function recordAnalytics(data: InsertAnalytics) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(analytics).values(data);
  return result[0].insertId;
}

// ============ STRATEGIES ============

export async function getUserStrategy(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(strategies).where(and(eq(strategies.userId, userId), eq(strategies.isActive, true)));
  return result[0] || null;
}

export async function createStrategy(data: InsertStrategy) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(strategies).values(data);
  return result[0].insertId;
}

export async function updateStrategy(id: number, userId: number, data: Partial<InsertStrategy>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(strategies).set(data).where(and(eq(strategies.id, id), eq(strategies.userId, userId)));
}

// ============ DASHBOARD STATS ============

export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return { pendingCount: 0, scheduledCount: 0, publishedCount: 0 };
  
  const pending = await db.select().from(posts).where(and(eq(posts.userId, userId), eq(posts.status, "pending")));
  const scheduled = await db.select().from(posts).where(and(eq(posts.userId, userId), eq(posts.status, "scheduled")));
  const published = await db.select().from(posts).where(and(eq(posts.userId, userId), eq(posts.status, "published")));
  
  return {
    pendingCount: pending.length,
    scheduledCount: scheduled.length,
    publishedCount: published.length,
  };
}


// ============ POST TEMPLATES (Recurring) ============

import {
  postTemplates,
  notificationSettings,
  InsertPostTemplate,
  InsertNotificationSettings,
} from "../drizzle/schema";

export async function getUserTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(postTemplates).where(eq(postTemplates.userId, userId)).orderBy(desc(postTemplates.createdAt));
}

export async function getActiveTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(postTemplates).where(and(eq(postTemplates.userId, userId), eq(postTemplates.isActive, true)));
}

export async function getTemplateById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(postTemplates).where(and(eq(postTemplates.id, id), eq(postTemplates.userId, userId)));
  return result[0] || null;
}

export async function createTemplate(data: InsertPostTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(postTemplates).values(data);
  return result[0].insertId;
}

export async function updateTemplate(id: number, userId: number, data: Partial<InsertPostTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(postTemplates).set(data).where(and(eq(postTemplates.id, id), eq(postTemplates.userId, userId)));
}

export async function deleteTemplate(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(postTemplates).where(and(eq(postTemplates.id, id), eq(postTemplates.userId, userId)));
}

// ============ NOTIFICATION SETTINGS ============

export async function getUserNotificationSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(notificationSettings).where(eq(notificationSettings.userId, userId));
  return result[0] || null;
}

export async function upsertNotificationSettings(userId: number, data: Partial<InsertNotificationSettings>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserNotificationSettings(userId);
  if (existing) {
    await db.update(notificationSettings).set(data).where(eq(notificationSettings.userId, userId));
  } else {
    await db.insert(notificationSettings).values({ userId, ...data });
  }
}

// ============ POSTS WITH REMINDERS ============

export async function getPostsNeedingReminders() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  // Get posts scheduled within the next hour that haven't had reminders sent
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  
  return db.select().from(posts).where(
    and(
      eq(posts.status, "scheduled"),
      eq(posts.reminderEnabled, true),
      eq(posts.reminderSent, false),
      gte(posts.scheduledAt, now),
      lte(posts.scheduledAt, oneHourFromNow)
    )
  );
}

export async function markReminderSent(postId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(posts).set({ reminderSent: true }).where(eq(posts.id, postId));
}

// ============ RECURRING POSTS GENERATION ============

export async function getTemplatesNeedingGeneration() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  
  return db.select().from(postTemplates).where(
    and(
      eq(postTemplates.isActive, true),
      lte(postTemplates.nextScheduledAt, now)
    )
  );
}

export async function updateTemplateNextSchedule(id: number, nextScheduledAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(postTemplates).set({ 
    lastGeneratedAt: new Date(),
    nextScheduledAt 
  }).where(eq(postTemplates.id, id));
}

// ============ UNIFIED SOCIAL INBOX ============

import {
  inboxMessages,
  savedReplies,
  autoResponders,
  InsertInboxMessage,
  InsertSavedReply,
  InsertAutoResponder,
} from "../drizzle/schema";

// Inbox Messages
export async function getInboxMessages(userId: number, filters?: {
  platform?: string;
  messageType?: string;
  isRead?: boolean;
  isArchived?: boolean;
  isStarred?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(inboxMessages.userId, userId)];
  
  if (filters?.platform && filters.platform !== "all") {
    conditions.push(eq(inboxMessages.platform, filters.platform as any));
  }
  if (filters?.messageType && filters.messageType !== "all") {
    conditions.push(eq(inboxMessages.messageType, filters.messageType as any));
  }
  if (filters?.isRead !== undefined) {
    conditions.push(eq(inboxMessages.isRead, filters.isRead));
  }
  if (filters?.isArchived !== undefined) {
    conditions.push(eq(inboxMessages.isArchived, filters.isArchived));
  }
  if (filters?.isStarred !== undefined) {
    conditions.push(eq(inboxMessages.isStarred, filters.isStarred));
  }
  
  return db.select().from(inboxMessages)
    .where(and(...conditions))
    .orderBy(desc(inboxMessages.receivedAt));
}

export async function getInboxMessageById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(inboxMessages)
    .where(and(eq(inboxMessages.id, id), eq(inboxMessages.userId, userId)));
  return result[0] || null;
}

export async function createInboxMessage(data: InsertInboxMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(inboxMessages).values(data);
  return result[0].insertId;
}

export async function updateInboxMessage(id: number, userId: number, data: Partial<InsertInboxMessage>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(inboxMessages).set(data)
    .where(and(eq(inboxMessages.id, id), eq(inboxMessages.userId, userId)));
}

export async function markMessageRead(id: number, userId: number) {
  return updateInboxMessage(id, userId, { isRead: true });
}

export async function markMessageStarred(id: number, userId: number, isStarred: boolean) {
  return updateInboxMessage(id, userId, { isStarred });
}

export async function archiveMessage(id: number, userId: number) {
  return updateInboxMessage(id, userId, { isArchived: true });
}

export async function deleteInboxMessage(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(inboxMessages).where(and(eq(inboxMessages.id, id), eq(inboxMessages.userId, userId)));
}

export async function getUnreadCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(inboxMessages)
    .where(and(eq(inboxMessages.userId, userId), eq(inboxMessages.isRead, false), eq(inboxMessages.isArchived, false)));
  return result.length;
}

// Saved Replies
export async function getSavedReplies(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedReplies)
    .where(eq(savedReplies.userId, userId))
    .orderBy(desc(savedReplies.useCount));
}

export async function getSavedReplyById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(savedReplies)
    .where(and(eq(savedReplies.id, id), eq(savedReplies.userId, userId)));
  return result[0] || null;
}

export async function createSavedReply(data: InsertSavedReply) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(savedReplies).values(data);
  return result[0].insertId;
}

export async function updateSavedReply(id: number, userId: number, data: Partial<InsertSavedReply>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(savedReplies).set(data)
    .where(and(eq(savedReplies.id, id), eq(savedReplies.userId, userId)));
}

export async function deleteSavedReply(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(savedReplies).where(and(eq(savedReplies.id, id), eq(savedReplies.userId, userId)));
}

export async function incrementSavedReplyUseCount(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const reply = await getSavedReplyById(id, userId);
  if (reply) {
    await db.update(savedReplies).set({ useCount: reply.useCount + 1 })
      .where(eq(savedReplies.id, id));
  }
}

// Auto Responders
export async function getAutoResponders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(autoResponders)
    .where(eq(autoResponders.userId, userId))
    .orderBy(desc(autoResponders.createdAt));
}

export async function getActiveAutoResponders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(autoResponders)
    .where(and(eq(autoResponders.userId, userId), eq(autoResponders.isActive, true)));
}

export async function getAutoResponderById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(autoResponders)
    .where(and(eq(autoResponders.id, id), eq(autoResponders.userId, userId)));
  return result[0] || null;
}

export async function createAutoResponder(data: InsertAutoResponder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(autoResponders).values(data);
  return result[0].insertId;
}

export async function updateAutoResponder(id: number, userId: number, data: Partial<InsertAutoResponder>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(autoResponders).set(data)
    .where(and(eq(autoResponders.id, id), eq(autoResponders.userId, userId)));
}

export async function deleteAutoResponder(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(autoResponders).where(and(eq(autoResponders.id, id), eq(autoResponders.userId, userId)));
}

export async function incrementAutoResponderUseCount(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const responder = await db.select().from(autoResponders).where(eq(autoResponders.id, id));
  if (responder[0]) {
    await db.update(autoResponders).set({ useCount: responder[0].useCount + 1 })
      .where(eq(autoResponders.id, id));
  }
}

// ============ CAMPAIGNS ============

import {
  campaigns,
  campaignPosts,
  InsertCampaign,
  InsertCampaignPost,
} from "../drizzle/schema";

export async function getUserCampaigns(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
  return result[0] || null;
}

export async function createCampaign(data: InsertCampaign) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(campaigns).values(data);
  return result[0].insertId;
}

export async function updateCampaign(id: number, userId: number, data: Partial<InsertCampaign>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(campaigns).set(data).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
}

export async function deleteCampaign(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete campaign posts first
  await db.delete(campaignPosts).where(eq(campaignPosts.campaignId, id));
  // Then delete campaign
  await db.delete(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
}

// ============ CAMPAIGN POSTS ============

export async function getCampaignPosts(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaignPosts).where(eq(campaignPosts.campaignId, campaignId));
}

export async function addPostToCampaign(data: InsertCampaignPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(campaignPosts).values(data);
  return result[0].insertId;
}

export async function updateCampaignPostMetrics(id: number, data: Partial<InsertCampaignPost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(campaignPosts).set(data).where(eq(campaignPosts.id, id));
}

export async function removePostFromCampaign(campaignPostId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(campaignPosts).where(eq(campaignPosts.id, campaignPostId));
}

// ============ CAMPAIGN ANALYTICS ============

export async function getCampaignAnalytics(campaignId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const campaignPostsData = await db.select().from(campaignPosts).where(eq(campaignPosts.campaignId, campaignId));
  
  if (campaignPostsData.length === 0) {
    return {
      totalImpressions: 0,
      totalEngagement: 0,
      totalClicks: 0,
      platformBreakdown: [],
      bestPlatform: null,
    };
  }
  
  // Calculate totals
  const totals = campaignPostsData.reduce((acc, post) => ({
    impressions: acc.impressions + (post.impressions || 0),
    engagement: acc.engagement + (post.engagement || 0),
    clicks: acc.clicks + (post.clicks || 0),
  }), { impressions: 0, engagement: 0, clicks: 0 });
  
  // Group by platform
  const platformMap = new Map<string, { impressions: number; engagement: number; clicks: number; count: number }>();
  campaignPostsData.forEach(post => {
    const existing = platformMap.get(post.platform) || { impressions: 0, engagement: 0, clicks: 0, count: 0 };
    platformMap.set(post.platform, {
      impressions: existing.impressions + (post.impressions || 0),
      engagement: existing.engagement + (post.engagement || 0),
      clicks: existing.clicks + (post.clicks || 0),
      count: existing.count + 1,
    });
  });
  
  const platformBreakdown = Array.from(platformMap.entries()).map(([platform, data]) => ({
    platform,
    ...data,
    engagementRate: data.impressions > 0 ? (data.engagement / data.impressions) * 100 : 0,
  }));
  
  // Find best performing platform by engagement rate
  const bestPlatform = platformBreakdown.reduce((best, current) => 
    current.engagementRate > (best?.engagementRate || 0) ? current : best
  , platformBreakdown[0]);
  
  return {
    totalImpressions: totals.impressions,
    totalEngagement: totals.engagement,
    totalClicks: totals.clicks,
    platformBreakdown,
    bestPlatform: bestPlatform?.platform || null,
  };
}

export async function updateCampaignAggregates(campaignId: number, userId: number) {
  const analytics = await getCampaignAnalytics(campaignId);
  if (!analytics) return;
  
  await updateCampaign(campaignId, userId, {
    totalImpressions: analytics.totalImpressions,
    totalEngagement: analytics.totalEngagement,
    totalClicks: analytics.totalClicks,
    bestPlatform: analytics.bestPlatform,
  });
}


// ============ SUBSCRIPTIONS ============

import {
  subscriptionPlans,
  userSubscriptions,
  paymentHistory,
  InsertSubscriptionPlan,
  InsertUserSubscription,
  InsertPaymentHistory,
} from "../drizzle/schema";

// Subscription Plans
export async function getAllPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionPlans)
    .where(eq(subscriptionPlans.isActive, true))
    .orderBy(subscriptionPlans.sortOrder);
}

export async function getPlanByName(name: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(subscriptionPlans)
    .where(eq(subscriptionPlans.name, name));
  return result[0] || null;
}

export async function getPlanById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(subscriptionPlans)
    .where(eq(subscriptionPlans.id, id));
  return result[0] || null;
}

export async function createPlan(data: InsertSubscriptionPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subscriptionPlans).values(data);
  return result[0].insertId;
}

export async function updatePlan(id: number, data: Partial<InsertSubscriptionPlan>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subscriptionPlans).set(data)
    .where(eq(subscriptionPlans.id, id));
}

export async function upsertPlan(data: InsertSubscriptionPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getPlanByName(data.name);
  if (existing) {
    await updatePlan(existing.id, data);
    return existing.id;
  }
  return createPlan(data);
}

// User Subscriptions
export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));
  return result[0] || null;
}

export async function getUserSubscriptionWithPlan(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const subscription = await getUserSubscription(userId);
  if (!subscription) {
    // Return free plan by default
    const freePlan = await getPlanByName("free");
    return {
      subscription: null,
      plan: freePlan,
    };
  }
  
  const plan = await getPlanById(subscription.planId);
  return { subscription, plan };
}

export async function createUserSubscription(data: InsertUserSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(userSubscriptions).values(data);
  return result[0].insertId;
}

export async function updateUserSubscription(userId: number, data: Partial<InsertUserSubscription>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userSubscriptions).set(data)
    .where(eq(userSubscriptions.userId, userId));
}

export async function upsertUserSubscription(userId: number, data: Omit<InsertUserSubscription, "userId">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserSubscription(userId);
  if (existing) {
    await updateUserSubscription(userId, data);
    return existing.id;
  }
  return createUserSubscription({ ...data, userId });
}

export async function incrementPostCount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const subscription = await getUserSubscription(userId);
  if (!subscription) return;
  
  // Check if we need to reset the week counter
  const now = new Date();
  const weekStart = subscription.weekStartDate;
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  if (!weekStart || weekStart < oneWeekAgo) {
    // Reset counter for new week
    await updateUserSubscription(userId, {
      postsThisWeek: 1,
      weekStartDate: now,
    });
  } else {
    // Increment counter
    await updateUserSubscription(userId, {
      postsThisWeek: subscription.postsThisWeek + 1,
    });
  }
}

export async function canUserPost(userId: number): Promise<{ canPost: boolean; reason?: string; limit?: number; used?: number }> {
  const subData = await getUserSubscriptionWithPlan(userId);
  if (!subData || !subData.plan) {
    return { canPost: true }; // Allow if no plan data (fallback)
  }
  
  const { subscription, plan } = subData;
  
  // Unlimited posts
  if (plan.maxPostsPerWeek === -1) {
    return { canPost: true };
  }
  
  // Check weekly limit
  const postsThisWeek = subscription?.postsThisWeek || 0;
  const weekStart = subscription?.weekStartDate;
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // If week has reset, user can post
  if (!weekStart || weekStart < oneWeekAgo) {
    return { canPost: true, limit: plan.maxPostsPerWeek, used: 0 };
  }
  
  if (postsThisWeek >= plan.maxPostsPerWeek) {
    return {
      canPost: false,
      reason: `You've reached your weekly limit of ${plan.maxPostsPerWeek} posts. Upgrade to post more!`,
      limit: plan.maxPostsPerWeek,
      used: postsThisWeek,
    };
  }
  
  return { canPost: true, limit: plan.maxPostsPerWeek, used: postsThisWeek };
}

export async function canUserUsePlatform(userId: number, platformCount: number): Promise<{ canUse: boolean; reason?: string; limit?: number }> {
  const subData = await getUserSubscriptionWithPlan(userId);
  if (!subData || !subData.plan) {
    return { canUse: true };
  }
  
  const { plan } = subData;
  
  if (platformCount > plan.maxPlatforms) {
    return {
      canUse: false,
      reason: `Your plan allows ${plan.maxPlatforms} platform(s). Upgrade to use more!`,
      limit: plan.maxPlatforms,
    };
  }
  
  return { canUse: true, limit: plan.maxPlatforms };
}

export async function hasFeature(userId: number, feature: string): Promise<boolean> {
  const subData = await getUserSubscriptionWithPlan(userId);
  if (!subData || !subData.plan) {
    return false;
  }
  
  const { plan } = subData;
  const featureKey = feature as keyof typeof plan;
  
  if (featureKey in plan) {
    return Boolean(plan[featureKey]);
  }
  
  return false;
}

// Payment History
export async function getUserPaymentHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(paymentHistory)
    .where(eq(paymentHistory.userId, userId))
    .orderBy(desc(paymentHistory.createdAt));
}

export async function createPaymentRecord(data: InsertPaymentHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(paymentHistory).values(data);
  return result[0].insertId;
}

// Initialize default plans
export async function initializeSubscriptionPlans() {
  const { SUBSCRIPTION_TIERS } = await import("./stripe");
  
  const plans = [
    { ...SUBSCRIPTION_TIERS.free, sortOrder: 0 },
    { ...SUBSCRIPTION_TIERS.basic, sortOrder: 1 },
    { ...SUBSCRIPTION_TIERS.pro, sortOrder: 2 },
    { ...SUBSCRIPTION_TIERS.vibe, sortOrder: 3 },
  ];
  
  for (const tier of plans) {
    await upsertPlan({
      name: tier.name,
      displayName: tier.displayName,
      description: tier.description,
      priceMonthly: tier.priceMonthly,
      priceYearly: tier.priceYearly,
      maxPlatforms: tier.maxPlatforms,
      maxPostsPerWeek: tier.maxPostsPerWeek,
      maxTeamMembers: tier.maxTeamMembers,
      analyticsRetentionDays: tier.analyticsRetentionDays,
      ...tier.features,
      sortOrder: tier.sortOrder,
      isActive: true,
    });
  }
  
  console.log("[Database] Subscription plans initialized");
}
