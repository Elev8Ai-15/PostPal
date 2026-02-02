import Stripe from "stripe";

// Initialize Stripe with secret key from environment
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn("STRIPE_SECRET_KEY not set - Stripe features will be disabled");
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2026-01-28.clover" })
  : null;

// Subscription tier definitions
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "free",
    displayName: "Free",
    description: "Perfect for getting started with social media management",
    priceMonthly: 0,
    priceYearly: 0,
    maxPlatforms: 1,
    maxPostsPerWeek: 2,
    maxTeamMembers: 1,
    analyticsRetentionDays: 7,
    features: {
      hasRecurringTemplates: false,
      hasUnifiedInbox: false,
      hasSavedReplies: false,
      hasAutoResponders: false,
      hasAiReplySuggestions: false,
      hasVideoContent: false,
      hasCampaignAnalytics: false,
      hasAiStrategy: false,
      hasSubredditTargeting: false,
      hasExportReports: false,
      hasPrioritySupport: false,
      hasApiAccess: false,
    },
  },
  basic: {
    name: "basic",
    displayName: "Basic",
    description: "Ideal for solopreneurs and small creators",
    priceMonthly: 499, // $4.99
    priceYearly: 4999, // $49.99 (17% off)
    maxPlatforms: 3,
    maxPostsPerWeek: 15,
    maxTeamMembers: 1,
    analyticsRetentionDays: 30,
    features: {
      hasRecurringTemplates: true,
      hasUnifiedInbox: true,
      hasSavedReplies: true,
      hasAutoResponders: false,
      hasAiReplySuggestions: false,
      hasVideoContent: false,
      hasCampaignAnalytics: false,
      hasAiStrategy: false,
      hasSubredditTargeting: false,
      hasExportReports: false,
      hasPrioritySupport: false,
      hasApiAccess: false,
    },
  },
  pro: {
    name: "pro",
    displayName: "Pro",
    description: "Best for growing businesses and serious creators",
    priceMonthly: 999, // $9.99
    priceYearly: 9999, // $99.99 (17% off)
    maxPlatforms: 7, // All platforms
    maxPostsPerWeek: 50,
    maxTeamMembers: 1,
    analyticsRetentionDays: 90,
    features: {
      hasRecurringTemplates: true,
      hasUnifiedInbox: true,
      hasSavedReplies: true,
      hasAutoResponders: true,
      hasAiReplySuggestions: true,
      hasVideoContent: true,
      hasCampaignAnalytics: true,
      hasAiStrategy: true,
      hasSubredditTargeting: true,
      hasExportReports: false,
      hasPrioritySupport: false,
      hasApiAccess: false,
    },
  },
  vibe: {
    name: "vibe",
    displayName: "Vibe",
    description: "Ultimate tier for agencies and power users",
    priceMonthly: 1999, // $19.99
    priceYearly: 17999, // $179.99 (25% off)
    maxPlatforms: 7, // All platforms
    maxPostsPerWeek: -1, // Unlimited
    maxTeamMembers: 3,
    analyticsRetentionDays: -1, // Full history
    features: {
      hasRecurringTemplates: true,
      hasUnifiedInbox: true,
      hasSavedReplies: true,
      hasAutoResponders: true,
      hasAiReplySuggestions: true,
      hasVideoContent: true,
      hasCampaignAnalytics: true,
      hasAiStrategy: true,
      hasSubredditTargeting: true,
      hasExportReports: true,
      hasPrioritySupport: true,
      hasApiAccess: true,
    },
  },
} as const;

export type TierName = keyof typeof SUBSCRIPTION_TIERS;

// Create Stripe products and prices
export async function createStripeProducts() {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  const results: Record<string, { productId: string; monthlyPriceId?: string; yearlyPriceId?: string }> = {};

  for (const [tierName, tier] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (tier.priceMonthly === 0) {
      // Free tier doesn't need Stripe product
      results[tierName] = { productId: "free" };
      continue;
    }

    // Create product
    const product = await stripe.products.create({
      name: `PostPal ${tier.displayName}`,
      description: tier.description,
      metadata: { tier: tierName },
    });

    // Create monthly price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.priceMonthly,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { tier: tierName, cycle: "monthly" },
    });

    // Create yearly price
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.priceYearly,
      currency: "usd",
      recurring: { interval: "year" },
      metadata: { tier: tierName, cycle: "yearly" },
    });

    results[tierName] = {
      productId: product.id,
      monthlyPriceId: monthlyPrice.id,
      yearlyPriceId: yearlyPrice.id,
    };
  }

  return results;
}

// Create checkout session for subscription
export async function createCheckoutSession(params: {
  customerId?: string;
  customerEmail?: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: params.customerId,
    customer_email: params.customerId ? undefined : params.customerEmail,
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
    subscription_data: {
      metadata: params.metadata,
    },
  });

  return session;
}

// Create customer portal session
export async function createPortalSession(customerId: string, returnUrl: string) {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

// Get or create Stripe customer
export async function getOrCreateCustomer(params: {
  email: string;
  name?: string;
  userId: number;
}) {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email: params.email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: { userId: params.userId.toString() },
  });

  return customer;
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string, immediately = false) {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  }

  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

// Resume subscription (if canceled but not yet ended)
export async function resumeSubscription(subscriptionId: string) {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  return stripe.subscriptions.retrieve(subscriptionId);
}

// Update subscription (change plan)
export async function updateSubscription(subscriptionId: string, newPriceId: string) {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations",
  });
}

// Verify webhook signature
export function verifyWebhookSignature(payload: string | Buffer, signature: string, webhookSecret: string) {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
