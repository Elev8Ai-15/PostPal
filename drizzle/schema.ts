import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Social media accounts connected by users
 */
export const socialAccounts = mysqlTable("social_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["instagram", "twitter", "linkedin", "facebook", "youtube"]).notNull(),
  accountName: varchar("accountName", { length: 255 }),
  accountId: varchar("accountId", { length: 255 }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  isConnected: boolean("isConnected").default(true).notNull(),
  followerCount: int("followerCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialAccount = typeof socialAccounts.$inferSelect;
export type InsertSocialAccount = typeof socialAccounts.$inferInsert;

/**
 * Content posts created by users
 */
export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  contentType: mysqlEnum("contentType", ["social", "blog", "newsletter", "video"]).notNull(),
  platform: mysqlEnum("platform", ["instagram", "twitter", "linkedin", "facebook", "youtube", "email", "blog"]),
  status: mysqlEnum("status", ["draft", "pending", "approved", "scheduled", "published", "rejected"]).default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  publishedAt: timestamp("publishedAt"),
  imageUrl: text("imageUrl"),
  thumbnailUrl: text("thumbnailUrl"),
  hashtags: text("hashtags"),
  aiGenerated: boolean("aiGenerated").default(false).notNull(),
  engagementScore: int("engagementScore").default(0),
  impressions: int("impressions").default(0),
  clicks: int("clicks").default(0),
  // Notification reminder settings
  reminderEnabled: boolean("reminderEnabled").default(true).notNull(),
  reminderMinutesBefore: int("reminderMinutesBefore").default(30),
  reminderSent: boolean("reminderSent").default(false).notNull(),
  // Recurring post reference
  templateId: int("templateId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

/**
 * Recurring post templates
 */
export const postTemplates = mysqlTable("post_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  contentType: mysqlEnum("contentType", ["social", "blog", "newsletter", "video"]).notNull(),
  platform: mysqlEnum("platform", ["instagram", "twitter", "linkedin", "facebook", "youtube", "email", "blog"]),
  // Recurrence settings
  recurrenceType: mysqlEnum("recurrenceType", ["daily", "weekly", "biweekly", "monthly"]).notNull(),
  recurrenceDays: varchar("recurrenceDays", { length: 50 }), // e.g., "1,3,5" for Mon, Wed, Fri
  recurrenceTime: varchar("recurrenceTime", { length: 10 }), // e.g., "09:00"
  isActive: boolean("isActive").default(true).notNull(),
  lastGeneratedAt: timestamp("lastGeneratedAt"),
  nextScheduledAt: timestamp("nextScheduledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PostTemplate = typeof postTemplates.$inferSelect;
export type InsertPostTemplate = typeof postTemplates.$inferInsert;

/**
 * Analytics data for tracking performance
 */
export const analytics = mysqlTable("analytics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: timestamp("date").notNull(),
  followers: int("followers").default(0),
  impressions: int("impressions").default(0),
  engagement: int("engagement").default(0),
  clicks: int("clicks").default(0),
  platform: mysqlEnum("platform", ["instagram", "twitter", "linkedin", "facebook", "youtube", "all"]).default("all").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = typeof analytics.$inferInsert;

/**
 * Marketing strategy generated for users
 */
export const strategies = mysqlTable("strategies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary"),
  goals: text("goals"),
  contentPillars: text("contentPillars"),
  targetAudience: text("targetAudience"),
  recommendations: text("recommendations"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Strategy = typeof strategies.$inferSelect;
export type InsertStrategy = typeof strategies.$inferInsert;

/**
 * Notification settings for users
 */
export const notificationSettings = mysqlTable("notification_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  pushEnabled: boolean("pushEnabled").default(true).notNull(),
  emailEnabled: boolean("emailEnabled").default(false).notNull(),
  reminderMinutesBefore: int("reminderMinutesBefore").default(30).notNull(),
  dailyDigestEnabled: boolean("dailyDigestEnabled").default(false).notNull(),
  dailyDigestTime: varchar("dailyDigestTime", { length: 10 }).default("09:00"),
  expoPushToken: text("expoPushToken"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = typeof notificationSettings.$inferInsert;
