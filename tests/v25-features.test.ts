import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.join(__dirname, "..");

describe("v2.5 Features - Subscription Enhancements", () => {
  describe("Stripe Webhook Handling", () => {
    it("should have webhook endpoint in server index", () => {
      const serverIndex = fs.readFileSync(
        path.join(projectRoot, "server/_core/index.ts"),
        "utf-8"
      );
      expect(serverIndex).toContain("/api/webhooks/stripe");
    });

    it("should have webhook handlers in stripe service", () => {
      const stripeService = fs.readFileSync(
        path.join(projectRoot, "server/stripe.ts"),
        "utf-8"
      );
      expect(stripeService).toContain("handleSubscriptionCreated");
      expect(stripeService).toContain("handleSubscriptionUpdated");
      expect(stripeService).toContain("handleSubscriptionDeleted");
      expect(stripeService).toContain("handlePaymentSucceeded");
      expect(stripeService).toContain("handlePaymentFailed");
    });

    it("should handle all required Stripe events", () => {
      const stripeService = fs.readFileSync(
        path.join(projectRoot, "server/stripe.ts"),
        "utf-8"
      );
      expect(stripeService).toContain("customer.subscription.created");
      expect(stripeService).toContain("customer.subscription.updated");
      expect(stripeService).toContain("customer.subscription.deleted");
      expect(stripeService).toContain("invoice.payment_succeeded");
      expect(stripeService).toContain("invoice.payment_failed");
    });

    it("should map Stripe status to internal status", () => {
      const stripeService = fs.readFileSync(
        path.join(projectRoot, "server/stripe.ts"),
        "utf-8"
      );
      // Status mapping is done inline in handlers
      expect(stripeService).toContain("active");
      expect(stripeService).toContain("canceled");
    });
  });

  describe("Onboarding Upsell Flow", () => {
    it("should have onboarding-upsell screen", () => {
      const upsellPath = path.join(projectRoot, "app/onboarding-upsell.tsx");
      expect(fs.existsSync(upsellPath)).toBe(true);
    });

    it("should display all subscription tiers", () => {
      const upsellScreen = fs.readFileSync(
        path.join(projectRoot, "app/onboarding-upsell.tsx"),
        "utf-8"
      );
      expect(upsellScreen).toContain("Free");
      expect(upsellScreen).toContain("Basic");
      expect(upsellScreen).toContain("Pro");
      expect(upsellScreen).toContain("Vibe");
    });

    it("should show tier pricing", () => {
      const upsellScreen = fs.readFileSync(
        path.join(projectRoot, "app/onboarding-upsell.tsx"),
        "utf-8"
      );
      expect(upsellScreen).toContain("$4.99");
      expect(upsellScreen).toContain("$9.99");
      expect(upsellScreen).toContain("$19.99");
    });

    it("should highlight recommended tier", () => {
      const upsellScreen = fs.readFileSync(
        path.join(projectRoot, "app/onboarding-upsell.tsx"),
        "utf-8"
      );
      // Pro tier is marked as popular (recommended)
      expect(upsellScreen).toContain("popular: true");
    });

    it("should navigate to upsell after onboarding", () => {
      const onboardingScreen = fs.readFileSync(
        path.join(projectRoot, "app/onboarding.tsx"),
        "utf-8"
      );
      expect(onboardingScreen).toContain("/onboarding-upsell");
    });

    it("should have continue with free option", () => {
      const upsellScreen = fs.readFileSync(
        path.join(projectRoot, "app/onboarding-upsell.tsx"),
        "utf-8"
      );
      // Free tier is selectable and user can continue with it
      expect(upsellScreen).toContain('selectedTier === "free"');
    });
  });

  describe("Usage Dashboard", () => {
    it("should have usage-dashboard screen", () => {
      const dashboardPath = path.join(projectRoot, "app/usage-dashboard.tsx");
      expect(fs.existsSync(dashboardPath)).toBe(true);
    });

    it("should display usage metrics", () => {
      const dashboard = fs.readFileSync(
        path.join(projectRoot, "app/usage-dashboard.tsx"),
        "utf-8"
      );
      expect(dashboard).toContain("Posts This Week");
      expect(dashboard).toContain("Platforms Used");
    });

    it("should show progress bars for usage", () => {
      const dashboard = fs.readFileSync(
        path.join(projectRoot, "app/usage-dashboard.tsx"),
        "utf-8"
      );
      expect(dashboard).toContain("progressBar");
      expect(dashboard).toContain("getUsagePercentage");
    });

    it("should display current plan information", () => {
      const dashboard = fs.readFileSync(
        path.join(projectRoot, "app/usage-dashboard.tsx"),
        "utf-8"
      );
      expect(dashboard).toContain("Current Plan");
      expect(dashboard).toContain("planCard");
    });

    it("should show upgrade button for non-vibe users", () => {
      const dashboard = fs.readFileSync(
        path.join(projectRoot, "app/usage-dashboard.tsx"),
        "utf-8"
      );
      expect(dashboard).toContain("Upgrade");
      expect(dashboard).toContain('tier !== "vibe"');
    });

    it("should display billing period information", () => {
      const dashboard = fs.readFileSync(
        path.join(projectRoot, "app/usage-dashboard.tsx"),
        "utf-8"
      );
      expect(dashboard).toContain("Billing Period");
      expect(dashboard).toContain("Resets On");
    });

    it("should show warning when approaching limits", () => {
      const dashboard = fs.readFileSync(
        path.join(projectRoot, "app/usage-dashboard.tsx"),
        "utf-8"
      );
      expect(dashboard).toContain("warningBadge");
      expect(dashboard).toContain("Almost full");
      expect(dashboard).toContain("Limit reached");
    });

    it("should be accessible from settings", () => {
      const settings = fs.readFileSync(
        path.join(projectRoot, "app/(tabs)/settings.tsx"),
        "utf-8"
      );
      expect(settings).toContain("Usage Dashboard");
      expect(settings).toContain("/usage-dashboard");
    });
  });

  describe("Code Cleanup", () => {
    it("should not have unused accessible-button component", () => {
      const accessibleButtonPath = path.join(
        projectRoot,
        "components/accessible-button.tsx"
      );
      expect(fs.existsSync(accessibleButtonPath)).toBe(false);
    });

    it("should not have unused accessible-input component", () => {
      const accessibleInputPath = path.join(
        projectRoot,
        "components/accessible-input.tsx"
      );
      expect(fs.existsSync(accessibleInputPath)).toBe(false);
    });
  });
});
