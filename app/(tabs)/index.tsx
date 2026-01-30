import { ScrollView, Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

interface MetricCardProps {
  value: string;
  label: string;
  subtitle: string;
  trend?: "up" | "down";
  trendValue?: string;
}

function MetricCard({ value, label, subtitle, trend, trendValue }: MetricCardProps) {
  const colors = useColors();
  
  return (
    <View className="bg-surface rounded-2xl p-4 mr-3 border border-border" style={styles.metricCard}>
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-3xl font-bold text-primary">{value}</Text>
        {trend && (
          <View className="flex-row items-center">
            <IconSymbol 
              name={trend === "up" ? "arrow.up.right" : "arrow.down.right"} 
              size={16} 
              color={trend === "up" ? colors.success : colors.error} 
            />
            <Text 
              className="text-sm ml-1"
              style={{ color: trend === "up" ? colors.success : colors.error }}
            >
              {trendValue}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-base font-semibold text-foreground mb-1">{label}</Text>
      <Text className="text-sm text-muted">{subtitle}</Text>
    </View>
  );
}

interface QuickActionProps {
  icon: string;
  title: string;
  subtitle: string;
  badge?: number;
  onPress: () => void;
}

function QuickAction({ icon, title, subtitle, badge, onPress }: QuickActionProps) {
  const colors = useColors();
  
  return (
    <TouchableOpacity 
      className="bg-surface rounded-xl p-4 flex-row items-center border border-border mb-3"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="bg-primary/10 rounded-full p-3 mr-4">
        <IconSymbol name={icon as any} size={24} color={colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        <Text className="text-sm text-muted">{subtitle}</Text>
      </View>
      {badge !== undefined && badge > 0 && (
        <View className="bg-primary rounded-full px-2 py-1 min-w-[24px] items-center">
          <Text className="text-xs font-bold text-background">{badge}</Text>
        </View>
      )}
      <IconSymbol name="chevron.right" size={20} color={colors.muted} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
}

interface ActivityItemProps {
  type: "approved" | "scheduled" | "published";
  title: string;
  time: string;
}

function ActivityItem({ type, title, time }: ActivityItemProps) {
  const colors = useColors();
  
  const typeConfig = {
    approved: { icon: "checkmark.circle.fill", color: colors.success, label: "Approved" },
    scheduled: { icon: "clock", color: colors.warning, label: "Scheduled" },
    published: { icon: "paperplane.fill", color: colors.primary, label: "Published" },
  };
  
  const config = typeConfig[type];
  
  return (
    <View className="flex-row items-center py-3 border-b border-border">
      <View className="rounded-full p-2 mr-3" style={{ backgroundColor: `${config.color}15` }}>
        <IconSymbol name={config.icon as any} size={18} color={config.color} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>{title}</Text>
        <Text className="text-xs text-muted">{config.label}</Text>
      </View>
      <Text className="text-xs text-muted">{time}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const colors = useColors();
  
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <ScreenContainer>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-sm text-muted">{currentDate}</Text>
          <Text className="text-2xl font-bold text-foreground mt-1">Welcome back, Brad</Text>
        </View>

        {/* Metrics Section */}
        <View className="mt-4">
          <Text className="text-lg font-semibold text-foreground px-5 mb-3">Your Performance</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.metricsContainer}
          >
            <MetricCard
              value="2.3x"
              label="Follower Growth"
              subtitle="More than doubled in 30 days"
              trend="up"
              trendValue="130%"
            />
            <MetricCard
              value="87%"
              label="Audience Growth"
              subtitle="Engagement up this month"
              trend="up"
              trendValue="12%"
            />
            <MetricCard
              value="$8,123"
              label="Monthly Savings"
              subtitle="vs. traditional agencies"
              trend="up"
              trendValue="99%"
            />
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View className="mt-6 px-5">
          <Text className="text-lg font-semibold text-foreground mb-3">Quick Actions</Text>
          <QuickAction
            icon="sparkles"
            title="Create Content"
            subtitle="Generate AI-powered posts"
            onPress={() => router.push("/create-content")}
          />
          <QuickAction
            icon="checkmark.circle.fill"
            title="Review Content"
            subtitle="AI-generated posts ready for approval"
            badge={5}
            onPress={() => router.push("/(tabs)/approvals")}
          />
          <QuickAction
            icon="calendar"
            title="View Calendar"
            subtitle="See your content schedule"
            onPress={() => router.push("/(tabs)/calendar")}
          />
          <QuickAction
            icon="chart.bar.fill"
            title="View Analytics"
            subtitle="Check your performance insights"
            onPress={() => router.push("/(tabs)/analytics")}
          />
        </View>

        {/* Recent Activity */}
        <View className="mt-6 px-5 pb-8">
          <Text className="text-lg font-semibold text-foreground mb-3">Recent Activity</Text>
          <View className="bg-surface rounded-xl p-4 border border-border">
            <ActivityItem
              type="published"
              title="Instagram post: 5 Marketing Tips for 2026"
              time="2h ago"
            />
            <ActivityItem
              type="approved"
              title="Blog article: The Future of AI Marketing"
              time="4h ago"
            />
            <ActivityItem
              type="scheduled"
              title="Newsletter: Weekly Marketing Digest"
              time="6h ago"
            />
            <ActivityItem
              type="published"
              title="Twitter thread: Brand Building Strategies"
              time="1d ago"
            />
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
});
