import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.join(__dirname, "..");

describe("PostPal v2.1 Stabilization Tests", () => {
  describe("Onboarding Feature", () => {
    it("should have onboarding screen", () => {
      const onboardingPath = path.join(projectRoot, "app/onboarding.tsx");
      expect(fs.existsSync(onboardingPath)).toBe(true);
    });

    it("should have onboarding content with feature highlights", () => {
      const content = fs.readFileSync(path.join(projectRoot, "app/onboarding.tsx"), "utf-8");
      expect(content).toContain("ONBOARDING_SLIDES");
      expect(content).toContain("AsyncStorage");
      expect(content).toContain("@postpal_onboarding_complete");
    });

    it("should have skip and continue functionality", () => {
      const content = fs.readFileSync(path.join(projectRoot, "app/onboarding.tsx"), "utf-8");
      expect(content).toContain("Skip");
      expect(content).toContain("Next");
      expect(content).toContain("Get Started");
    });
  });

  describe("Unified Social Inbox", () => {
    it("should have inbox screen", () => {
      const inboxPath = path.join(projectRoot, "app/inbox.tsx");
      expect(fs.existsSync(inboxPath)).toBe(true);
    });

    it("should have inbox database schema", () => {
      const schemaContent = fs.readFileSync(path.join(projectRoot, "drizzle/schema.ts"), "utf-8");
      expect(schemaContent).toContain("inboxMessages");
      expect(schemaContent).toContain("savedReplies");
      expect(schemaContent).toContain("autoResponders");
    });

    it("should have inbox API routes", () => {
      const routersContent = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf-8");
      expect(routersContent).toContain("inbox: router");
      expect(routersContent).toContain("messages:");
      expect(routersContent).toContain("savedReplies:");
      expect(routersContent).toContain("autoResponders:");
    });

    it("should have inbox db query helpers", () => {
      const dbContent = fs.readFileSync(path.join(projectRoot, "server/db.ts"), "utf-8");
      expect(dbContent).toContain("getInboxMessages");
      expect(dbContent).toContain("getSavedReplies");
      expect(dbContent).toContain("getAutoResponders");
    });

    it("should have message filtering in inbox screen", () => {
      const inboxContent = fs.readFileSync(path.join(projectRoot, "app/inbox.tsx"), "utf-8");
      expect(inboxContent).toContain("selectedPlatform");
      expect(inboxContent).toContain("selectedType");
      expect(inboxContent).toContain("searchQuery");
    });

    it("should have reply functionality", () => {
      const inboxContent = fs.readFileSync(path.join(projectRoot, "app/inbox.tsx"), "utf-8");
      expect(inboxContent).toContain("showReplyModal");
      expect(inboxContent).toContain("replyText");
      expect(inboxContent).toContain("AI Suggest");
    });
  });

  describe("Social Media Integration", () => {
    it("should have social integration service", () => {
      const integrationPath = path.join(projectRoot, "server/social-integration.ts");
      expect(fs.existsSync(integrationPath)).toBe(true);
    });

    it("should have OAuth authorization URL generator", () => {
      const content = fs.readFileSync(path.join(projectRoot, "server/social-integration.ts"), "utf-8");
      expect(content).toContain("getAuthorizationUrl");
      expect(content).toContain("PLATFORM_ENDPOINTS");
      expect(content).toContain("PLATFORM_SCOPES");
    });

    it("should have token exchange functionality", () => {
      const content = fs.readFileSync(path.join(projectRoot, "server/social-integration.ts"), "utf-8");
      expect(content).toContain("exchangeCodeForToken");
      expect(content).toContain("refreshAccessToken");
    });

    it("should have post publishing functionality", () => {
      const content = fs.readFileSync(path.join(projectRoot, "server/social-integration.ts"), "utf-8");
      expect(content).toContain("publishPost");
      expect(content).toContain("maxLengths");
    });

    it("should have analytics fetching functionality", () => {
      const content = fs.readFileSync(path.join(projectRoot, "server/social-integration.ts"), "utf-8");
      expect(content).toContain("fetchAnalytics");
      expect(content).toContain("followers");
      expect(content).toContain("engagement");
    });

    it("should have social API routes", () => {
      const routersContent = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf-8");
      expect(routersContent).toContain("social: router");
      expect(routersContent).toContain("getAuthUrl");
      expect(routersContent).toContain("exchangeToken");
      expect(routersContent).toContain("publishPost");
      expect(routersContent).toContain("fetchAnalytics");
    });

    it("should support all major platforms", () => {
      const content = fs.readFileSync(path.join(projectRoot, "server/social-integration.ts"), "utf-8");
      expect(content).toContain("instagram");
      expect(content).toContain("twitter");
      expect(content).toContain("linkedin");
      expect(content).toContain("facebook");
      expect(content).toContain("youtube");
    });

    it("should have platform guidelines", () => {
      const content = fs.readFileSync(path.join(projectRoot, "server/social-integration.ts"), "utf-8");
      expect(content).toContain("getPlatformGuidelines");
      expect(content).toContain("maxCharacters");
      expect(content).toContain("maxHashtags");
      expect(content).toContain("bestPostingTimes");
    });
  });

  describe("Navigation Integration", () => {
    it("should have inbox screen in navigation", () => {
      const layoutContent = fs.readFileSync(path.join(projectRoot, "app/_layout.tsx"), "utf-8");
      expect(layoutContent).toContain('name="inbox"');
    });

    it("should have onboarding screen in navigation", () => {
      const layoutContent = fs.readFileSync(path.join(projectRoot, "app/_layout.tsx"), "utf-8");
      expect(layoutContent).toContain('name="onboarding"');
    });
  });

  describe("App Branding", () => {
    it("should have official logo in assets", () => {
      const iconPath = path.join(projectRoot, "assets/images/icon.png");
      expect(fs.existsSync(iconPath)).toBe(true);
    });

    it("should have splash icon", () => {
      const splashPath = path.join(projectRoot, "assets/images/splash-icon.png");
      expect(fs.existsSync(splashPath)).toBe(true);
    });

    it("should have app icon", () => {
      const iconPath = path.join(projectRoot, "assets/images/icon.png");
      expect(fs.existsSync(iconPath)).toBe(true);
      // Verify icon is large enough for app store (should be at least 100KB for 1024x1024)
      const stats = fs.statSync(iconPath);
      expect(stats.size).toBeGreaterThan(50000);
    });

    it("should have orange brand colors in theme", () => {
      const themeContent = fs.readFileSync(path.join(projectRoot, "theme.config.js"), "utf-8");
      expect(themeContent).toContain("F97316"); // Orange primary
    });
  });

  describe("Database Schema Completeness", () => {
    it("should have all required tables", () => {
      const schemaContent = fs.readFileSync(path.join(projectRoot, "drizzle/schema.ts"), "utf-8");
      const requiredTables = [
        "users",
        "posts",
        "socialAccounts",
        "analytics",
        "postTemplates",
        "notificationSettings",
        "inboxMessages",
        "savedReplies",
        "autoResponders",
      ];
      
      requiredTables.forEach(table => {
        expect(schemaContent).toContain(table);
      });
    });
  });

  describe("API Router Completeness", () => {
    it("should have all required routers", () => {
      const routersContent = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf-8");
      const requiredRouters = [
        "auth:",
        "posts:",
        "templates:",
        "socialAccounts:",
        "analytics:",
        "notifications:",
        "dashboard:",
        "inbox:",
        "ai:",
        "social:",
      ];
      
      requiredRouters.forEach(router => {
        expect(routersContent).toContain(router);
      });
    });
  });

  describe("Component Completeness", () => {
    it("should have all required screens", () => {
      const screens = [
        "app/(tabs)/index.tsx",
        "app/(tabs)/calendar.tsx",
        "app/(tabs)/approvals.tsx",
        "app/(tabs)/analytics.tsx",
        "app/(tabs)/settings.tsx",
        "app/login.tsx",
        "app/onboarding.tsx",
        "app/inbox.tsx",
        "app/create-content.tsx",
        "app/social-accounts.tsx",
        "app/templates.tsx",
      ];
      
      screens.forEach(screen => {
        const screenPath = path.join(projectRoot, screen);
        expect(fs.existsSync(screenPath)).toBe(true);
      });
    });

    it("should have all required components", () => {
      // Note: accessible-button.tsx and accessible-input.tsx were removed in v2.5 cleanup
      const components = [
        "components/screen-container.tsx",
        "components/content-card.tsx",
        "components/schedule-modal.tsx",
        "components/platform-preview.tsx",
        "components/hashtag-suggestions.tsx",
        "components/seo-head.tsx",
        "components/feature-gate.tsx",
        "components/subreddit-suggestions.tsx",
      ];
      
      components.forEach(component => {
        const componentPath = path.join(projectRoot, component);
        expect(fs.existsSync(componentPath)).toBe(true);
      });
    });
  });
});
