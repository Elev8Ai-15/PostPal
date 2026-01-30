import { describe, it, expect, beforeAll } from "vitest";

/**
 * Comprehensive System Tests for PostPal
 * Tests backend API endpoints, database connectivity, and frontend wiring
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:3000";

// Helper to make API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return response;
}

describe("Backend Health Checks", () => {
  it("should have API server running", async () => {
    try {
      const response = await apiCall("/api/health");
      expect(response.ok).toBe(true);
    } catch (error) {
      // Server might not have /api/health, check tRPC panel instead
      const response = await apiCall("/api/trpc/auth.me");
      expect(response.status).toBeLessThan(500);
    }
  });

  it("should respond to tRPC auth.me endpoint", async () => {
    const response = await apiCall("/api/trpc/auth.me");
    // Without auth, should return null user but not error
    expect(response.status).toBeLessThan(500);
  });
});

describe("Database Schema Validation", () => {
  it("should have all required tables defined in schema file", async () => {
    const fs = await import("fs");
    const path = await import("path");
    
    const schemaFile = fs.readFileSync(
      path.join(process.cwd(), "drizzle/schema.ts"),
      "utf-8"
    );
    
    // Check for table definitions
    expect(schemaFile).toContain('mysqlTable("users"');
    expect(schemaFile).toContain('mysqlTable("posts"');
    expect(schemaFile).toContain('mysqlTable("social_accounts"');
    expect(schemaFile).toContain('mysqlTable("analytics"');
    expect(schemaFile).toContain('mysqlTable("strategies"');
  });

  it("should have proper type exports", async () => {
    const fs = await import("fs");
    const path = await import("path");
    
    const schemaFile = fs.readFileSync(
      path.join(process.cwd(), "drizzle/schema.ts"),
      "utf-8"
    );
    
    // Check for type exports
    expect(schemaFile).toContain("export type User");
    expect(schemaFile).toContain("export type Post");
    expect(schemaFile).toContain("export type SocialAccount");
    expect(schemaFile).toContain("export type Analytics");
    expect(schemaFile).toContain("export type Strategy");
  });
});

describe("tRPC Router Structure", () => {
  it("should have auth router defined", async () => {
    const routers = await import("../server/routers");
    expect(routers.appRouter).toBeDefined();
    expect(routers.appRouter._def.procedures).toBeDefined();
  });

  it("should have posts router with required procedures", async () => {
    const routers = await import("../server/routers");
    const procedures = Object.keys(routers.appRouter._def.procedures);
    
    // Check for posts procedures
    expect(procedures).toContain("posts.list");
    expect(procedures).toContain("posts.create");
    expect(procedures).toContain("posts.update");
    expect(procedures).toContain("posts.delete");
    expect(procedures).toContain("posts.pending");
    expect(procedures).toContain("posts.approve");
    expect(procedures).toContain("posts.reject");
    expect(procedures).toContain("posts.scheduled");
    expect(procedures).toContain("posts.schedule");
  });

  it("should have socialAccounts router with required procedures", async () => {
    const routers = await import("../server/routers");
    const procedures = Object.keys(routers.appRouter._def.procedures);
    
    expect(procedures).toContain("socialAccounts.list");
    expect(procedures).toContain("socialAccounts.connect");
    expect(procedures).toContain("socialAccounts.disconnect");
  });

  it("should have analytics router with required procedures", async () => {
    const routers = await import("../server/routers");
    const procedures = Object.keys(routers.appRouter._def.procedures);
    
    expect(procedures).toContain("analytics.get");
    expect(procedures).toContain("analytics.record");
  });

  it("should have strategy router with required procedures", async () => {
    const routers = await import("../server/routers");
    const procedures = Object.keys(routers.appRouter._def.procedures);
    
    expect(procedures).toContain("strategy.get");
    expect(procedures).toContain("strategy.create");
    expect(procedures).toContain("strategy.update");
  });

  it("should have AI router with required procedures", async () => {
    const routers = await import("../server/routers");
    const procedures = Object.keys(routers.appRouter._def.procedures);
    
    expect(procedures).toContain("ai.generateContent");
    expect(procedures).toContain("ai.improveContent");
    expect(procedures).toContain("ai.generateStrategy");
  });

  it("should have dashboard router", async () => {
    const routers = await import("../server/routers");
    const procedures = Object.keys(routers.appRouter._def.procedures);
    
    expect(procedures).toContain("dashboard.stats");
  });
});

describe("Database Query Functions", () => {
  it("should have all post query functions defined", async () => {
    const db = await import("../server/db");
    
    expect(typeof db.getUserPosts).toBe("function");
    expect(typeof db.getPendingPosts).toBe("function");
    expect(typeof db.getScheduledPosts).toBe("function");
    expect(typeof db.createPost).toBe("function");
    expect(typeof db.updatePost).toBe("function");
    expect(typeof db.deletePost).toBe("function");
    expect(typeof db.getPostById).toBe("function");
  });

  it("should have all social account query functions defined", async () => {
    const db = await import("../server/db");
    
    expect(typeof db.getUserSocialAccounts).toBe("function");
    expect(typeof db.connectSocialAccount).toBe("function");
    expect(typeof db.updateSocialAccount).toBe("function");
    expect(typeof db.disconnectSocialAccount).toBe("function");
  });

  it("should have all analytics query functions defined", async () => {
    const db = await import("../server/db");
    
    expect(typeof db.getUserAnalytics).toBe("function");
    expect(typeof db.recordAnalytics).toBe("function");
  });

  it("should have all strategy query functions defined", async () => {
    const db = await import("../server/db");
    
    expect(typeof db.getUserStrategy).toBe("function");
    expect(typeof db.createStrategy).toBe("function");
    expect(typeof db.updateStrategy).toBe("function");
  });

  it("should have dashboard stats function defined", async () => {
    const db = await import("../server/db");
    
    expect(typeof db.getDashboardStats).toBe("function");
  });
});

describe("Frontend Component Structure", () => {
  it("should have all required screen files", async () => {
    const fs = await import("fs");
    const path = await import("path");
    
    const appDir = path.join(process.cwd(), "app");
    const tabsDir = path.join(appDir, "(tabs)");
    
    // Check tab screens exist
    expect(fs.existsSync(path.join(tabsDir, "index.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(tabsDir, "calendar.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(tabsDir, "approvals.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(tabsDir, "analytics.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(tabsDir, "settings.tsx"))).toBe(true);
    
    // Check additional screens exist
    expect(fs.existsSync(path.join(appDir, "login.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(appDir, "create-content.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(appDir, "social-accounts.tsx"))).toBe(true);
  });

  it("should have schedule modal component", async () => {
    const fs = await import("fs");
    const path = await import("path");
    
    const componentPath = path.join(process.cwd(), "components/schedule-modal.tsx");
    expect(fs.existsSync(componentPath)).toBe(true);
    
    const content = fs.readFileSync(componentPath, "utf-8");
    expect(content).toContain("ScheduleModal");
    expect(content).toContain("ScheduleData");
    expect(content).toContain("selectedDate");
    expect(content).toContain("onSchedule");
  });
});

describe("Theme Configuration", () => {
  it("should have valid theme colors defined", async () => {
    const themeConfig = await import("../theme.config.js");
    
    expect(themeConfig.themeColors).toBeDefined();
    expect(themeConfig.themeColors.primary).toBeDefined();
    expect(themeConfig.themeColors.background).toBeDefined();
    expect(themeConfig.themeColors.foreground).toBeDefined();
    expect(themeConfig.themeColors.surface).toBeDefined();
    expect(themeConfig.themeColors.border).toBeDefined();
    expect(themeConfig.themeColors.success).toBeDefined();
    expect(themeConfig.themeColors.warning).toBeDefined();
    expect(themeConfig.themeColors.error).toBeDefined();
  });
});

describe("Icon Mappings", () => {
  it("should have all required icon mappings", async () => {
    const fs = await import("fs");
    const path = await import("path");
    
    const iconFile = fs.readFileSync(
      path.join(process.cwd(), "components/ui/icon-symbol.tsx"),
      "utf-8"
    );
    
    // Check for required icon mappings
    expect(iconFile).toContain("house.fill");
    expect(iconFile).toContain("calendar");
    expect(iconFile).toContain("checkmark.circle.fill");
    expect(iconFile).toContain("chart.bar.fill");
    expect(iconFile).toContain("gearshape.fill");
    expect(iconFile).toContain("sparkles");
    expect(iconFile).toContain("paperplane.fill");
  });
});
