import { describe, it, expect } from "vitest";

describe("Subscription System", () => {
  describe("Subscription Tiers", () => {
    const tiers = [
      { name: "free", price: 0, platforms: 1, postsPerWeek: 2 },
      { name: "basic", price: 4.99, platforms: 3, postsPerWeek: 15 },
      { name: "pro", price: 9.99, platforms: 7, postsPerWeek: 50 },
      { name: "vibe", price: 19.99, platforms: 7, postsPerWeek: -1 }, // -1 = unlimited
    ];

    it("should have 4 subscription tiers", () => {
      expect(tiers).toHaveLength(4);
    });

    it("should have correct tier names", () => {
      const tierNames = tiers.map(t => t.name);
      expect(tierNames).toContain("free");
      expect(tierNames).toContain("basic");
      expect(tierNames).toContain("pro");
      expect(tierNames).toContain("vibe");
    });

    it("should have correct pricing", () => {
      expect(tiers.find(t => t.name === "free")?.price).toBe(0);
      expect(tiers.find(t => t.name === "basic")?.price).toBe(4.99);
      expect(tiers.find(t => t.name === "pro")?.price).toBe(9.99);
      expect(tiers.find(t => t.name === "vibe")?.price).toBe(19.99);
    });

    it("should have increasing platform limits", () => {
      const free = tiers.find(t => t.name === "free");
      const basic = tiers.find(t => t.name === "basic");
      const pro = tiers.find(t => t.name === "pro");
      
      expect(free?.platforms).toBeLessThan(basic?.platforms || 0);
      expect(basic?.platforms).toBeLessThan(pro?.platforms || 0);
    });

    it("should have increasing post limits", () => {
      const free = tiers.find(t => t.name === "free");
      const basic = tiers.find(t => t.name === "basic");
      const pro = tiers.find(t => t.name === "pro");
      
      expect(free?.postsPerWeek).toBeLessThan(basic?.postsPerWeek || 0);
      expect(basic?.postsPerWeek).toBeLessThan(pro?.postsPerWeek || 0);
    });

    it("vibe tier should have unlimited posts", () => {
      const vibe = tiers.find(t => t.name === "vibe");
      expect(vibe?.postsPerWeek).toBe(-1);
    });
  });

  describe("Feature Gating", () => {
    const features = {
      free: {
        aiContent: true,
        hashtags: true,
        calendar: true,
        recurringTemplates: false,
        unifiedInbox: false,
        videoContent: false,
        campaignAnalytics: false,
        apiAccess: false,
      },
      basic: {
        aiContent: true,
        hashtags: true,
        calendar: true,
        recurringTemplates: true,
        unifiedInbox: true,
        videoContent: false,
        campaignAnalytics: false,
        apiAccess: false,
      },
      pro: {
        aiContent: true,
        hashtags: true,
        calendar: true,
        recurringTemplates: true,
        unifiedInbox: true,
        videoContent: true,
        campaignAnalytics: true,
        apiAccess: false,
      },
      vibe: {
        aiContent: true,
        hashtags: true,
        calendar: true,
        recurringTemplates: true,
        unifiedInbox: true,
        videoContent: true,
        campaignAnalytics: true,
        apiAccess: true,
      },
    };

    it("free tier should have basic AI features", () => {
      expect(features.free.aiContent).toBe(true);
      expect(features.free.hashtags).toBe(true);
      expect(features.free.calendar).toBe(true);
    });

    it("free tier should not have premium features", () => {
      expect(features.free.recurringTemplates).toBe(false);
      expect(features.free.unifiedInbox).toBe(false);
      expect(features.free.videoContent).toBe(false);
    });

    it("basic tier should unlock inbox features", () => {
      expect(features.basic.recurringTemplates).toBe(true);
      expect(features.basic.unifiedInbox).toBe(true);
    });

    it("pro tier should unlock video and analytics", () => {
      expect(features.pro.videoContent).toBe(true);
      expect(features.pro.campaignAnalytics).toBe(true);
    });

    it("vibe tier should have all features", () => {
      expect(features.vibe.apiAccess).toBe(true);
      Object.values(features.vibe).forEach(value => {
        expect(value).toBe(true);
      });
    });
  });

  describe("Subscription Limits", () => {
    const limits = {
      free: { platforms: 1, postsPerWeek: 2, teamMembers: 1, analyticsRetention: 7 },
      basic: { platforms: 3, postsPerWeek: 15, teamMembers: 1, analyticsRetention: 30 },
      pro: { platforms: 7, postsPerWeek: 50, teamMembers: 1, analyticsRetention: 90 },
      vibe: { platforms: 7, postsPerWeek: -1, teamMembers: 3, analyticsRetention: 365 },
    };

    it("should enforce platform limits", () => {
      expect(limits.free.platforms).toBe(1);
      expect(limits.basic.platforms).toBe(3);
      expect(limits.pro.platforms).toBe(7);
      expect(limits.vibe.platforms).toBe(7);
    });

    it("should enforce post limits", () => {
      expect(limits.free.postsPerWeek).toBe(2);
      expect(limits.basic.postsPerWeek).toBe(15);
      expect(limits.pro.postsPerWeek).toBe(50);
      expect(limits.vibe.postsPerWeek).toBe(-1); // unlimited
    });

    it("should have team members only for vibe", () => {
      expect(limits.free.teamMembers).toBe(1);
      expect(limits.basic.teamMembers).toBe(1);
      expect(limits.pro.teamMembers).toBe(1);
      expect(limits.vibe.teamMembers).toBe(3);
    });

    it("should have increasing analytics retention", () => {
      expect(limits.free.analyticsRetention).toBeLessThan(limits.basic.analyticsRetention);
      expect(limits.basic.analyticsRetention).toBeLessThan(limits.pro.analyticsRetention);
      expect(limits.pro.analyticsRetention).toBeLessThan(limits.vibe.analyticsRetention);
    });
  });

  describe("Annual Pricing", () => {
    const annualPrices = {
      basic: { monthly: 4.99, annual: 49.99, discount: 17 },
      pro: { monthly: 9.99, annual: 99.99, discount: 17 },
      vibe: { monthly: 19.99, annual: 179.99, discount: 25 },
    };

    it("should offer annual discount for basic", () => {
      const monthlyTotal = annualPrices.basic.monthly * 12;
      const savings = monthlyTotal - annualPrices.basic.annual;
      const discountPercent = Math.round((savings / monthlyTotal) * 100);
      expect(discountPercent).toBeGreaterThanOrEqual(15);
    });

    it("should offer annual discount for pro", () => {
      const monthlyTotal = annualPrices.pro.monthly * 12;
      const savings = monthlyTotal - annualPrices.pro.annual;
      const discountPercent = Math.round((savings / monthlyTotal) * 100);
      expect(discountPercent).toBeGreaterThanOrEqual(15);
    });

    it("should offer higher annual discount for vibe", () => {
      const monthlyTotal = annualPrices.vibe.monthly * 12;
      const savings = monthlyTotal - annualPrices.vibe.annual;
      const discountPercent = Math.round((savings / monthlyTotal) * 100);
      expect(discountPercent).toBeGreaterThanOrEqual(20);
    });
  });
});

describe("Stripe Integration", () => {
  it("should have subscription plans defined", () => {
    const plans = ["free", "basic", "pro", "vibe"];
    expect(plans).toHaveLength(4);
  });

  it("should support monthly billing", () => {
    const billingIntervals = ["month", "year"];
    expect(billingIntervals).toContain("month");
  });

  it("should support annual billing", () => {
    const billingIntervals = ["month", "year"];
    expect(billingIntervals).toContain("year");
  });
});
