import { ScrollView, Text, View, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import {
  getPostStats,
  getActivityLog,
  getPendingDrafts,
  hasAnyData,
  getRelativeTime,
  type PostStats,
  type ActivityEntry,
} from "@/lib/content-store";

interface MetricCardProps {
  value: string;
  label: string;
  subtitle: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

function MetricCard({ value, label, subtitle, trend, trendValue }: MetricCardProps) {
  const colors = useColors();
  
  return (
    <View className="bg-surface rounded-2xl p-4 mr-3 border border-border" style={styles.metricCard}>
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-3xl font-bold text-primary">{value}</Text>
        {trend && trend !== "neutral" && (
          <View className="flex-row items-center">
            <IconSymbol 
              name={trend === "up" ? "arrow.up.right" : "arrow.down.right"} 
              size={16} 
              color={trend === "up" ? colors.success : colors.error} 
            />
            {trendValue && (
              <Text 
                className="text-sm ml-1"
                style={{ color: trend === "up" ? colors.success : colors.error }}
              >
                {trendValue}
              </Text>
            )}
          </View>
        )}
      </View>
      <Text className="text-base font-semibold text-foreground mb-1">{label}</Text>
      <Text className="text-sm text-muted">{subtitle}</Text>
    </View>
  );
}

interface ActivityItemProps {
  type: "created" | "approved" | "scheduled" | "published" | "rejected" | "quick_posted";
  title: string;
  time: string;
  platform?: string;
}

function ActivityItem({ type, title, time, platform }: ActivityItemProps) {
  const colors = useColors();
  
  const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
    created: { icon: "sparkles", color: colors.primary, label: "Created" },
    approved: { icon: "checkmark.circle.fill", color: colors.success, label: "Approved" },
    scheduled: { icon: "clock", color: colors.warning, label: "Scheduled" },
    published: { icon: "paperplane.fill", color: colors.primary, label: "Published" },
    rejected: { icon: "xmark.circle", color: colors.error, label: "Rejected" },
    quick_posted: { icon: "paperplane.fill", color: colors.success, label: "Quick Posted" },
  };
  
  const config = typeConfig[type] || typeConfig.created;
  
  return (
    <View className="flex-row items-center py-3 border-b border-border">
      <View className="rounded-full p-2 mr-3" style={{ backgroundColor: `${config.color}15` }}>
        <IconSymbol name={config.icon as any} size={18} color={config.color} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>{title}</Text>
        <View className="flex-row items-center">
          <Text className="text-xs text-muted">{config.label}</Text>
          {platform && <Text className="text-xs text-muted"> · {platform}</Text>}
        </View>
      </View>
      <Text className="text-xs text-muted">{time}</Text>
    </View>
  );
}

function EmptyStateCard() {
  const colors = useColors();
  const router = useRouter();
  
  return (
    <View className="bg-surface rounded-2xl p-6 border border-border items-center">
      <View className="bg-primary/10 rounded-full p-4 mb-4">
        <IconSymbol name="sparkles" size={40} color={colors.primary} />
      </View>
      <Text className="text-lg font-semibold text-foreground text-center">Welcome to PostPal!</Text>
      <Text className="text-sm text-muted text-center mt-2 mb-4">
        Create AI-powered content in 4 simple steps: pick a topic, review content, set a schedule, and post.
      </Text>
      <TouchableOpacity
        className="bg-primary px-6 py-3 rounded-full"
        onPress={() => router.push("/create-content")}
        activeOpacity={0.7}
      >
        <Text className="text-background font-semibold">Create Your First Post</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const [stats, setStats] = useState<PostStats | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const userName = user?.name?.split(" ")[0] || "there";

  const loadData = useCallback(async () => {
    try {
      const [postStats, activityLog, pendingDrafts] = await Promise.all([
        getPostStats(),
        getActivityLog(10),
        getPendingDrafts(),
      ]);
      setStats(postStats);
      setActivity(activityLog);
      setPendingCount(pendingDrafts.length);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const showData = stats && hasAnyData(stats);

  // Compute top platform
  const topPlatform = stats?.platformCounts
    ? Object.entries(stats.platformCounts).sort((a, b) => b[1] - a[1])[0]
    : null;

  return (
    <ScreenContainer>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header with Logo */}
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center justify-between mb-2">
            <Image
              source={require("@/assets/images/logo-header.png")}
              style={{ width: 120, height: 40 }}
              contentFit="contain"
            />
          </View>
          <Text className="text-sm text-muted">{currentDate}</Text>
          <Text className="text-2xl font-bold text-foreground mt-1">Welcome back, {userName}</Text>
        </View>

        {/* Primary CTA - Create Content */}
        <View className="px-5 mt-4">
          <TouchableOpacity
            className="bg-primary rounded-2xl p-5 flex-row items-center"
            onPress={() => router.push("/create-content")}
            activeOpacity={0.8}
            style={styles.createButton}
          >
            <View className="bg-background/20 rounded-full p-3 mr-4">
              <IconSymbol name="sparkles" size={28} color={colors.background} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-background">Create New Post</Text>
              <Text className="text-sm text-background/80 mt-0.5">
                Topic → Content → Schedule → Post
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={24} color={colors.background} />
          </TouchableOpacity>
        </View>

        {/* Metrics Section */}
        <View className="mt-6">
          <Text className="text-lg font-semibold text-foreground px-5 mb-3">Your Activity</Text>
          {showData ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.metricsContainer}
            >
              <MetricCard
                value={String(stats.totalCreated)}
                label="Content Created"
                subtitle={`${stats.weeklyCreated} this week`}
                trend={stats.weeklyCreated > 0 ? "up" : "neutral"}
                trendValue={stats.weeklyCreated > 0 ? `+${stats.weeklyCreated}` : undefined}
              />
              <MetricCard
                value={String(stats.totalQuickPosted)}
                label="Quick Posts"
                subtitle="Shared to platforms"
                trend={stats.totalQuickPosted > 0 ? "up" : "neutral"}
              />
              <MetricCard
                value={String(stats.totalApproved)}
                label="Approved"
                subtitle="Content approved for posting"
                trend={stats.totalApproved > 0 ? "up" : "neutral"}
              />
              {topPlatform && (
                <MetricCard
                  value={String(topPlatform[1])}
                  label={`Top: ${topPlatform[0].charAt(0).toUpperCase() + topPlatform[0].slice(1)}`}
                  subtitle="Most used platform"
                  trend="up"
                />
              )}
            </ScrollView>
          ) : (
            <View className="px-5">
              <EmptyStateCard />
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="mt-6 px-5">
          <Text className="text-lg font-semibold text-foreground mb-3">Quick Actions</Text>
          
          <TouchableOpacity 
            className="bg-surface rounded-xl p-4 flex-row items-center border border-border mb-3"
            onPress={() => router.push("/(tabs)/approvals")}
            activeOpacity={0.7}
          >
            <View className="bg-primary/10 rounded-full p-3 mr-4">
              <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">Review Content</Text>
              <Text className="text-sm text-muted">
                {pendingCount > 0 ? `${pendingCount} post${pendingCount > 1 ? "s" : ""} ready for review` : "No pending reviews"}
              </Text>
            </View>
            {pendingCount > 0 && (
              <View className="bg-primary rounded-full px-2 py-1 min-w-[24px] items-center mr-2">
                <Text className="text-xs font-bold text-background">{pendingCount}</Text>
              </View>
            )}
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity 
            className="bg-surface rounded-xl p-4 flex-row items-center border border-border mb-3"
            onPress={() => router.push("/(tabs)/calendar")}
            activeOpacity={0.7}
          >
            <View className="bg-primary/10 rounded-full p-3 mr-4">
              <IconSymbol name="calendar" size={24} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">View Calendar</Text>
              <Text className="text-sm text-muted">See your content schedule</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity 
            className="bg-surface rounded-xl p-4 flex-row items-center border border-border mb-3"
            onPress={() => router.push("/(tabs)/analytics")}
            activeOpacity={0.7}
          >
            <View className="bg-primary/10 rounded-full p-3 mr-4">
              <IconSymbol name="chart.bar.fill" size={24} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">View Analytics</Text>
              <Text className="text-sm text-muted">Check your performance insights</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View className="mt-6 px-5 pb-8">
          <Text className="text-lg font-semibold text-foreground mb-3">Recent Activity</Text>
          <View className="bg-surface rounded-xl p-4 border border-border">
            {activity.length > 0 ? (
              activity.map((entry) => (
                <ActivityItem
                  key={entry.id}
                  type={entry.type}
                  title={entry.title}
                  time={getRelativeTime(entry.timestamp)}
                  platform={entry.platform}
                />
              ))
            ) : (
              <View className="py-6 items-center">
                <IconSymbol name="clock" size={32} color={colors.muted} />
                <Text className="text-sm text-muted mt-2 text-center">
                  No activity yet. Create your first content to get started!
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  metricsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  metricCard: {
    width: 200,
  },
  createButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
});
