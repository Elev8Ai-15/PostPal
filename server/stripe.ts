import Stripe from "stripe";

// Initialize Stripe with secret key from environment
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn("STRIPE_SECRET_KEY not set - Stripe features will be disabled");
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
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


// Webhook event types we handle
export type WebhookEventType =
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.payment_succeeded"
  | "invoice.payment_failed"
  | "checkout.session.completed";

// Process webhook event
export async function processWebhookEvent(event: Stripe.Event) {
  const eventType = event.type as WebhookEventType;
  
  switch (eventType) {
    case "customer.subscription.created":
      return handleSubscriptionCreated(event.data.object as Stripe.Subscription);
    
    case "customer.subscription.updated":
      return handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
    
    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
    
    case "invoice.payment_succeeded":
      return handlePaymentSucceeded(event.data.object as Stripe.Invoice);
    
    case "invoice.payment_failed":
      return handlePaymentFailed(event.data.object as Stripe.Invoice);
    
    case "checkout.session.completed":
      return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    
    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      return { handled: false, eventType: event.type };
  }
}

// Handle subscription created
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`[Stripe Webhook] Subscription created: ${subscription.id}`);
  
  const userId = subscription.metadata?.userId;
  const tierName = subscription.metadata?.tier;
  
  if (!userId || !tierName) {
    console.warn("[Stripe Webhook] Missing userId or tier in subscription metadata");
    return { handled: false, reason: "Missing metadata" };
  }
  
  // Import db functions dynamically to avoid circular dependency
  const db = await import("./db");
  const plan = await db.getPlanByName(tierName);
  
  if (!plan) {
    console.warn(`[Stripe Webhook] Plan not found: ${tierName}`);
    return { handled: false, reason: "Plan not found" };
  }
  
  // Map Stripe status to our status enum
  const statusMap: Record<string, "active" | "canceled" | "past_due" | "trialing" | "paused"> = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    trialing: "trialing",
    paused: "paused",
    incomplete: "past_due",
    incomplete_expired: "canceled",
    unpaid: "past_due",
  };
  const mappedStatus = statusMap[subscription.status] || "active";
  
  // Access subscription properties safely
  const subAny = subscription as any;
  
  // Create or update user subscription
  await db.upsertUserSubscription(parseInt(userId), {
    planId: plan.id,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer as string,
    status: mappedStatus,
    currentPeriodStart: subAny.current_period_start ? new Date(subAny.current_period_start * 1000) : new Date(),
    currentPeriodEnd: subAny.current_period_end ? new Date(subAny.current_period_end * 1000) : new Date(),
    cancelAtPeriodEnd: subAny.cancel_at_period_end || false,
  });
  
  console.log(`[Stripe Webhook] User ${userId} subscribed to ${tierName}`);
  return { handled: true, userId, tier: tierName };
}

// Handle subscription updated
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`[Stripe Webhook] Subscription updated: ${subscription.id}`);
  
  const db = await import("./db");
  
  // Find user by stripe subscription ID
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    return { handled: false, reason: "Database not available" };
  }
  
  // Get the price to determine the tier
  const priceId = subscription.items.data[0]?.price.id;
  const tierName = subscription.items.data[0]?.price.metadata?.tier || subscription.metadata?.tier;
  
  if (!tierName) {
    console.warn("[Stripe Webhook] Could not determine tier from subscription");
    return { handled: false, reason: "Could not determine tier" };
  }
  
  const plan = await db.getPlanByName(tierName);
  if (!plan) {
    return { handled: false, reason: "Plan not found" };
  }
  
  // Update subscription in database using stripe subscription ID
  const { userSubscriptions } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  // Map Stripe status to our status enum
  const statusMap: Record<string, "active" | "canceled" | "past_due" | "trialing" | "paused"> = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    trialing: "trialing",
    paused: "paused",
    incomplete: "past_due",
    incomplete_expired: "canceled",
    unpaid: "past_due",
  };
  const mappedStatus = statusMap[subscription.status] || "active";
  
  // Access subscription properties safely
  const subAny = subscription as any;
  
  await dbInstance.update(userSubscriptions)
    .set({
      planId: plan.id,
      status: mappedStatus,
      currentPeriodStart: subAny.current_period_start ? new Date(subAny.current_period_start * 1000) : new Date(),
      currentPeriodEnd: subAny.current_period_end ? new Date(subAny.current_period_end * 1000) : new Date(),
      cancelAtPeriodEnd: subAny.cancel_at_period_end || false,
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id));
  
  console.log(`[Stripe Webhook] Subscription ${subscription.id} updated to ${tierName}`);
  return { handled: true, subscriptionId: subscription.id, tier: tierName };
}

// Handle subscription deleted/cancelled
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`[Stripe Webhook] Subscription deleted: ${subscription.id}`);
  
  const db = await import("./db");
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    return { handled: false, reason: "Database not available" };
  }
  
  // Get free plan
  const freePlan = await db.getPlanByName("free");
  if (!freePlan) {
    return { handled: false, reason: "Free plan not found" };
  }
  
  // Downgrade user to free plan
  const { userSubscriptions } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  await dbInstance.update(userSubscriptions)
    .set({
      planId: freePlan.id,
      status: "canceled",
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id));
  
  console.log(`[Stripe Webhook] Subscription ${subscription.id} cancelled, user downgraded to free`);
  return { handled: true, subscriptionId: subscription.id };
}

// Handle successful payment
async function handlePaymentSucceeded(invoice: Stripe.Invoice & { subscription?: string | null; payment_intent?: string | null }) {
  console.log(`[Stripe Webhook] Payment succeeded: ${invoice.id}`);
  
  if (!invoice.subscription) {
    return { handled: false, reason: "No subscription on invoice" };
  }
  
  const db = await import("./db");
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    return { handled: false, reason: "Database not available" };
  }
  
  // Record payment in history
  const { paymentHistory, userSubscriptions } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  // Find the user subscription
  const subscriptionResult = await dbInstance.select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.stripeSubscriptionId, invoice.subscription as string));
  
  if (subscriptionResult.length > 0) {
    const userSub = subscriptionResult[0];
    
    // Record payment
    await dbInstance.insert(paymentHistory).values({
      userId: userSub.userId,
      subscriptionId: userSub.id,
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: invoice.payment_intent || null,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: "succeeded",
      description: `Payment for subscription period`,
    });
    
    // Update subscription status to active
    await dbInstance.update(userSubscriptions)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(userSubscriptions.id, userSub.id));
  }
  
  console.log(`[Stripe Webhook] Payment recorded for invoice ${invoice.id}`);
  return { handled: true, invoiceId: invoice.id };
}

// Handle failed payment
async function handlePaymentFailed(invoice: Stripe.Invoice & { subscription?: string | null; payment_intent?: string | null }) {
  console.log(`[Stripe Webhook] Payment failed: ${invoice.id}`);
  
  if (!invoice.subscription) {
    return { handled: false, reason: "No subscription on invoice" };
  }
  
  const db = await import("./db");
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    return { handled: false, reason: "Database not available" };
  }
  
  const { paymentHistory, userSubscriptions, users } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  // Find the user subscription
  const subscriptionResult = await dbInstance.select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.stripeSubscriptionId, invoice.subscription as string));
  
  if (subscriptionResult.length > 0) {
    const userSub = subscriptionResult[0];
    
    // Record failed payment (use amount_paid=0 for failed, amount_due for context)
    await dbInstance.insert(paymentHistory).values({
      userId: userSub.userId,
      subscriptionId: userSub.id,
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: invoice.payment_intent as string || null,
      amount: invoice.amount_paid ?? 0,
      currency: invoice.currency,
      status: "failed",
      description: `Failed payment of $${(invoice.amount_due / 100).toFixed(2)}`,
    });
    
    // Update subscription status to past_due
    await dbInstance.update(userSubscriptions)
      .set({ status: "past_due", updatedAt: new Date() })
      .where(eq(userSubscriptions.id, userSub.id));
    
    // Send notification to user
    const userResult = await dbInstance.select()
      .from(users)
      .where(eq(users.id, userSub.userId));
    
    if (userResult.length > 0 && userResult[0].email) {
      // Import notification service
      // Log payment failure for notification
      console.log(`[Stripe Webhook] Payment failed for user ${userSub.userId}: $${(invoice.amount_due / 100).toFixed(2)}`);
    }
  }
  
  console.log(`[Stripe Webhook] Payment failure recorded for invoice ${invoice.id}`);
  return { handled: true, invoiceId: invoice.id };
}

// Handle checkout session completed
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`[Stripe Webhook] Checkout completed: ${session.id}`);
  
  // The subscription.created event will handle the actual subscription setup
  // This is mainly for tracking/analytics
  
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier;
  
  console.log(`[Stripe Webhook] User ${userId} completed checkout for ${tier}`);
  return { handled: true, sessionId: session.id, userId, tier };
}
