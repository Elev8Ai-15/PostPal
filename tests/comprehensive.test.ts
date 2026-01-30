import { describe, expect, it, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Comprehensive Debug, Calibration, and Stabilization Test Suite
 * 
 * This test suite validates:
 * 1. Backend API structure and router configuration
 * 2. Database schema completeness
 * 3. Frontend component existence and structure
 * 4. Type safety and exports
 * 5. File system integrity
 * 6. Feature completeness
 */

const PROJECT_ROOT = path.resolve(__dirname, "..");

// ============ BACKEND VALIDATION ============

describe("Backend API Validation", () => {
  let routersContent: string;
  let dbContent: string;
  let schemaContent: string;

  beforeAll(() => {
    routersContent = fs.readFileSync(path.join(PROJECT_ROOT, "server/routers.ts"), "utf-8");
    dbContent = fs.readFileSync(path.join(PROJECT_ROOT, "server/db.ts"), "utf-8");
    schemaContent = fs.readFileSync(path.join(PROJECT_ROOT, "drizzle/schema.ts"), "utf-8");
  });

  describe("Router Structure", () => {
    it("exports appRouter", () => {
      expect(routersContent).toContain("export const appRouter");
    });

    it("exports AppRouter type", () => {
      expect(routersContent).toContain("export type AppRouter");
    });

    it("has auth router with me and logout", () => {
      expect(routersContent).toContain("auth: router({");
      expect(routersContent).toContain("me: publicProcedure");
      expect(routersContent).toContain("logout: publicProcedure");
    });

    it("has posts router with all CRUD operations", () => {
      expect(routersContent).toContain("posts: router({");
      expect(routersContent).toContain("list: protectedProcedure");
      expect(routersContent).toContain("create: protectedProcedure");
      expect(routersContent).toContain("update: protectedProcedure");
      expect(routersContent).toContain("delete: protectedProcedure");
    });

    it("has posts.schedule endpoint", () => {
      expect(routersContent).toContain("schedule: protectedProcedure");
    });

    it("has posts.reschedule endpoint for drag-and-drop", () => {
      expect(routersContent).toContain("reschedule: protectedProcedure");
    });

    it("has templates router for recurring posts", () => {
      expect(routersContent).toContain("templates: router({");
      expect(routersContent).toContain("generatePost: protectedProcedure");
    });

    it("has notifications router", () => {
      expect(routersContent).toContain("notifications: router({");
      expect(routersContent).toContain("getSettings: protectedProcedure");
      expect(routersContent).toContain("updateSettings: protectedProcedure");
      expect(routersContent).toContain("registerPushToken: protectedProcedure");
    });

    it("has socialAccounts router", () => {
      expect(routersContent).toContain("socialAccounts: router({");
      expect(routersContent).toContain("connect: protectedProcedure");
      expect(routersContent).toContain("disconnect: protectedProcedure");
    });

    it("has analytics router", () => {
      expect(routersContent).toContain("analytics: router({");
    });

    it("has strategy router", () => {
      expect(routersContent).toContain("strategy: router({");
    });

    it("has dashboard router", () => {
      expect(routersContent).toContain("dashboard: router({");
    });

    it("has ai router with content generation", () => {
      expect(routersContent).toContain("ai: router({");
      expect(routersContent).toContain("generateContent: protectedProcedure");
      expect(routersContent).toContain("improveContent: protectedProcedure");
      expect(routersContent).toContain("generateStrategy: protectedProcedure");
    });
  });

  describe("Database Query Helpers", () => {
    it("has getDb function", () => {
      expect(dbContent).toContain("export async function getDb()");
    });

    it("has user query functions", () => {
      expect(dbContent).toContain("export async function upsertUser");
      expect(dbContent).toContain("export async function getUserByOpenId");
    });

    it("has post query functions", () => {
      expect(dbContent).toContain("export async function getUserPosts");
      expect(dbContent).toContain("export async function getPendingPosts");
      expect(dbContent).toContain("export async function getScheduledPosts");
      expect(dbContent).toContain("export async function createPost");
      expect(dbContent).toContain("export async function updatePost");
      expect(dbContent).toContain("export async function deletePost");
    });

    it("has template query functions", () => {
      expect(dbContent).toContain("export async function getUserTemplates");
      expect(dbContent).toContain("export async function getActiveTemplates");
      expect(dbContent).toContain("export async function createTemplate");
      expect(dbContent).toContain("export async function updateTemplate");
      expect(dbContent).toContain("export async function deleteTemplate");
    });

    it("has notification settings functions", () => {
      expect(dbContent).toContain("export async function getUserNotificationSettings");
      expect(dbContent).toContain("export async function upsertNotificationSettings");
    });

    it("has reminder-related functions", () => {
      expect(dbContent).toContain("export async function getPostsNeedingReminders");
      expect(dbContent).toContain("export async function markReminderSent");
    });

    it("has social account functions", () => {
      expect(dbContent).toContain("export async function getUserSocialAccounts");
      expect(dbContent).toContain("export async function connectSocialAccount");
      expect(dbContent).toContain("export async function disconnectSocialAccount");
    });

    it("has analytics functions", () => {
      expect(dbContent).toContain("export async function getUserAnalytics");
      expect(dbContent).toContain("export async function recordAnalytics");
    });

    it("has strategy functions", () => {
      expect(dbContent).toContain("export async function getUserStrategy");
      expect(dbContent).toContain("export async function createStrategy");
    });

    it("has dashboard stats function", () => {
      expect(dbContent).toContain("export async function getDashboardStats");
    });
  });

  describe("Database Schema", () => {
    it("has users table", () => {
      expect(schemaContent).toContain('export const users = mysqlTable("users"');
    });

    it("has posts table with reminder fields", () => {
      expect(schemaContent).toContain('export const posts = mysqlTable("posts"');
      expect(schemaContent).toContain("reminderEnabled");
      expect(schemaContent).toContain("reminderMinutesBefore");
      expect(schemaContent).toContain("reminderSent");
      expect(schemaContent).toContain("templateId");
    });

    it("has postTemplates table for recurring posts", () => {
      expect(schemaContent).toContain('export const postTemplates = mysqlTable("post_templates"');
      expect(schemaContent).toContain("recurrenceType");
      expect(schemaContent).toContain("recurrenceDays");
      expect(schemaContent).toContain("recurrenceTime");
      expect(schemaContent).toContain("nextScheduledAt");
    });

    it("has notificationSettings table", () => {
      expect(schemaContent).toContain('export const notificationSettings = mysqlTable("notification_settings"');
      expect(schemaContent).toContain("pushEnabled");
      expect(schemaContent).toContain("emailEnabled");
      expect(schemaContent).toContain("expoPushToken");
    });

    it("has socialAccounts table", () => {
      expect(schemaContent).toContain('export const socialAccounts = mysqlTable("social_accounts"');
    });

    it("has analytics table", () => {
      expect(schemaContent).toContain('export const analytics = mysqlTable("analytics"');
    });

    it("has strategies table", () => {
      expect(schemaContent).toContain('export const strategies = mysqlTable("strategies"');
    });

    it("exports all type definitions", () => {
      expect(schemaContent).toContain("export type User");
      expect(schemaContent).toContain("export type Post");
      expect(schemaContent).toContain("export type PostTemplate");
      expect(schemaContent).toContain("export type NotificationSettings");
      expect(schemaContent).toContain("export type SocialAccount");
      expect(schemaContent).toContain("export type Analytics");
      expect(schemaContent).toContain("export type Strategy");
    });
  });
});

// ============ FRONTEND VALIDATION ============

describe("Frontend Component Validation", () => {
  describe("Tab Screens", () => {
    it("has Dashboard (index) screen", () => {
      const exists = fs.existsSync(path.join(PROJECT_ROOT, "app/(tabs)/index.tsx"));
      expect(exists).toBe(true);
    });

    it("has Calendar screen", () => {
      const exists = fs.existsSync(path.join(PROJECT_ROOT, "app/(tabs)/calendar.tsx"));
      expect(exists).toBe(true);
    });

    it("has Approvals screen", () => {
      const exists = fs.existsSync(path.join(PROJECT_ROOT, "app/(tabs)/approvals.tsx"));
      expect(exists).toBe(true);
    });

    it("has Analytics screen", () => {
      const exists = fs.existsSync(path.join(PROJECT_ROOT, "app/(tabs)/analytics.tsx"));
      expect(exists).toBe(true);
    });

    it("has Settings screen", () => {
      const exists = fs.existsSync(path.join(PROJECT_ROOT, "app/(tabs)/settings.tsx"));
      expect(exists).toBe(true);
    });
  });

  describe("Additional Screens", () => {
    it("has Login screen", () => {
      const exists = fs.existsSync(path.join(PROJECT_ROOT, "app/login.tsx"));
      expect(exists).toBe(true);
    });

    it("has Social Accounts screen", () => {
      const exists = fs.existsSync(path.join(PROJECT_ROOT, "app/social-accounts.tsx"));
      expect(exists).toBe(true);
    });

    it("has Create Content screen", () => {
      const exists = fs.existsSync(path.join(PROJECT_ROOT, "app/create-content.tsx"));
      expect(exists).toBe(true);
    });

    it("has Templates screen for recurring posts", () => {
      const exists = fs.existsSync(path.join(PROJECT_ROOT, "app/templates.tsx"));
      expect(exists).toBe(true);
    });
  });

  describe("Components", () => {
    it("has ScreenContainer component", () => {
      const exists = fs.existsSync(path.join(PROJECT_ROOT, "components/screen-container.tsx"));
      expect(exists).toBe(true);
    });

    it("has ScheduleModal component", () => {
      const exists = fs.existsSync(path.join(PROJECT_ROOT, "components/schedule-modal.tsx"));
      expect(exists).toBe(true);
    });

    it("has IconSymbol component", () => {
      const exists = fs.existsSync(path.join(PROJECT_ROOT, "components/ui/icon-symbol.tsx"));
      expect(exists).toBe(true);
    });
  });

  describe("Calendar Screen Features", () => {
    let calendarContent: string;

    beforeAll(() => {
      calendarContent = fs.readFileSync(path.join(PROJECT_ROOT, "app/(tabs)/calendar.tsx"), "utf-8");
    });

    it("has drag-and-drop state management", () => {
      expect(calendarContent).toContain("draggingPost");
      expect(calendarContent).toContain("setDraggingPost");
    });

    it("has DatePickerModal for rescheduling", () => {
      expect(calendarContent).toContain("DatePickerModal");
      expect(calendarContent).toContain("showDatePicker");
    });

    it("uses reschedule mutation", () => {
      expect(calendarContent).toContain("rescheduleMutation");
      expect(calendarContent).toContain("posts.reschedule");
    });

    it("has drag hint for users", () => {
      expect(calendarContent).toContain("Long-press a post to move it");
    });

    it("has onDragStart handler", () => {
      expect(calendarContent).toContain("handleDragStart");
      expect(calendarContent).toContain("onDragStart");
    });
  });

  describe("Templates Screen Features", () => {
    let templatesContent: string;

    beforeAll(() => {
      templatesContent = fs.readFileSync(path.join(PROJECT_ROOT, "app/templates.tsx"), "utf-8");
    });

    it("has recurrence type selection", () => {
      expect(templatesContent).toContain("RECURRENCE_TYPES");
      expect(templatesContent).toContain("daily");
      expect(templatesContent).toContain("weekly");
      expect(templatesContent).toContain("biweekly");
      expect(templatesContent).toContain("monthly");
    });

    it("has day of week selection for weekly recurrence", () => {
      expect(templatesContent).toContain("DAYS_OF_WEEK");
      expect(templatesContent).toContain("selectedDays");
    });

    it("has time selection", () => {
      expect(templatesContent).toContain("recurrenceTime");
    });

    it("uses templates API", () => {
      expect(templatesContent).toContain("trpc.templates.list");
      expect(templatesContent).toContain("trpc.templates.create");
      expect(templatesContent).toContain("trpc.templates.update");
      expect(templatesContent).toContain("trpc.templates.delete");
    });

    it("has generate post now feature", () => {
      expect(templatesContent).toContain("generatePostMutation");
      expect(templatesContent).toContain("Generate Now");
    });
  });
});

// ============ ICON MAPPING VALIDATION ============

describe("Icon Mapping Validation", () => {
  let iconContent: string;

  beforeAll(() => {
    iconContent = fs.readFileSync(path.join(PROJECT_ROOT, "components/ui/icon-symbol.tsx"), "utf-8");
  });

  it("has all tab bar icons", () => {
    expect(iconContent).toContain('"house.fill"');
    expect(iconContent).toContain('"calendar"');
    expect(iconContent).toContain('"checkmark.circle.fill"');
    expect(iconContent).toContain('"chart.bar.fill"');
    expect(iconContent).toContain('"gearshape.fill"');
  });

  it("has navigation icons", () => {
    expect(iconContent).toContain('"chevron.right"');
    expect(iconContent).toContain('"chevron.left"');
  });

  it("has action icons", () => {
    expect(iconContent).toContain('"plus"');
    expect(iconContent).toContain('"xmark"');
    expect(iconContent).toContain('"pencil"');
    expect(iconContent).toContain('"trash"');
  });

  it("has content type icons", () => {
    expect(iconContent).toContain('"video"');
    expect(iconContent).toContain('"doc.text"');
    expect(iconContent).toContain('"envelope"');
    expect(iconContent).toContain('"message"');
  });

  it("has drag handle icon for drag-and-drop", () => {
    expect(iconContent).toContain('"line.3.horizontal"');
    expect(iconContent).toContain('"drag-handle"');
  });

  it("has AI sparkles icon", () => {
    expect(iconContent).toContain('"sparkles"');
  });
});

// ============ CONFIGURATION VALIDATION ============

describe("Configuration Validation", () => {
  it("has valid theme configuration", () => {
    const themeConfig = fs.readFileSync(path.join(PROJECT_ROOT, "theme.config.js"), "utf-8");
    expect(themeConfig).toContain("themeColors");
    expect(themeConfig).toContain("primary");
    expect(themeConfig).toContain("background");
    expect(themeConfig).toContain("foreground");
    expect(themeConfig).toContain("success");
    expect(themeConfig).toContain("warning");
    expect(themeConfig).toContain("error");
  });

  it("has valid app configuration", () => {
    const appConfig = fs.readFileSync(path.join(PROJECT_ROOT, "app.config.ts"), "utf-8");
    expect(appConfig).toContain("PostPal");
    expect(appConfig).toContain("postpal");
  });

  it("has valid tailwind configuration", () => {
    const tailwindConfig = fs.readFileSync(path.join(PROJECT_ROOT, "tailwind.config.js"), "utf-8");
    expect(tailwindConfig).toContain("content");
    expect(tailwindConfig).toContain("theme");
    expect(tailwindConfig).toContain("nativewind/preset");
  });

  it("has tab layout configuration", () => {
    const tabLayout = fs.readFileSync(path.join(PROJECT_ROOT, "app/(tabs)/_layout.tsx"), "utf-8");
    expect(tabLayout).toContain("Tabs.Screen");
    expect(tabLayout).toContain("Dashboard");
    expect(tabLayout).toContain("Calendar");
    expect(tabLayout).toContain("Approvals");
    expect(tabLayout).toContain("Analytics");
    expect(tabLayout).toContain("Settings");
  });
});

// ============ TYPE SAFETY VALIDATION ============

describe("Type Safety Validation", () => {
  it("has tRPC client setup", () => {
    const trpcContent = fs.readFileSync(path.join(PROJECT_ROOT, "lib/trpc.ts"), "utf-8");
    expect(trpcContent).toContain("createTRPCReact");
    expect(trpcContent).toContain("AppRouter");
    expect(trpcContent).toContain("createTRPCClient");
  });

  it("has useAuth hook", () => {
    const authHook = fs.readFileSync(path.join(PROJECT_ROOT, "hooks/use-auth.ts"), "utf-8");
    expect(authHook).toContain("export function useAuth");
    expect(authHook).toContain("isAuthenticated");
    expect(authHook).toContain("logout");
  });

  it("has useColors hook", () => {
    const colorsHook = fs.readFileSync(path.join(PROJECT_ROOT, "hooks/use-colors.ts"), "utf-8");
    expect(colorsHook).toContain("export function useColors");
  });
});

// ============ FEATURE COMPLETENESS ============

describe("Feature Completeness", () => {
  describe("Push Notification Reminders", () => {
    it("has reminder fields in posts schema", () => {
      const schema = fs.readFileSync(path.join(PROJECT_ROOT, "drizzle/schema.ts"), "utf-8");
      expect(schema).toContain("reminderEnabled");
      expect(schema).toContain("reminderMinutesBefore");
      expect(schema).toContain("reminderSent");
    });

    it("has notification settings table", () => {
      const schema = fs.readFileSync(path.join(PROJECT_ROOT, "drizzle/schema.ts"), "utf-8");
      expect(schema).toContain("notificationSettings");
      expect(schema).toContain("expoPushToken");
    });

    it("has notifications router", () => {
      const routers = fs.readFileSync(path.join(PROJECT_ROOT, "server/routers.ts"), "utf-8");
      expect(routers).toContain("notifications: router({");
      expect(routers).toContain("checkReminders");
    });
  });

  describe("Recurring Post Templates", () => {
    it("has postTemplates table", () => {
      const schema = fs.readFileSync(path.join(PROJECT_ROOT, "drizzle/schema.ts"), "utf-8");
      expect(schema).toContain("postTemplates");
      expect(schema).toContain("recurrenceType");
    });

    it("has templates router", () => {
      const routers = fs.readFileSync(path.join(PROJECT_ROOT, "server/routers.ts"), "utf-8");
      expect(routers).toContain("templates: router({");
      expect(routers).toContain("generatePost");
    });

    it("has templates screen", () => {
      const exists = fs.existsSync(path.join(PROJECT_ROOT, "app/templates.tsx"));
      expect(exists).toBe(true);
    });

    it("has calculateNextScheduledDate helper", () => {
      const routers = fs.readFileSync(path.join(PROJECT_ROOT, "server/routers.ts"), "utf-8");
      expect(routers).toContain("calculateNextScheduledDate");
    });
  });

  describe("Drag-and-Drop Rescheduling", () => {
    it("has reschedule endpoint", () => {
      const routers = fs.readFileSync(path.join(PROJECT_ROOT, "server/routers.ts"), "utf-8");
      expect(routers).toContain("reschedule: protectedProcedure");
    });

    it("has DatePickerModal in calendar", () => {
      const calendar = fs.readFileSync(path.join(PROJECT_ROOT, "app/(tabs)/calendar.tsx"), "utf-8");
      expect(calendar).toContain("DatePickerModal");
    });

    it("has drag handle icon", () => {
      const icons = fs.readFileSync(path.join(PROJECT_ROOT, "components/ui/icon-symbol.tsx"), "utf-8");
      expect(icons).toContain("line.3.horizontal");
    });
  });
});

// ============ FILE INTEGRITY ============

describe("File Integrity", () => {
  const requiredFiles = [
    "app/(tabs)/_layout.tsx",
    "app/(tabs)/index.tsx",
    "app/(tabs)/calendar.tsx",
    "app/(tabs)/approvals.tsx",
    "app/(tabs)/analytics.tsx",
    "app/(tabs)/settings.tsx",
    "app/login.tsx",
    "app/social-accounts.tsx",
    "app/create-content.tsx",
    "app/templates.tsx",
    "components/screen-container.tsx",
    "components/schedule-modal.tsx",
    "components/ui/icon-symbol.tsx",
    "server/routers.ts",
    "server/db.ts",
    "drizzle/schema.ts",
    "lib/trpc.ts",
    "hooks/use-auth.ts",
    "hooks/use-colors.ts",
    "theme.config.js",
    "tailwind.config.js",
    "app.config.ts",
    "package.json",
    "todo.md",
    "design.md",
  ];

  requiredFiles.forEach((file) => {
    it(`has ${file}`, () => {
      const exists = fs.existsSync(path.join(PROJECT_ROOT, file));
      expect(exists).toBe(true);
    });
  });
});

// ============ ASSET VALIDATION ============

describe("Asset Validation", () => {
  it("has app icon", () => {
    const exists = fs.existsSync(path.join(PROJECT_ROOT, "assets/images/icon.png"));
    expect(exists).toBe(true);
  });

  it("has splash icon", () => {
    const exists = fs.existsSync(path.join(PROJECT_ROOT, "assets/images/splash-icon.png"));
    expect(exists).toBe(true);
  });

  it("has favicon", () => {
    const exists = fs.existsSync(path.join(PROJECT_ROOT, "assets/images/favicon.png"));
    expect(exists).toBe(true);
  });

  it("has android icon foreground", () => {
    const exists = fs.existsSync(path.join(PROJECT_ROOT, "assets/images/android-icon-foreground.png"));
    expect(exists).toBe(true);
  });
});
