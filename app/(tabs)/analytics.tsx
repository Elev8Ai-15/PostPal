import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type TimePeriod = "7d" | "30d" | "90d";

interface MetricData {
  label: string;
  value: string;
  change: number;
  trend: "up" | "down";
}

interface TopContent {
  id: string;
  title: string;
  platform: string;
  engagement: string;
  impressions: string;
}

interface InsightCard {
  id: string;
  title: string;
  value: string;
  description: string;
  icon: string;
}

const metricsData: Record<TimePeriod, MetricData[]> = {
  "7d": [
    { label: "Followers", value: "12,847", change: 3.2, trend: "up" },
    { label: "Engagement", value: "8.4%", change: 1.1, trend: "up" },
    { label: "Impressions", value: "89.2K", change: 12.5, trend: "up" },
    { label: "Clicks", value: "2,341", change: -2.3, trend: "down" },
  ],
  "30d": [
    { label: "Followers", value: "12,847", change: 15.8, trend: "up" },
    { label: "Engagement", value: "7.9%", change: 4.2, trend: "up" },
    { label: "Impressions", value: "342K", change: 28.3, trend: "up" },
    { label: "Clicks", value: "8,923", change: 18.7, trend: "up" },
  ],
  "90d": [
    { label: "Followers", value: "12,847", change: 87.4, trend: "up" },
    { label: "Engagement", value: "7.2%", change: 12.8, trend: "up" },
    { label: "Impressions", value: "1.2M", change: 156.2, trend: "up" },
    { label: "Clicks", value: "28,456", change: 94.3, trend: "up" },
  ],
};

const topContent: TopContent[] = [
  { id: "1", title: "5 Marketing Tips That Actually Work", platform: "Instagram", engagement: "12.3%", impressions: "45.2K" },
  { id: "2", title: "The Future of AI in Business", platform: "LinkedIn", engagement: "9.8%", impressions: "32.1K" },
  { id: "3", title: "Behind the Scenes: Our Process", platform: "YouTube", engagement: "8.2%", impressions: "28.7K" },
  { id: "4", title: "Weekly Newsletter Highlights", platform: "Email", engagement: "42.1%", impressions: "15.3K" },
];

const insights: InsightCard[] = [
  { id: "1", title: "Best Posting Time", value: "10:00 AM - 12:00 PM", description: "Your audience is most active during late morning hours", icon: "clock" },
  { id: "2", title: "Top Hashtags", value: "#marketing #ai #growth", description: "These hashtags drive the most engagement", icon: "star.fill" },
  { id: "3", title: "Audience Location", value: "United States (68%)", description: "Most of your followers are based in the US", icon: "person.fill" },
];

// Simple bar chart component
function SimpleChart({ period }: { period: TimePeriod }) {
  const colors = useColors();
  
  const chartData: Record<TimePeriod, number[]> = {
    "7d": [65, 72, 58, 80, 75, 88, 92],
    "30d": [45, 52, 48, 55, 62, 58, 65, 70, 68, 75, 72, 78, 82, 85, 80, 88, 85, 90, 88, 92, 95, 90, 93, 96, 94, 98, 95, 100, 97, 102],
    "90d": [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
  };
  
  const data = chartData[period];
  const maxValue = Math.max(...data);
  const displayData = period === "30d" ? data.filter((_, i) => i % 3 === 0) : period === "90d" ? data : data;
  
  return (
    <View className="bg-surface rounded-2xl p-4 border border-border">
      <Text className="text-base font-semibold text-foreground mb-4">Follower Growth</Text>
      <View style={styles.chartContainer}>
        {displayData.map((value, index) => (
          <View key={index} style={styles.barWrapper}>
            <View 
              style={[
                styles.bar, 
                { 
                  height: `${(value / maxValue) * 100}%`,
                  backgroundColor: colors.primary,
                }
              ]} 
            />
          </View>
        ))}
      </View>
      <View className="flex-row justify-between mt-2">
        <Text className="text-xs text-muted">
          {period === "7d" ? "7 days ago" : period === "30d" ? "30 days ago" : "90 days ago"}
        </Text>
        <Text className="text-xs text-muted">Today</Text>
      </View>
    </View>
  );
}

function MetricCard({ metric }: { metric: MetricData }) {
  const colors = useColors();
  
  return (
    <View className="bg-surface rounded-xl p-3 border border-border" style={styles.metricCard}>
      <Text className="text-xs text-muted mb-1">{metric.label}</Text>
      <Text className="text-xl font-bold text-foreground">{metric.value}</Text>
      <View className="flex-row items-center mt-1">
        <IconSymbol 
          name={metric.trend === "up" ? "arrow.up.right" : "arrow.down.right"} 
          size={12} 
          color={metric.trend === "up" ? colors.success : colors.error} 
        />
        <Text 
          className="text-xs ml-0.5"
          style={{ color: metric.trend === "up" ? colors.success : colors.error }}
        >
          {metric.change > 0 ? "+" : ""}{metric.change}%
        </Text>
      </View>
    </View>
  );
}

function TopContentItem({ item, rank }: { item: TopContent; rank: number }) {
  const colors = useColors();
  
  return (
    <View className="flex-row items-center py-3 border-b border-border">
      <View className="w-6 h-6 rounded-full bg-primary/10 items-center justify-center mr-3">
        <Text className="text-xs font-bold text-primary">{rank}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>{item.title}</Text>
        <Text className="text-xs text-muted">{item.platform}</Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-semibold text-primary">{item.engagement}</Text>
        <Text className="text-xs text-muted">{item.impressions} views</Text>
      </View>
    </View>
  );
}

function InsightCardComponent({ insight }: { insight: InsightCard }) {
  const colors = useColors();
  
  return (
    <View className="bg-surface rounded-xl p-4 border border-border mb-3">
      <View className="flex-row items-center mb-2">
        <View className="bg-primary/10 rounded-full p-2 mr-3">
          <IconSymbol name={insight.icon as any} size={18} color={colors.primary} />
        </View>
        <Text className="text-sm font-semibold text-foreground">{insight.title}</Text>
      </View>
      <Text className="text-lg font-bold text-primary mb-1">{insight.value}</Text>
      <Text className="text-xs text-muted">{insight.description}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("30d");

  const periods: { key: TimePeriod; label: string }[] = [
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "90d", label: "90 Days" },
  ];

  return (
    <ScreenContainer>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-bold text-foreground">Analytics</Text>
          <Text className="text-sm text-muted mt-1">Track your marketing performance</Text>
        </View>

        {/* Period Selector */}
        <View className="flex-row px-5 py-4">
          {periods.map((period) => (
            <TouchableOpacity
              key={period.key}
              className={`px-4 py-2 rounded-full mr-2 ${
                selectedPeriod === period.key ? "bg-primary" : "bg-surface border border-border"
              }`}
              onPress={() => setSelectedPeriod(period.key)}
              activeOpacity={0.7}
            >
              <Text 
                className={`text-sm font-medium ${
                  selectedPeriod === period.key ? "text-background" : "text-foreground"
                }`}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Metrics Grid */}
        <View className="px-5">
          <View className="flex-row flex-wrap justify-between">
            {metricsData[selectedPeriod].map((metric, index) => (
              <MetricCard key={index} metric={metric} />
            ))}
          </View>
        </View>

        {/* Chart */}
        <View className="px-5 mt-4">
          <SimpleChart period={selectedPeriod} />
        </View>

        {/* Top Performing Content */}
        <View className="px-5 mt-6">
          <Text className="text-lg font-semibold text-foreground mb-3">Top Performing Content</Text>
          <View className="bg-surface rounded-xl p-4 border border-border">
            {topContent.map((item, index) => (
              <TopContentItem key={item.id} item={item} rank={index + 1} />
            ))}
          </View>
        </View>

        {/* Insights */}
        <View className="px-5 mt-6 pb-8">
          <Text className="text-lg font-semibold text-foreground mb-3">Insights</Text>
          {insights.map((insight) => (
            <InsightCardComponent key={insight.id} insight={insight} />
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  metricCard: {
    width: "48%",
    marginBottom: 12,
  },
  chartContainer: {
    height: 150,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  barWrapper: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  bar: {
    width: "80%",
    borderRadius: 4,
    minHeight: 4,
  },
});
