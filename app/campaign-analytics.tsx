import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

interface PlatformBreakdown {
  platform: string;
  impressions: number;
  engagement: number;
  clicks: number;
  count: number;
  engagementRate: number;
}

const platformColors: Record<string, string> = {
  instagram: "#E4405F",
  twitter: "#1DA1F2",
  linkedin: "#0A66C2",
  facebook: "#1877F2",
  youtube: "#FF0000",
  tiktok: "#000000",
  reddit: "#FF4500",
};

const platformNames: Record<string, string> = {
  instagram: "Instagram",
  twitter: "Twitter/X",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  reddit: "Reddit",
};

export default function CampaignAnalyticsScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ campaignId: string; campaignName: string }>();
  const campaignId = parseInt(params.campaignId || "0");
  const campaignName = params.campaignName || "Campaign";

  const { data: analytics, isLoading } = trpc.campaigns.getAnalytics.useQuery(
    { campaignId },
    { enabled: campaignId > 0 }
  );

  const { data: campaign } = trpc.campaigns.getById.useQuery(
    { id: campaignId },
    { enabled: campaignId > 0 }
  );

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const renderPlatformCard = ({ item }: { item: PlatformBreakdown }) => (
    <View
      className="bg-surface rounded-xl p-4 mb-3 border border-border"
      style={{ borderLeftWidth: 4, borderLeftColor: platformColors[item.platform] || colors.primary }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: platformColors[item.platform] || colors.primary }}
          >
            <IconSymbol name="paperplane.fill" size={16} color="#FFFFFF" />
          </View>
          <Text className="text-lg font-semibold text-foreground">
            {platformNames[item.platform] || item.platform}
          </Text>
        </View>
        {analytics?.bestPlatform === item.platform && (
          <View className="bg-success/20 px-2 py-1 rounded-full">
            <Text className="text-xs font-medium text-success">Best Performer</Text>
          </View>
        )}
      </View>

      <View className="flex-row justify-between">
        <View className="items-center flex-1">
          <Text className="text-xl font-bold text-foreground">{formatNumber(item.impressions)}</Text>
          <Text className="text-xs text-muted">Impressions</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-xl font-bold text-foreground">{formatNumber(item.engagement)}</Text>
          <Text className="text-xs text-muted">Engagement</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-xl font-bold text-foreground">{formatNumber(item.clicks)}</Text>
          <Text className="text-xs text-muted">Clicks</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-xl font-bold text-primary">{item.engagementRate.toFixed(1)}%</Text>
          <Text className="text-xs text-muted">Eng. Rate</Text>
        </View>
      </View>

      <View className="mt-3 pt-3 border-t border-border">
        <Text className="text-xs text-muted">{item.count} post{item.count !== 1 ? "s" : ""} in this campaign</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-muted">Loading analytics...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3"
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-bold text-foreground">{campaignName}</Text>
          <Text className="text-sm text-muted">Campaign Analytics</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        {/* Campaign Status */}
        {campaign && (
          <View className="bg-surface rounded-xl p-4 mb-4 border border-border">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted">Status</Text>
              <View
                className="px-3 py-1 rounded-full"
                style={{
                  backgroundColor:
                    campaign.status === "active"
                      ? colors.success + "20"
                      : campaign.status === "completed"
                      ? colors.primary + "20"
                      : colors.muted + "20",
                }}
              >
                <Text
                  className="text-sm font-medium capitalize"
                  style={{
                    color:
                      campaign.status === "active"
                        ? colors.success
                        : campaign.status === "completed"
                        ? colors.primary
                        : colors.muted,
                  }}
                >
                  {campaign.status}
                </Text>
              </View>
            </View>
            {campaign.description && (
              <Text className="text-sm text-muted mt-2">{campaign.description}</Text>
            )}
          </View>
        )}

        {/* Overall Metrics */}
        <View className="bg-primary/10 rounded-xl p-4 mb-4">
          <Text className="text-lg font-semibold text-foreground mb-3">Overall Performance</Text>
          <View className="flex-row justify-between">
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-primary">
                {formatNumber(analytics?.totalImpressions || 0)}
              </Text>
              <Text className="text-xs text-muted">Total Impressions</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-primary">
                {formatNumber(analytics?.totalEngagement || 0)}
              </Text>
              <Text className="text-xs text-muted">Total Engagement</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-primary">
                {formatNumber(analytics?.totalClicks || 0)}
              </Text>
              <Text className="text-xs text-muted">Total Clicks</Text>
            </View>
          </View>
        </View>

        {/* Best Platform Highlight */}
        {analytics?.bestPlatform && (
          <View className="bg-success/10 rounded-xl p-4 mb-4 flex-row items-center">
            <View
              className="w-12 h-12 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: platformColors[analytics.bestPlatform] || colors.primary }}
            >
              <IconSymbol name="paperplane.fill" size={24} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-muted">Best Performing Platform</Text>
              <Text className="text-lg font-bold text-foreground">
                {platformNames[analytics.bestPlatform] || analytics.bestPlatform}
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.success} />
          </View>
        )}

        {/* Platform Breakdown */}
        <Text className="text-lg font-semibold text-foreground mb-3">Platform Breakdown</Text>
        
        {analytics?.platformBreakdown && analytics.platformBreakdown.length > 0 ? (
          <FlatList
            data={analytics.platformBreakdown}
            renderItem={renderPlatformCard}
            keyExtractor={(item) => item.platform}
            scrollEnabled={false}
          />
        ) : (
          <View className="bg-surface rounded-xl p-6 items-center border border-border">
            <IconSymbol name="chart.bar" size={48} color={colors.muted} />
            <Text className="text-lg font-medium text-foreground mt-3">No Data Yet</Text>
            <Text className="text-sm text-muted text-center mt-1">
              Add posts to this campaign to see platform-specific analytics
            </Text>
          </View>
        )}

        {/* Tips Section */}
        <View className="bg-surface rounded-xl p-4 mt-4 mb-6 border border-border">
          <Text className="text-sm font-semibold text-foreground mb-2">Campaign Tips</Text>
          <Text className="text-sm text-muted leading-5">
            • Focus more content on your best-performing platform{"\n"}
            • Experiment with different content types on underperforming platforms{"\n"}
            • Track engagement rates rather than just raw numbers{"\n"}
            • Consider posting times and frequency for each platform
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
