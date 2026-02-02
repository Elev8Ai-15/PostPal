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
  maxPlatforms: 1,
  maxPostsPerWeek: 2,
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

export function useSubscription() {
  const { isAuthenticated } = useAuth();
  
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

  const tier: SubscriptionTier = (plan?.name as SubscriptionTier) || "free";
  
  const limits: SubscriptionLimits = plan ? {
    maxPlatforms: plan.maxPlatforms,
    maxPostsPerWeek: plan.maxPostsPerWeek,
    maxTeamMembers: plan.maxTeamMembers,
    analyticsRetentionDays: plan.analyticsRetentionDays,
  } : FREE_LIMITS;

  const features: SubscriptionFeatures = plan ? {
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
  } : FREE_FEATURES;

  const isPaid = tier !== "free";
  const isUnlimited = limits.maxPostsPerWeek === -1;
  
  const postsRemaining = canPostData?.limit && canPostData?.used !== undefined
    ? canPostData.limit - canPostData.used
    : limits.maxPostsPerWeek;

  const canPost = canPostData?.canPost ?? true;
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
