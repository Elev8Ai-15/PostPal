import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PLATFORM_CONFIG,
  formatContentForPlatform,
  validateContent,
  getOptimalPostingTimes,
  type SocialPlatform,
  type PostContent,
} from "../social-posting";

describe("Social Posting Service", () => {
  describe("PLATFORM_CONFIG", () => {
    it("should have configuration for all 10 platforms", () => {
      const platforms: SocialPlatform[] = [
        "twitter",
        "instagram",
        "facebook",
        "linkedin",
        "tiktok",
        "reddit",
        "youtube",
        "threads",
        "bluesky",
        "pinterest",
      ];

      platforms.forEach((platform) => {
        expect(PLATFORM_CONFIG[platform]).toBeDefined();
        expect(PLATFORM_CONFIG[platform].name).toBeTruthy();
        expect(PLATFORM_CONFIG[platform].maxLength).toBeGreaterThan(0);
      });
    });

    it("should have correct character limits for each platform", () => {
      expect(PLATFORM_CONFIG.twitter.maxLength).toBe(280);
      expect(PLATFORM_CONFIG.instagram.maxLength).toBe(2200);
      expect(PLATFORM_CONFIG.linkedin.maxLength).toBe(3000);
      expect(PLATFORM_CONFIG.reddit.maxLength).toBe(40000);
      expect(PLATFORM_CONFIG.threads.maxLength).toBe(500);
      expect(PLATFORM_CONFIG.bluesky.maxLength).toBe(300);
    });

    it("should have correct media support flags", () => {
      expect(PLATFORM_CONFIG.tiktok.supportsImages).toBe(false);
      expect(PLATFORM_CONFIG.tiktok.supportsVideos).toBe(true);
      expect(PLATFORM_CONFIG.bluesky.supportsVideos).toBe(false);
      expect(PLATFORM_CONFIG.instagram.supportsImages).toBe(true);
      expect(PLATFORM_CONFIG.instagram.supportsVideos).toBe(true);
    });

    it("should have correct hashtag support", () => {
      expect(PLATFORM_CONFIG.reddit.supportsHashtags).toBe(false);
      expect(PLATFORM_CONFIG.reddit.maxHashtags).toBe(0);
      expect(PLATFORM_CONFIG.instagram.supportsHashtags).toBe(true);
      expect(PLATFORM_CONFIG.instagram.maxHashtags).toBe(30);
    });
  });

  describe("formatContentForPlatform", () => {
    it("should add hashtags for platforms that support them", () => {
      const content: PostContent = {
        text: "Hello world",
        hashtags: ["test", "demo"],
      };

      const result = formatContentForPlatform(content, "instagram");
      expect(result.text).toContain("#test");
      expect(result.text).toContain("#demo");
    });

    it("should not add hashtags for Reddit", () => {
      const content: PostContent = {
        text: "Hello world",
        hashtags: ["test", "demo"],
      };

      const result = formatContentForPlatform(content, "reddit");
      expect(result.text).not.toContain("#");
      expect(result.text).toBe("Hello world");
    });

    it("should truncate content that exceeds platform limit", () => {
      const longText = "a".repeat(300);
      const content: PostContent = {
        text: longText,
      };

      const result = formatContentForPlatform(content, "twitter");
      expect(result.text.length).toBeLessThanOrEqual(280);
      expect(result.text).toContain("...");
    });

    it("should limit hashtags to platform maximum", () => {
      const content: PostContent = {
        text: "Short post",
        hashtags: Array(10).fill("tag").map((t, i) => `${t}${i}`),
      };

      const result = formatContentForPlatform(content, "twitter");
      // Twitter allows 5 hashtags max
      const hashtagCount = (result.text.match(/#/g) || []).length;
      expect(hashtagCount).toBeLessThanOrEqual(5);
    });

    it("should handle content with existing hashtag prefix", () => {
      const content: PostContent = {
        text: "Hello world",
        hashtags: ["#alreadyPrefixed", "notPrefixed"],
      };

      const result = formatContentForPlatform(content, "instagram");
      expect(result.text).toContain("#alreadyPrefixed");
      expect(result.text).toContain("#notPrefixed");
    });
  });

  describe("validateContent", () => {
    it("should validate content within limits", () => {
      const content: PostContent = {
        text: "Hello world",
      };

      const result = validateContent(content, "twitter");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject content exceeding character limit", () => {
      const content: PostContent = {
        text: "a".repeat(300),
      };

      const result = validateContent(content, "twitter");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Text exceeds 280 character limit for Twitter / X");
    });

    it("should reject video content on platforms that don't support it", () => {
      const content: PostContent = {
        text: "Check out this video",
        mediaType: "video",
      };

      const result = validateContent(content, "bluesky");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Bluesky does not support video posts");
    });

    it("should reject image content on TikTok", () => {
      const content: PostContent = {
        text: "Check out this image",
        mediaType: "image",
      };

      const result = validateContent(content, "tiktok");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("TikTok does not support image posts");
    });

    it("should require subreddit for Reddit posts", () => {
      const content: PostContent = {
        text: "Hello Reddit",
      };

      const result = validateContent(content, "reddit");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Reddit posts require a subreddit");
    });

    it("should accept Reddit posts with subreddit", () => {
      const content: PostContent = {
        text: "Hello Reddit",
        subreddit: "test",
      };

      const result = validateContent(content, "reddit");
      expect(result.valid).toBe(true);
    });

    it("should reject too many hashtags", () => {
      const content: PostContent = {
        text: "Hello",
        hashtags: Array(40).fill("tag").map((t, i) => `${t}${i}`),
      };

      const result = validateContent(content, "instagram");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Instagram allows maximum 30 hashtags");
    });
  });

  describe("getOptimalPostingTimes", () => {
    it("should return optimal times for each platform", () => {
      const platforms: SocialPlatform[] = [
        "twitter",
        "instagram",
        "facebook",
        "linkedin",
        "tiktok",
        "reddit",
        "youtube",
        "threads",
        "bluesky",
        "pinterest",
      ];

      platforms.forEach((platform) => {
        const times = getOptimalPostingTimes(platform);
        expect(Array.isArray(times)).toBe(true);
        expect(times.length).toBeGreaterThan(0);
        times.forEach((time) => {
          expect(time).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
        });
      });
    });

    it("should return different times for different platforms", () => {
      const twitterTimes = getOptimalPostingTimes("twitter");
      const pinterestTimes = getOptimalPostingTimes("pinterest");

      // Pinterest is known for evening posting
      expect(pinterestTimes.some((t) => t.includes("PM"))).toBe(true);
    });
  });
});

describe("Platform-specific formatting", () => {
  it("should handle Twitter's short format", () => {
    const content: PostContent = {
      text: "This is a tweet about something interesting",
      hashtags: ["twitter", "social"],
    };

    const result = formatContentForPlatform(content, "twitter");
    expect(result.text.length).toBeLessThanOrEqual(280);
  });

  it("should handle Instagram's longer format with many hashtags", () => {
    const content: PostContent = {
      text: "Check out this amazing photo! The lighting was perfect today.",
      hashtags: [
        "photography",
        "nature",
        "sunset",
        "beautiful",
        "instagood",
        "photooftheday",
      ],
    };

    const result = formatContentForPlatform(content, "instagram");
    expect(result.text).toContain("#photography");
    expect(result.text.length).toBeLessThanOrEqual(2200);
  });

  it("should handle LinkedIn's professional format", () => {
    const content: PostContent = {
      text: "Excited to share my thoughts on the future of AI in business.",
      hashtags: ["AI", "Business", "Innovation"],
    };

    const result = formatContentForPlatform(content, "linkedin");
    expect(result.text).toContain("#AI");
    expect(result.text.length).toBeLessThanOrEqual(3000);
  });
});
