import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("v2.2 Multi-Platform Features", () => {
  const projectRoot = path.join(__dirname, "..");

  describe("Platform Support", () => {
    it("should include LinkedIn in create-content PLATFORMS array", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain('id: "linkedin"');
      expect(content).toContain('name: "LinkedIn"');
    });

    it("should include Reddit in create-content PLATFORMS array", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain('id: "reddit"');
      expect(content).toContain('name: "Reddit"');
    });

    it("should have Reddit-specific formatting rules", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("reddit:");
      expect(content).toContain("community-first");
      expect(content).toContain("no promotional language");
    });

    it("should include LinkedIn in social content type platforms", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      // Check that LinkedIn is in the social platforms filter
      expect(content).toMatch(/contentType === "social".*linkedin/s);
    });

    it("should include Reddit in social content type platforms", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      // Check that Reddit is in the social platforms filter
      expect(content).toMatch(/contentType === "social".*reddit/s);
    });
  });

  describe("Multi-Platform Selection", () => {
    it("should use selectedPlatforms array instead of single platform", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("selectedPlatforms");
      expect(content).toContain("useState<SocialPlatform[]>");
    });

    it("should have handlePlatformToggle function for multi-select", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("handlePlatformToggle");
    });

    it("should have Select All functionality", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("handleSelectAllPlatforms");
      expect(content).toContain("Select All");
      expect(content).toContain("Deselect All");
    });

    it("should show selected platform count", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("selectedPlatforms.length");
      expect(content).toContain("selected");
    });

    it("should prevent deselecting the last platform", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      // Check for the guard that prevents deselecting the only platform
      expect(content).toContain("prev.length === 1");
    });
  });

  describe("Platform-Specific Content Generation", () => {
    it("should generate content for each selected platform", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("platformVersions");
      expect(content).toContain("for (const platformId of selectedPlatforms)");
    });

    it("should store platform-specific content in platformVersions", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("platformVersions[platformId]");
      expect(content).toContain("content:");
      expect(content).toContain("hashtags:");
    });

    it("should have getContentForPlatform helper function", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("getContentForPlatform");
    });

    it("should have getHashtagsForPlatform helper function", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("getHashtagsForPlatform");
    });

    it("should exclude hashtags for Reddit", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      // Check that Reddit posts don't include hashtags
      expect(content).toContain('pid === "reddit"');
      expect(content).toContain('previewPlatform !== "reddit"');
    });
  });

  describe("Platform Preview Tabs", () => {
    it("should have platform tabs for preview when multiple platforms selected", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("Preview by platform");
      expect(content).toContain("previewPlatform");
    });

    it("should allow switching between platform previews", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("setPreviewPlatform");
    });
  });

  describe("Campaign Actions", () => {
    it("should save drafts for all selected platforms", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("handleSaveAsDraft");
      expect(content).toContain("for (const platformId of selectedPlatforms)");
    });

    it("should create campaign for all platforms", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("handlePostToAllPlatforms");
      expect(content).toContain("Campaign Created");
    });

    it("should show multi-platform summary message", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("will post to");
      expect(content).toContain("platforms with optimized formatting");
    });
  });

  describe("Backend Support", () => {
    it("should include reddit in posts.create platform enum", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "server/routers.ts"),
        "utf-8"
      );
      // Check posts.create includes reddit
      expect(content).toMatch(/posts.*create.*reddit/s);
    });

    it("should include reddit in ai.generateContent platform enum", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "server/routers.ts"),
        "utf-8"
      );
      // Check generateContent includes reddit
      expect(content).toMatch(/generateContent.*reddit/s);
    });

    it("should include reddit in ai.suggestHashtags platform enum", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "server/routers.ts"),
        "utf-8"
      );
      // Check suggestHashtags includes reddit
      expect(content).toMatch(/suggestHashtags.*reddit/s);
    });

    it("should have Reddit-specific instructions for AI content generation", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "server/routers.ts"),
        "utf-8"
      );
      expect(content).toContain("reddit:");
      expect(content).toContain("authentic Reddit content");
    });
  });

  describe("Database Schema", () => {
    it("should include reddit in posts platform enum", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "drizzle/schema.ts"),
        "utf-8"
      );
      expect(content).toMatch(/posts.*platform.*reddit/s);
    });

    it("should include reddit in postTemplates platform enum", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "drizzle/schema.ts"),
        "utf-8"
      );
      expect(content).toMatch(/postTemplates.*platform.*reddit/s);
    });
  });

  describe("Platform Preview Component", () => {
    it("should include Reddit in PlatformPreview platforms", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "components/platform-preview.tsx"),
        "utf-8"
      );
      expect(content).toContain('"reddit"');
      expect(content).toContain('name: "Reddit"');
    });

    it("should have Reddit-specific styling and tips", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "components/platform-preview.tsx"),
        "utf-8"
      );
      expect(content).toContain("reddit");
      expect(content).toContain("#FF4500"); // Reddit orange color
    });

    it("should show upvote instead of like for Reddit", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "components/platform-preview.tsx"),
        "utf-8"
      );
      expect(content).toContain("Upvote");
    });

    it("should not show hashtags for Reddit in preview", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "components/platform-preview.tsx"),
        "utf-8"
      );
      expect(content).toContain('selectedPlatform !== "reddit"');
    });
  });

  describe("Hashtag Suggestions", () => {
    it("should include Reddit in Platform type", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "components/hashtag-suggestions.tsx"),
        "utf-8"
      );
      expect(content).toContain('"reddit"');
    });

    it("should support topic prop for hashtag generation", () => {
      const content = fs.readFileSync(
        path.join(projectRoot, "components/hashtag-suggestions.tsx"),
        "utf-8"
      );
      expect(content).toContain("topic?:");
    });
  });
});

describe("Platform Character Limits", () => {
  const projectRoot = path.join(__dirname, "..");

  it("should define correct character limits for all platforms", () => {
    const content = fs.readFileSync(
      path.join(projectRoot, "app/create-content.tsx"),
      "utf-8"
    );
    
    // Check that character limits are defined
    expect(content).toContain("charLimit: 2200"); // Instagram
    expect(content).toContain("charLimit: 280"); // Twitter
    expect(content).toContain("charLimit: 3000"); // LinkedIn
    expect(content).toContain("charLimit: 63206"); // Facebook
    expect(content).toContain("charLimit: 5000"); // YouTube
    expect(content).toContain("charLimit: 40000"); // Reddit
  });

  it("should define correct hashtag limits for all platforms", () => {
    const content = fs.readFileSync(
      path.join(projectRoot, "app/create-content.tsx"),
      "utf-8"
    );
    
    // Check that hashtag limits are defined
    expect(content).toContain("hashtagLimit: 30"); // Instagram
    expect(content).toContain("hashtagLimit: 5"); // Twitter/LinkedIn
    expect(content).toContain("hashtagLimit: 10"); // Facebook
    expect(content).toContain("hashtagLimit: 15"); // YouTube
    expect(content).toContain("hashtagLimit: 0"); // Reddit (no hashtags)
  });
});
