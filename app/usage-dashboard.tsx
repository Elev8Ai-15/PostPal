import { useEffect, useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSubscription } from "@/hooks/use-subscription";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

interface UsageMetric {
  label: string;
  current: number;
  limit: number | "unlimited";
  icon: string;
  color: string;
}

export default function UsageDashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { tier, limits, isLoading: subLoading } = useSubscription();
  const [usageData, setUsageData] = useState<{
    postsThisWeek: number;
    platformsUsed: number;
    templatesCreated: number;
    campaignsActive: number;
  }>({
    postsThisWeek: 0,
    platformsUsed: 0,
    templatesCreated: 0,
    campaignsActive: 0,
  });

  // Fetch usage data
  const postsQuery = trpc.posts.list.useQuery();
  const templatesQuery = trpc.templates.list.useQuery();
  const campaignsQuery = trpc.campaigns.list.useQuery();

  useEffect(() => {
    if (postsQuery.data) {
      // Calculate posts this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const postsThisWeek = postsQuery.data.filter(
        (post: any) => new Date(post.createdAt) >= oneWeekAgo
      ).length;

      // Calculate unique platforms used
      const platforms = new Set(postsQuery.data.map((post: any) => post.platform));

      setUsageData(prev => ({
        ...prev,
        postsThisWeek,
        platformsUsed: platforms.size,
      }));
    }
  }, [postsQuery.data]);

  useEffect(() => {
    if (templatesQuery.data) {
      setUsageData(prev => ({
        ...prev,
        templatesCreated: templatesQuery.data.length,
      }));
    }
  }, [templatesQuery.data]);

  useEffect(() => {
    if (campaignsQuery.data) {
      const activeCampaigns = campaignsQuery.data.filter(
        (c: any) => c.status === "active"
      ).length;
      setUsageData(prev => ({
        ...prev,
        campaignsActive: activeCampaigns,
      }));
    }
  }, [campaignsQuery.data]);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleUpgrade = () => {
    triggerHaptic();
    router.push("/subscription");
  };

  const getUsageMetrics = (): UsageMetric[] => [
    {
      label: "Posts This Week",
      current: usageData.postsThisWeek,
      limit: limits.maxPostsPerWeek === -1 ? "unlimited" : limits.maxPostsPerWeek,
      icon: "paperplane.fill",
      color: "#3B82F6",
    },
    {
      label: "Platforms Used",
      current: usageData.platformsUsed,
      limit: limits.maxPlatforms,
      icon: "square.grid.2x2.fill",
      color: "#8B5CF6",
    },
    {
      label: "Templates Created",
      current: usageData.templatesCreated,
      limit: tier === "free" ? 5 : tier === "basic" ? 20 : "unlimited",
      icon: "doc.text.fill",
      color: "#10B981",
    },
    {
      label: "Active Campaigns",
      current: usageData.campaignsActive,
      limit: tier === "free" ? 1 : tier === "basic" ? 5 : "unlimited",
      icon: "flag.fill",
      color: "#F97316",
    },
  ];

  const getUsagePercentage = (current: number, limit: number | "unlimited"): number => {
    if (limit === "unlimited") return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return "#EF4444";
    if (percentage >= 70) return "#F59E0B";
    return "#10B981";
  };

  const getTierColor = (): string => {
    switch (tier) {
      case "vibe": return "#F97316";
      case "pro": return "#8B5CF6";
      case "basic": return "#3B82F6";
      default: return "#6B7280";
    }
  };

  const isLoading = subLoading || postsQuery.isLoading;

  if (isLoading) {
    return (
      <ScreenContainer className="p-6">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Loading usage data...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const metrics = getUsageMetrics();

  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Usage Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Current Plan Card */}
        <View style={[styles.planCard, { backgroundColor: getTierColor() + "15", borderColor: getTierColor() }]}>
          <View style={styles.planHeader}>
            <View>
              <Text style={[styles.planLabel, { color: colors.muted }]}>Current Plan</Text>
              <Text style={[styles.planName, { color: getTierColor() }]}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </Text>
            </View>
            {tier !== "vibe" && (
              <TouchableOpacity
                style={[styles.upgradeButton, { backgroundColor: getTierColor() }]}
                onPress={handleUpgrade}
                activeOpacity={0.8}
              >
                <Text style={styles.upgradeButtonText}>Upgrade</Text>
                <IconSymbol name="chevron.right" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.planFeatures}>
            <View style={styles.planFeature}>
              <IconSymbol name="checkmark.circle.fill" size={16} color={getTierColor()} />
              <Text style={[styles.planFeatureText, { color: colors.foreground }]}>
                {limits.maxPlatforms} platform{limits.maxPlatforms !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={styles.planFeature}>
              <IconSymbol name="checkmark.circle.fill" size={16} color={getTierColor()} />
              <Text style={[styles.planFeatureText, { color: colors.foreground }]}>
                {limits.maxPostsPerWeek === -1 ? "Unlimited" : limits.maxPostsPerWeek} posts/week
              </Text>
            </View>
            <View style={styles.planFeature}>
              <IconSymbol name="checkmark.circle.fill" size={16} color={getTierColor()} />
              <Text style={[styles.planFeatureText, { color: colors.foreground }]}>
                {limits.analyticsRetentionDays === -1 ? "Full" : limits.analyticsRetentionDays + " day"} analytics
              </Text>
            </View>
          </View>
        </View>

        {/* Usage Metrics */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          This Week's Usage
        </Text>

        {metrics.map((metric, index) => {
          const percentage = getUsagePercentage(metric.current, metric.limit);
          const usageColor = metric.limit === "unlimited" ? metric.color : getUsageColor(percentage);
          
          return (
            <View 
              key={index} 
              style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.metricHeader}>
                <View style={[styles.metricIconContainer, { backgroundColor: metric.color + "20" }]}>
                  <IconSymbol name={metric.icon as any} size={20} color={metric.color} />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={[styles.metricLabel, { color: colors.muted }]}>{metric.label}</Text>
                  <View style={styles.metricValueContainer}>
                    <Text style={[styles.metricValue, { color: colors.foreground }]}>
                      {metric.current}
                    </Text>
                    <Text style={[styles.metricLimit, { color: colors.muted }]}>
                      {" / "}
                      {metric.limit === "unlimited" ? "∞" : metric.limit}
                    </Text>
                  </View>
                </View>
                {metric.limit !== "unlimited" && percentage >= 80 && (
                  <View style={[styles.warningBadge, { backgroundColor: usageColor + "20" }]}>
                    <Text style={[styles.warningText, { color: usageColor }]}>
                      {percentage >= 100 ? "Limit reached" : "Almost full"}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Progress Bar */}
              <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      backgroundColor: usageColor,
                      width: metric.limit === "unlimited" ? "5%" : `${percentage}%`,
                    }
                  ]} 
                />
              </View>
            </View>
          );
        })}

        {/* Tips Section */}
        {tier !== "vibe" && (
          <View style={[styles.tipsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.tipsHeader}>
              <IconSymbol name="lightbulb.fill" size={20} color="#F59E0B" />
              <Text style={[styles.tipsTitle, { color: colors.foreground }]}>
                Upgrade Tips
              </Text>
            </View>
            <Text style={[styles.tipsText, { color: colors.muted }]}>
              {tier === "free" && "Upgrade to Basic for 3 platforms and 15 posts per week."}
              {tier === "basic" && "Upgrade to Pro for all platforms, video content, and campaign analytics."}
              {tier === "pro" && "Upgrade to Vibe for unlimited posts, team collaboration, and priority support."}
            </Text>
            <TouchableOpacity
              style={[styles.tipsCta, { backgroundColor: colors.primary }]}
              onPress={handleUpgrade}
              activeOpacity={0.8}
            >
              <Text style={styles.tipsCtaText}>View Plans</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Billing Info */}
        <View style={[styles.billingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.billingTitle, { color: colors.foreground }]}>
            Billing Period
          </Text>
          <Text style={[styles.billingText, { color: colors.muted }]}>
            Your usage resets every week on Monday at 12:00 AM
          </Text>
          <View style={styles.billingDates}>
            <View style={styles.billingDate}>
              <Text style={[styles.billingDateLabel, { color: colors.muted }]}>Week Started</Text>
              <Text style={[styles.billingDateValue, { color: colors.foreground }]}>
                {new Date(Date.now() - (new Date().getDay() * 24 * 60 * 60 * 1000)).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.billingDate}>
              <Text style={[styles.billingDateLabel, { color: colors.muted }]}>Resets On</Text>
              <Text style={[styles.billingDateValue, { color: colors.foreground }]}>
                {new Date(Date.now() + ((7 - new Date().getDay()) * 24 * 60 * 60 * 1000)).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  planLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  planName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  planFeatures: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  planFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  planFeatureText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  metricCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  metricInfo: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  metricValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  metricLimit: {
    fontSize: 14,
  },
  warningBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  warningText: {
    fontSize: 11,
    fontWeight: "600",
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  tipsCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  tipsText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  tipsCta: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  tipsCtaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  billingCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  billingTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  billingText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  billingDates: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  billingDate: {
    flex: 1,
  },
  billingDateLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  billingDateValue: {
    fontSize: 14,
    fontWeight: "600",
  },
});
