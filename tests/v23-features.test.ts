import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..");

describe("v2.3 Feature Tests - TikTok, Campaign Analytics, Reddit Subreddit Targeting", () => {
  describe("TikTok Platform Support", () => {
    it("should have TikTok in platform type definition", () => {
      const createContent = fs.readFileSync(
        path.join(PROJECT_ROOT, "app/create-content.tsx"),
        "utf-8"
      );
      expect(createContent).toContain('"tiktok"');
    });

    it("should have TikTok platform option with correct character limit", () => {
      const createContent = fs.readFileSync(
        path.join(PROJECT_ROOT, "app/create-content.tsx"),
        "utf-8"
      );
      expect(createContent).toContain('id: "tiktok"');
      expect(createContent).toContain("TikTok");
      expect(createContent).toContain("charLimit: 2200");
    });

    it("should have TikTok formatting rules", () => {
      const createContent = fs.readFileSync(
        path.join(PROJECT_ROOT, "app/create-content.tsx"),
        "utf-8"
      );
      expect(createContent).toContain("tiktok:");
      expect(createContent).toContain("Video-first");
    });

    it("should have TikTok in platform preview component", () => {
      const platformPreview = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/platform-preview.tsx"),
        "utf-8"
      );
      expect(platformPreview).toContain('"tiktok"');
      expect(platformPreview).toContain("TikTok");
    });

    it("should have TikTok in hashtag suggestions component", () => {
      const hashtagSuggestions = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/hashtag-suggestions.tsx"),
        "utf-8"
      );
      expect(hashtagSuggestions).toContain('"tiktok"');
    });

    it("should have TikTok in server routers", () => {
      const routers = fs.readFileSync(
        path.join(PROJECT_ROOT, "server/routers.ts"),
        "utf-8"
      );
      expect(routers).toContain('"tiktok"');
      expect(routers).toContain("TikTok video script");
    });

    it("should have TikTok in database schema", () => {
      const schema = fs.readFileSync(
        path.join(PROJECT_ROOT, "drizzle/schema.ts"),
        "utf-8"
      );
      expect(schema).toContain('"tiktok"');
    });
  });

  describe("Campaign Analytics", () => {
    it("should have campaigns table in schema", () => {
      const schema = fs.readFileSync(
        path.join(PROJECT_ROOT, "drizzle/schema.ts"),
        "utf-8"
      );
      expect(schema).toContain('export const campaigns = mysqlTable("campaigns"');
      expect(schema).toContain("totalImpressions");
      expect(schema).toContain("totalEngagement");
      expect(schema).toContain("bestPlatform");
    });

    it("should have campaignPosts table in schema", () => {
      const schema = fs.readFileSync(
        path.join(PROJECT_ROOT, "drizzle/schema.ts"),
        "utf-8"
      );
      expect(schema).toContain('export const campaignPosts = mysqlTable("campaign_posts"');
      expect(schema).toContain("performanceScore");
    });

    it("should have campaign database functions", () => {
      const db = fs.readFileSync(
        path.join(PROJECT_ROOT, "server/db.ts"),
        "utf-8"
      );
      expect(db).toContain("getUserCampaigns");
      expect(db).toContain("getCampaignById");
      expect(db).toContain("createCampaign");
      expect(db).toContain("getCampaignAnalytics");
      expect(db).toContain("updateCampaignAggregates");
    });

    it("should have campaigns router in server", () => {
      const routers = fs.readFileSync(
        path.join(PROJECT_ROOT, "server/routers.ts"),
        "utf-8"
      );
      expect(routers).toContain("campaigns: router({");
      expect(routers).toContain("getAnalytics:");
      expect(routers).toContain("refreshAggregates:");
    });

    it("should have campaign analytics screen", () => {
      const campaignAnalytics = fs.readFileSync(
        path.join(PROJECT_ROOT, "app/campaign-analytics.tsx"),
        "utf-8"
      );
      expect(campaignAnalytics).toContain("CampaignAnalyticsScreen");
      expect(campaignAnalytics).toContain("platformBreakdown");
      expect(campaignAnalytics).toContain("Best Performer");
    });

    it("should have campaigns list screen", () => {
      const campaigns = fs.readFileSync(
        path.join(PROJECT_ROOT, "app/campaigns.tsx"),
        "utf-8"
      );
      expect(campaigns).toContain("CampaignsScreen");
      expect(campaigns).toContain("Create Campaign");
      expect(campaigns).toContain("trpc.campaigns.list");
    });
  });

  describe("Reddit Subreddit Targeting", () => {
    it("should have subreddit suggestions component", () => {
      const subredditSuggestions = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/subreddit-suggestions.tsx"),
        "utf-8"
      );
      expect(subredditSuggestions).toContain("SubredditSuggestions");
      expect(subredditSuggestions).toContain("selectedSubreddits");
      expect(subredditSuggestions).toContain("onToggleSubreddit");
    });

    it("should have AI subreddit suggestion endpoint", () => {
      const routers = fs.readFileSync(
        path.join(PROJECT_ROOT, "server/routers.ts"),
        "utf-8"
      );
      expect(routers).toContain("suggestSubreddits:");
      expect(routers).toContain("Reddit expert");
      expect(routers).toContain("subreddits");
    });

    it("should have subreddit targeting in create-content screen", () => {
      const createContent = fs.readFileSync(
        path.join(PROJECT_ROOT, "app/create-content.tsx"),
        "utf-8"
      );
      expect(createContent).toContain("SubredditSuggestions");
      expect(createContent).toContain("targetSubreddits");
    });

    it("should have subreddit state management", () => {
      const createContent = fs.readFileSync(
        path.join(PROJECT_ROOT, "app/create-content.tsx"),
        "utf-8"
      );
      expect(createContent).toContain("setTargetSubreddits");
      expect(createContent).toContain("subredditInput");
    });
  });

  describe("Code Cleanup Verification", () => {
    it("should not have unused hello-wave component", () => {
      const helloWavePath = path.join(PROJECT_ROOT, "components/hello-wave.tsx");
      expect(fs.existsSync(helloWavePath)).toBe(false);
    });

    it("should not have unused parallax-scroll-view component", () => {
      const parallaxPath = path.join(PROJECT_ROOT, "components/parallax-scroll-view.tsx");
      expect(fs.existsSync(parallaxPath)).toBe(false);
    });

    it("should not have unused external-link component", () => {
      const externalLinkPath = path.join(PROJECT_ROOT, "components/external-link.tsx");
      expect(fs.existsSync(externalLinkPath)).toBe(false);
    });
  });

  describe("Icon Mappings", () => {
    it("should have all required icons for new features", () => {
      const iconSymbol = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/ui/icon-symbol.tsx"),
        "utf-8"
      );
      expect(iconSymbol).toContain('"chart.bar"');
      expect(iconSymbol).toContain('"chevron.up"');
      expect(iconSymbol).toContain('"chevron.down"');
      expect(iconSymbol).toContain('"eye.slash"');
    });
  });

  describe("Platform Type Consistency", () => {
    it("should have consistent platform types across all files", () => {
      const files = [
        "app/create-content.tsx",
        "components/platform-preview.tsx",
        "components/hashtag-suggestions.tsx",
        "drizzle/schema.ts",
      ];

      const platforms = ["instagram", "twitter", "linkedin", "facebook", "youtube", "tiktok", "reddit"];

      files.forEach((file) => {
        const content = fs.readFileSync(path.join(PROJECT_ROOT, file), "utf-8");
        platforms.forEach((platform) => {
          expect(content).toContain(`"${platform}"`);
        });
      });
    });
  });
});
