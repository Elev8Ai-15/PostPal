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
