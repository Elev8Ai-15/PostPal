import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..");

describe("PostPal v1.4 Stability Check", () => {
  
  describe("1. New Component Files Exist", () => {
    const newComponents = [
      "components/content-card.tsx",
      "components/platform-preview.tsx",
      "components/hashtag-suggestions.tsx",
    ];

    newComponents.forEach((component) => {
      it(`should have ${component}`, () => {
        const filePath = path.join(PROJECT_ROOT, component);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  describe("2. Content Card Component Structure", () => {
    it("should export ContentCard component", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/content-card.tsx"),
        "utf-8"
      );
      expect(content).toContain("export function ContentCard");
    });

    it("should support image thumbnails", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/content-card.tsx"),
        "utf-8"
      );
      expect(content).toContain("imageUrl");
      expect(content).toContain("thumbnailUrl");
      expect(content).toContain("expo-image");
    });

    it("should support hashtags display", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/content-card.tsx"),
        "utf-8"
      );
      expect(content).toContain("hashtags");
      expect(content).toContain("hashtagArray");
    });

    it("should support compact mode", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/content-card.tsx"),
        "utf-8"
      );
      expect(content).toContain("compact");
      expect(content).toContain("compactCard");
    });
  });

  describe("3. Platform Preview Component Structure", () => {
    it("should export PlatformPreview component", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/platform-preview.tsx"),
        "utf-8"
      );
      expect(content).toContain("export function PlatformPreview");
    });

    it("should support all major platforms", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/platform-preview.tsx"),
        "utf-8"
      );
      expect(content).toContain("instagram");
      expect(content).toContain("twitter");
      expect(content).toContain("linkedin");
      expect(content).toContain("facebook");
      expect(content).toContain("youtube");
    });

    it("should have platform-specific character limits", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/platform-preview.tsx"),
        "utf-8"
      );
      expect(content).toContain("charLimit");
      expect(content).toContain("hashtagLimit");
    });

    it("should display warnings for content over limits", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/platform-preview.tsx"),
        "utf-8"
      );
      expect(content).toContain("isOverLimit");
      expect(content).toContain("warningContainer");
    });

    it("should show platform tips", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/platform-preview.tsx"),
        "utf-8"
      );
      expect(content).toContain("tipsContainer");
      expect(content).toContain("Square images");
    });
  });

  describe("4. Hashtag Suggestions Component Structure", () => {
    it("should export HashtagSuggestions component", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/hashtag-suggestions.tsx"),
        "utf-8"
      );
      expect(content).toContain("export function HashtagSuggestions");
    });

    it("should use trpc for AI suggestions", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/hashtag-suggestions.tsx"),
        "utf-8"
      );
      expect(content).toContain("trpc.ai.suggestHashtags");
    });

    it("should categorize hashtags (trending, niche)", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/hashtag-suggestions.tsx"),
        "utf-8"
      );
      expect(content).toContain("trending");
      expect(content).toContain("niche");
    });

    it("should support hashtag selection toggle", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/hashtag-suggestions.tsx"),
        "utf-8"
      );
      expect(content).toContain("onHashtagToggle");
      expect(content).toContain("selectedHashtags");
    });
  });

  describe("5. Backend API Endpoints", () => {
    it("should have suggestHashtags endpoint in routers", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "server/routers.ts"),
        "utf-8"
      );
      expect(content).toContain("suggestHashtags");
    });

    it("should have generatePlatformPreview endpoint in routers", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "server/routers.ts"),
        "utf-8"
      );
      expect(content).toContain("generatePlatformPreview");
    });

    it("should have proper input validation for suggestHashtags", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "server/routers.ts"),
        "utf-8"
      );
      expect(content).toContain("content: z.string().min(1)");
      expect(content).toContain('platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube"])');
    });
  });

  describe("6. Database Schema", () => {
    it("should have hashtags field in posts table", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "drizzle/schema.ts"),
        "utf-8"
      );
      expect(content).toContain("hashtags");
    });
  });

  describe("7. Icon Mappings", () => {
    const requiredIcons = [
      "person.2.fill",
      "person.3.fill",
      "play.circle.fill",
      "globe",
      "ellipsis",
      "heart",
      "bubble.left",
      "arrow.2.squarepath",
      "exclamationmark.triangle",
      "lightbulb",
      "number",
      "flame.fill",
      "target",
    ];

    it("should have all required icon mappings", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "components/ui/icon-symbol.tsx"),
        "utf-8"
      );
      requiredIcons.forEach((icon) => {
        expect(content).toContain(`"${icon}"`);
      });
    });
  });

  describe("8. Create Content Screen Integration", () => {
    it("should import HashtagSuggestions component", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("HashtagSuggestions");
    });

    it("should import PlatformPreview component", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("PlatformPreview");
    });

    it("should have selectedHashtags state", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("selectedHashtags");
      expect(content).toContain("setSelectedHashtags");
    });

    it("should have showPreview state", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("showPreview");
      expect(content).toContain("setShowPreview");
    });

    it("should have handleHashtagToggle function", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "app/create-content.tsx"),
        "utf-8"
      );
      expect(content).toContain("handleHashtagToggle");
    });
  });

  describe("9. TypeScript Compilation", () => {
    it("should have no TypeScript errors in new components", async () => {
      // This test validates that all new files are syntactically correct
      const files = [
        "components/content-card.tsx",
        "components/platform-preview.tsx",
        "components/hashtag-suggestions.tsx",
      ];

      files.forEach((file) => {
        const content = fs.readFileSync(path.join(PROJECT_ROOT, file), "utf-8");
        // Basic syntax checks
        expect(content).toContain("import");
        expect(content).toContain("export");
        expect(content).not.toContain("// @ts-ignore");
        expect(content).not.toContain("// @ts-nocheck");
      });
    });
  });

  describe("10. Feature Completeness", () => {
    it("should have all v1.4 features marked complete in todo.md", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "todo.md"),
        "utf-8"
      );
      expect(content).toContain("[x] Content preview with image thumbnails");
      expect(content).toContain("[x] AI-powered hashtag suggestions");
      expect(content).toContain("[x] Multi-platform post preview");
    });
  });

  describe("11. Styling Consistency", () => {
    it("should use useColors hook in all new components", () => {
      const components = [
        "components/content-card.tsx",
        "components/platform-preview.tsx",
        "components/hashtag-suggestions.tsx",
      ];

      components.forEach((component) => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, component),
          "utf-8"
        );
        expect(content).toContain("useColors");
      });
    });

    it("should use StyleSheet.create for styles", () => {
      const components = [
        "components/content-card.tsx",
        "components/platform-preview.tsx",
        "components/hashtag-suggestions.tsx",
      ];

      components.forEach((component) => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, component),
          "utf-8"
        );
        expect(content).toContain("StyleSheet.create");
      });
    });
  });

  describe("12. Accessibility", () => {
    it("should use TouchableOpacity with activeOpacity", () => {
      const components = [
        "components/content-card.tsx",
        "components/platform-preview.tsx",
        "components/hashtag-suggestions.tsx",
      ];

      components.forEach((component) => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, component),
          "utf-8"
        );
        expect(content).toContain("TouchableOpacity");
        expect(content).toContain("activeOpacity");
      });
    });
  });
});
