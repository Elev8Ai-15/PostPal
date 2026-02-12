import { trpc } from "@/lib/trpc";
import { useAuth } from "./use-auth";

export type SubscriptionTier = "free" | "basic" | "pro" | "vibe";

export interface SubscriptionLimits {
  maxPlatforms: number;
  maxPostsPerWeek: number;
  maxTeamMembers: number;
  analyticsRetentionDays: number;
}

export interface SubscriptionFeatures {
  hasRecurringTemplates: boolean;
  hasUnifiedInbox: boolean;
  hasSavedReplies: boolean;
  hasAutoResponders: boolean;
  hasAiReplySuggestions: boolean;
  hasVideoContent: boolean;
  hasCampaignAnalytics: boolean;
  hasAiStrategy: boolean;
  hasSubredditTargeting: boolean;
  hasExportReports: boolean;
  hasPrioritySupport: boolean;
  hasApiAccess: boolean;
}

// Default free tier limits
const FREE_LIMITS: SubscriptionLimits = {
  maxPlatforms: 7,
  maxPostsPerWeek: 10,
  maxTeamMembers: 1,
  analyticsRetentionDays: 7,
};

const FREE_FEATURES: SubscriptionFeatures = {
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
};

// Owner emails get lifetime unlimited access on client side too
const OWNER_EMAILS = ["bradgpowell1123@gmail.com"];

export function useSubscription() {
  const { isAuthenticated, user } = useAuth();
  
  const { data: subscriptionData, isLoading, refetch } = trpc.subscription.current.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: canPostData } = trpc.subscription.canPost.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const plan = subscriptionData?.plan;
  const subscription = subscriptionData?.subscription;

  // Owner override: if logged in as owner email, force Vibe tier
  const isOwner = user?.email ? OWNER_EMAILS.includes(user.email.toLowerCase()) : false;

  const tier: SubscriptionTier = isOwner ? "vibe" : ((plan?.name as SubscriptionTier) || "free");
  
  const OWNER_LIMITS: SubscriptionLimits = {
    maxPlatforms: 7,
    maxPostsPerWeek: -1,
    maxTeamMembers: 10,
    analyticsRetentionDays: -1,
  };

  const OWNER_FEATURES: SubscriptionFeatures = {
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
  };

  const limits: SubscriptionLimits = isOwner ? OWNER_LIMITS : (plan ? {
    maxPlatforms: plan.maxPlatforms,
    maxPostsPerWeek: plan.maxPostsPerWeek,
    maxTeamMembers: plan.maxTeamMembers,
    analyticsRetentionDays: plan.analyticsRetentionDays,
  } : FREE_LIMITS);

  const features: SubscriptionFeatures = isOwner ? OWNER_FEATURES : (plan ? {
    hasRecurringTemplates: plan.hasRecurringTemplates,
    hasUnifiedInbox: plan.hasUnifiedInbox,
    hasSavedReplies: plan.hasSavedReplies,
    hasAutoResponders: plan.hasAutoResponders,
    hasAiReplySuggestions: plan.hasAiReplySuggestions,
    hasVideoContent: plan.hasVideoContent,
    hasCampaignAnalytics: plan.hasCampaignAnalytics,
    hasAiStrategy: plan.hasAiStrategy,
    hasSubredditTargeting: plan.hasSubredditTargeting,
    hasExportReports: plan.hasExportReports,
    hasPrioritySupport: plan.hasPrioritySupport,
    hasApiAccess: plan.hasApiAccess,
  } : FREE_FEATURES);

  const isPaid = isOwner || tier !== "free";
  const isUnlimited = isOwner || limits.maxPostsPerWeek === -1;
  
  const postsRemaining = canPostData?.limit && canPostData?.used !== undefined
    ? canPostData.limit - canPostData.used
    : limits.maxPostsPerWeek;

  const canPost = isOwner || (canPostData?.canPost ?? true);
  const postLimitReason = canPostData?.reason;

  // Check if user can use a specific number of platforms
  const canUsePlatforms = (count: number) => {
    return count <= limits.maxPlatforms;
  };

  // Check if user has a specific feature
  const hasFeature = (feature: keyof SubscriptionFeatures) => {
    return features[feature];
  };

  // Get upgrade message for a feature
  const getUpgradeMessage = (feature: keyof SubscriptionFeatures) => {
    const featureNames: Record<keyof SubscriptionFeatures, string> = {
      hasRecurringTemplates: "Recurring Templates",
      hasUnifiedInbox: "Unified Inbox",
      hasSavedReplies: "Saved Replies",
      hasAutoResponders: "Auto-Responders",
      hasAiReplySuggestions: "AI Reply Suggestions",
      hasVideoContent: "Video Content",
      hasCampaignAnalytics: "Campaign Analytics",
      hasAiStrategy: "AI Strategy",
      hasSubredditTargeting: "Subreddit Targeting",
      hasExportReports: "Export Reports",
      hasPrioritySupport: "Priority Support",
      hasApiAccess: "API Access",
    };

    const requiredTier = getRequiredTier(feature);
    return `${featureNames[feature]} requires ${requiredTier} plan or higher. Upgrade to unlock!`;
  };

  // Get the minimum tier required for a feature
  const getRequiredTier = (feature: keyof SubscriptionFeatures): SubscriptionTier => {
    const basicFeatures: (keyof SubscriptionFeatures)[] = [
      "hasRecurringTemplates",
      "hasUnifiedInbox",
      "hasSavedReplies",
    ];
    
    const proFeatures: (keyof SubscriptionFeatures)[] = [
      "hasAutoResponders",
      "hasAiReplySuggestions",
      "hasVideoContent",
      "hasCampaignAnalytics",
      "hasAiStrategy",
      "hasSubredditTargeting",
    ];

    if (basicFeatures.includes(feature)) return "basic";
    if (proFeatures.includes(feature)) return "pro";
    return "vibe";
  };

  return {
    // Current state
    tier,
    plan,
    subscription,
    limits,
    features,
    isLoading,
    
    // Computed values
    isPaid,
    isUnlimited,
    postsRemaining,
    canPost,
    postLimitReason,
    
    // Helper functions
    canUsePlatforms,
    hasFeature,
    getUpgradeMessage,
    getRequiredTier,
    
    // Actions
    refetch,
  };
}

// Feature gate component helper
export function useFeatureGate(feature: keyof SubscriptionFeatures) {
  const { hasFeature, getUpgradeMessage, getRequiredTier } = useSubscription();
  
  const isEnabled = hasFeature(feature);
  const upgradeMessage = getUpgradeMessage(feature);
  const requiredTier = getRequiredTier(feature);
  
  return {
    isEnabled,
    upgradeMessage,
    requiredTier,
  };
}
