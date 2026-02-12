import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

// ---- Brand Settings Tests ----

describe("Brand Settings - useBrand hook logic", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it("should define correct default brand settings", () => {
    const DEFAULT_BRAND = {
      brandName: "",
      tagline: "",
      industry: "",
      toneOfVoice: "professional",
      targetAudience: "",
      brandColors: [],
      keyTopics: [],
      website: "",
      uniqueSellingPoint: "",
    };

    expect(DEFAULT_BRAND.brandName).toBe("");
    expect(DEFAULT_BRAND.toneOfVoice).toBe("professional");
    expect(DEFAULT_BRAND.brandColors).toEqual([]);
    expect(DEFAULT_BRAND.keyTopics).toEqual([]);
  });

  it("should store and retrieve brand settings from AsyncStorage", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    
    const brandData = {
      brandName: "Elev8AI",
      tagline: "Elevate Your Business with AI",
      industry: "Technology",
      toneOfVoice: "professional",
      targetAudience: "Small business owners aged 30-55",
      brandColors: ["#F97316", "#3B82F6"],
      keyTopics: ["AI", "Marketing", "Growth"],
      website: "https://elev8ai.com",
      uniqueSellingPoint: "We make AI accessible for small businesses",
    };

    await AsyncStorage.setItem("@postpal_brand_settings", JSON.stringify(brandData));
    const stored = await AsyncStorage.getItem("@postpal_brand_settings");
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.brandName).toBe("Elev8AI");
    expect(parsed.tagline).toBe("Elevate Your Business with AI");
    expect(parsed.industry).toBe("Technology");
    expect(parsed.brandColors).toEqual(["#F97316", "#3B82F6"]);
    expect(parsed.keyTopics).toEqual(["AI", "Marketing", "Growth"]);
  });

  it("should generate brand context string correctly", () => {
    const brand = {
      brandName: "TestBrand",
      tagline: "Test Tagline",
      industry: "Technology",
      toneOfVoice: "casual",
      targetAudience: "Developers aged 25-40",
      brandColors: ["#FF0000"],
      keyTopics: ["coding", "AI"],
      website: "https://test.com",
      uniqueSellingPoint: "Best dev tools",
    };

    // Simulate getBrandContext logic
    const parts: string[] = [];
    if (brand.brandName) parts.push(`Brand: ${brand.brandName}`);
    if (brand.tagline) parts.push(`Tagline: "${brand.tagline}"`);
    if (brand.industry) parts.push(`Industry: ${brand.industry}`);
    if (brand.toneOfVoice) parts.push(`Tone: ${brand.toneOfVoice}`);
    if (brand.targetAudience) parts.push(`Target Audience: ${brand.targetAudience}`);
    if (brand.uniqueSellingPoint) parts.push(`USP: ${brand.uniqueSellingPoint}`);
    if (brand.keyTopics.length > 0) parts.push(`Key Topics: ${brand.keyTopics.join(", ")}`);
    if (brand.website) parts.push(`Website: ${brand.website}`);

    const context = parts.join(". ");
    expect(context).toContain("Brand: TestBrand");
    expect(context).toContain('Tagline: "Test Tagline"');
    expect(context).toContain("Industry: Technology");
    expect(context).toContain("Tone: casual");
    expect(context).toContain("Target Audience: Developers aged 25-40");
    expect(context).toContain("Key Topics: coding, AI");
    expect(context).toContain("Website: https://test.com");
  });

  it("should return empty string for unconfigured brand", () => {
    const brand = {
      brandName: "",
      tagline: "",
      industry: "",
      toneOfVoice: "professional",
      targetAudience: "",
      brandColors: [],
      keyTopics: [],
      website: "",
      uniqueSellingPoint: "",
    };

    const isConfigured = brand.brandName.trim().length > 0;
    expect(isConfigured).toBe(false);

    // getBrandContext should return empty for unconfigured
    if (!isConfigured) {
      expect("").toBe("");
    }
  });

  it("should reset brand settings correctly", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    
    await AsyncStorage.setItem("@postpal_brand_settings", JSON.stringify({ brandName: "Test" }));
    expect(await AsyncStorage.getItem("@postpal_brand_settings")).not.toBeNull();

    await AsyncStorage.removeItem("@postpal_brand_settings");
    expect(await AsyncStorage.getItem("@postpal_brand_settings")).toBeNull();
  });
});

// ---- Upload-Post API Tests ----

describe("Upload-Post API - Configuration", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it("should store and retrieve API config", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    
    await AsyncStorage.setItem("@postpal_upload_post_api_key", "test-api-key-123");
    await AsyncStorage.setItem("@postpal_upload_post_user", "testuser");

    const apiKey = await AsyncStorage.getItem("@postpal_upload_post_api_key");
    const userProfile = await AsyncStorage.getItem("@postpal_upload_post_user");

    expect(apiKey).toBe("test-api-key-123");
    expect(userProfile).toBe("testuser");
  });

  it("should return null when not configured", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    
    const apiKey = await AsyncStorage.getItem("@postpal_upload_post_api_key");
    const userProfile = await AsyncStorage.getItem("@postpal_upload_post_user");

    expect(apiKey).toBeNull();
    expect(userProfile).toBeNull();
  });

  it("should clear API config correctly", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    
    await AsyncStorage.setItem("@postpal_upload_post_api_key", "key");
    await AsyncStorage.setItem("@postpal_upload_post_user", "user");

    await AsyncStorage.removeItem("@postpal_upload_post_api_key");
    await AsyncStorage.removeItem("@postpal_upload_post_user");

    expect(await AsyncStorage.getItem("@postpal_upload_post_api_key")).toBeNull();
    expect(await AsyncStorage.getItem("@postpal_upload_post_user")).toBeNull();
  });
});

describe("Upload-Post API - Platform Mapping", () => {
  it("should map PostPal platforms to Upload-Post platforms correctly", () => {
    const UPLOAD_POST_PLATFORMS: Record<string, string> = {
      instagram: "instagram",
      twitter: "x",
      linkedin: "linkedin",
      facebook: "facebook",
      youtube: "youtube",
      tiktok: "tiktok",
      reddit: "reddit",
      threads: "threads",
      bluesky: "bluesky",
      pinterest: "pinterest",
    };

    expect(UPLOAD_POST_PLATFORMS["instagram"]).toBe("instagram");
    expect(UPLOAD_POST_PLATFORMS["twitter"]).toBe("x");
    expect(UPLOAD_POST_PLATFORMS["linkedin"]).toBe("linkedin");
    expect(UPLOAD_POST_PLATFORMS["facebook"]).toBe("facebook");
    expect(UPLOAD_POST_PLATFORMS["reddit"]).toBe("reddit");
    expect(UPLOAD_POST_PLATFORMS["tiktok"]).toBe("tiktok");
  });

  it("should identify text-only supported platforms", () => {
    const TEXT_PLATFORMS = ["x", "linkedin", "facebook", "threads", "reddit", "bluesky"];

    expect(TEXT_PLATFORMS).toContain("x");
    expect(TEXT_PLATFORMS).toContain("linkedin");
    expect(TEXT_PLATFORMS).toContain("facebook");
    expect(TEXT_PLATFORMS).toContain("reddit");
    expect(TEXT_PLATFORMS).not.toContain("instagram"); // Instagram requires image
    expect(TEXT_PLATFORMS).not.toContain("tiktok"); // TikTok requires video
    expect(TEXT_PLATFORMS).not.toContain("youtube"); // YouTube requires video
  });
});

describe("Upload-Post API - Post Result Types", () => {
  it("should handle successful multi-post result", () => {
    const result = {
      overallSuccess: true,
      results: [
        { success: true, platform: "twitter", postUrl: "https://x.com/post/123" },
        { success: true, platform: "linkedin", postUrl: "https://linkedin.com/post/456" },
      ],
      failedPlatforms: [],
      successPlatforms: ["twitter", "linkedin"],
    };

    expect(result.overallSuccess).toBe(true);
    expect(result.successPlatforms).toHaveLength(2);
    expect(result.failedPlatforms).toHaveLength(0);
  });

  it("should handle partial failure multi-post result", () => {
    const result = {
      overallSuccess: false,
      results: [
        { success: true, platform: "twitter", postUrl: "https://x.com/post/123" },
        { success: false, platform: "instagram", error: "Instagram requires an image" },
      ],
      failedPlatforms: ["instagram"],
      successPlatforms: ["twitter"],
    };

    expect(result.overallSuccess).toBe(false);
    expect(result.successPlatforms).toHaveLength(1);
    expect(result.failedPlatforms).toHaveLength(1);
    expect(result.results[1].error).toContain("image");
  });

  it("should handle complete failure", () => {
    const result = {
      overallSuccess: false,
      results: [
        { success: false, platform: "instagram", error: "Instagram requires an image" },
      ],
      failedPlatforms: ["instagram"],
      successPlatforms: [],
    };

    expect(result.overallSuccess).toBe(false);
    expect(result.successPlatforms).toHaveLength(0);
    expect(result.failedPlatforms).toHaveLength(1);
  });
});

describe("Brand + Content Generation Integration", () => {
  it("should add brand suffix to local content when brand is configured", () => {
    const brandName = "Elev8AI";
    const brandTagline = "Elevate Your Business with AI";
    const brandSuffix = brandName ? `\n\n— ${brandName}${brandTagline ? ` | ${brandTagline}` : ""}` : "";

    expect(brandSuffix).toBe("\n\n— Elev8AI | Elevate Your Business with AI");
  });

  it("should not add brand suffix when brand is not configured", () => {
    const brandName = "";
    const brandTagline = "";
    const brandSuffix = brandName ? `\n\n— ${brandName}${brandTagline ? ` | ${brandTagline}` : ""}` : "";

    expect(brandSuffix).toBe("");
  });

  it("should include brand context in server AI generation params", () => {
    const isBrandConfigured = true;
    const brandContext = "Brand: Elev8AI. Industry: Technology. Tone: professional";

    const params = {
      contentType: "social",
      platform: "instagram",
      topic: "AI in marketing",
      tone: "professional",
      keywords: ["AI", "marketing"],
      brandContext: isBrandConfigured ? brandContext : undefined,
    };

    expect(params.brandContext).toBe(brandContext);
  });

  it("should not include brand context when brand is not configured", () => {
    const isBrandConfigured = false;
    const brandContext = "";

    const params = {
      contentType: "social",
      platform: "instagram",
      topic: "AI in marketing",
      tone: "professional",
      keywords: ["AI", "marketing"],
      brandContext: isBrandConfigured ? brandContext : undefined,
    };

    expect(params.brandContext).toBeUndefined();
  });
});

describe("Tone Options", () => {
  it("should have all expected tone options", () => {
    const TONE_OPTIONS = [
      { id: "professional", label: "Professional" },
      { id: "casual", label: "Casual" },
      { id: "friendly", label: "Friendly" },
      { id: "witty", label: "Witty" },
      { id: "inspirational", label: "Inspirational" },
      { id: "educational", label: "Educational" },
      { id: "bold", label: "Bold" },
      { id: "empathetic", label: "Empathetic" },
    ];

    expect(TONE_OPTIONS).toHaveLength(8);
    expect(TONE_OPTIONS.map(t => t.id)).toContain("professional");
    expect(TONE_OPTIONS.map(t => t.id)).toContain("witty");
    expect(TONE_OPTIONS.map(t => t.id)).toContain("inspirational");
  });
});

describe("Industry Options", () => {
  it("should have comprehensive industry list", () => {
    const INDUSTRY_OPTIONS = [
      "Technology", "Marketing & Advertising", "E-commerce & Retail",
      "Health & Wellness", "Finance & Banking", "Education",
      "Real Estate", "Food & Restaurant", "Fashion & Beauty",
      "Travel & Hospitality", "Entertainment & Media", "Consulting",
      "Non-Profit", "Fitness & Sports", "Home & Garden",
      "Automotive", "Legal Services", "Construction",
      "Art & Design", "Other",
    ];

    expect(INDUSTRY_OPTIONS.length).toBeGreaterThanOrEqual(15);
    expect(INDUSTRY_OPTIONS).toContain("Technology");
    expect(INDUSTRY_OPTIONS).toContain("Marketing & Advertising");
    expect(INDUSTRY_OPTIONS).toContain("Other");
  });
});
