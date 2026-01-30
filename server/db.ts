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
