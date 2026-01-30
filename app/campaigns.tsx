import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, TextInput } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

interface Campaign {
  id: number;
  name: string;
  description: string | null;
  status: "draft" | "active" | "completed" | "paused";
  totalImpressions: number | null;
  totalEngagement: number | null;
  totalClicks: number | null;
  bestPlatform: string | null;
  createdAt: Date;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#9CA3AF20", text: "#9CA3AF" },
  active: { bg: "#22C55E20", text: "#22C55E" },
  completed: { bg: "#3B82F620", text: "#3B82F6" },
  paused: { bg: "#F59E0B20", text: "#F59E0B" },
};

export default function CampaignsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDescription, setNewCampaignDescription] = useState("");

  const utils = trpc.useUtils();
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();
  
  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
      setShowCreateModal(false);
      setNewCampaignName("");
      setNewCampaignDescription("");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: () => {
      Alert.alert("Error", "Failed to create campaign");
    },
  });

  const deleteMutation = trpc.campaigns.delete.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
    },
  });

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleCreateCampaign = () => {
    if (!newCampaignName.trim()) {
      Alert.alert("Error", "Please enter a campaign name");
      return;
    }
    createMutation.mutate({
      name: newCampaignName.trim(),
      description: newCampaignDescription.trim() || undefined,
    });
  };

  const handleDeleteCampaign = (campaign: Campaign) => {
    Alert.alert(
      "Delete Campaign",
      `Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate({ id: campaign.id }),
        },
      ]
    );
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const renderCampaignCard = ({ item }: { item: Campaign }) => {
    const statusStyle = statusColors[item.status] || statusColors.draft;
    
    return (
      <TouchableOpacity
        className="bg-surface rounded-xl p-4 mb-3 border border-border"
        onPress={() => {
          triggerHaptic();
          router.push({
            pathname: "/campaign-analytics",
            params: { campaignId: item.id.toString(), campaignName: item.name },
          });
        }}
        onLongPress={() => handleDeleteCampaign(item)}
        accessibilityLabel={`Campaign: ${item.name}`}
        accessibilityRole="button"
      >
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-semibold text-foreground">{item.name}</Text>
            {item.description && (
              <Text className="text-sm text-muted mt-1" numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          <View
            className="px-2 py-1 rounded-full"
            style={{ backgroundColor: statusStyle.bg }}
          >
            <Text className="text-xs font-medium capitalize" style={{ color: statusStyle.text }}>
              {item.status}
            </Text>
          </View>
        </View>

        {/* Metrics Row */}
        <View className="flex-row justify-between mt-3 pt-3 border-t border-border">
          <View className="items-center flex-1">
            <Text className="text-lg font-bold text-foreground">
              {formatNumber(item.totalImpressions)}
            </Text>
            <Text className="text-xs text-muted">Impressions</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-lg font-bold text-foreground">
              {formatNumber(item.totalEngagement)}
            </Text>
            <Text className="text-xs text-muted">Engagement</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-lg font-bold text-foreground">
              {formatNumber(item.totalClicks)}
            </Text>
            <Text className="text-xs text-muted">Clicks</Text>
          </View>
          {item.bestPlatform && (
            <View className="items-center flex-1">
              <Text className="text-lg font-bold text-primary capitalize">
                {item.bestPlatform.slice(0, 4)}
              </Text>
              <Text className="text-xs text-muted">Best</Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center justify-end mt-3">
          <Text className="text-xs text-muted mr-1">View Analytics</Text>
          <IconSymbol name="chevron.right" size={14} color={colors.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-muted">Loading campaigns...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-foreground">Campaigns</Text>
            <Text className="text-sm text-muted">Track multi-platform performance</Text>
          </View>
        </View>
        <TouchableOpacity
          className="bg-primary px-4 py-2 rounded-xl"
          onPress={() => {
            triggerHaptic();
            setShowCreateModal(true);
          }}
          accessibilityLabel="Create new campaign"
          accessibilityRole="button"
        >
          <Text className="text-white font-semibold">+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center px-4">
          <View className="bg-background rounded-2xl p-6 w-full max-w-md">
            <Text className="text-xl font-bold text-foreground mb-4">Create Campaign</Text>
            
            <Text className="text-sm text-muted mb-2">Campaign Name *</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground mb-4"
              placeholder="e.g., Summer Product Launch"
              placeholderTextColor={colors.muted}
              value={newCampaignName}
              onChangeText={setNewCampaignName}
              autoFocus
            />
            
            <Text className="text-sm text-muted mb-2">Description (optional)</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground mb-4"
              placeholder="Brief description of the campaign"
              placeholderTextColor={colors.muted}
              value={newCampaignDescription}
              onChangeText={setNewCampaignDescription}
              multiline
              numberOfLines={3}
            />
            
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-surface border border-border py-3 rounded-xl"
                onPress={() => {
                  setShowCreateModal(false);
                  setNewCampaignName("");
                  setNewCampaignDescription("");
                }}
              >
                <Text className="text-center text-foreground font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-primary py-3 rounded-xl"
                onPress={handleCreateCampaign}
                disabled={createMutation.isPending}
              >
                <Text className="text-center text-white font-semibold">
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Campaign List */}
      {campaigns && campaigns.length > 0 ? (
        <FlatList
          data={campaigns}
          renderItem={renderCampaignCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <IconSymbol name="chart.bar" size={64} color={colors.muted} />
          <Text className="text-xl font-semibold text-foreground mt-4">No Campaigns Yet</Text>
          <Text className="text-sm text-muted text-center mt-2">
            Create your first campaign to track performance across multiple platforms
          </Text>
          <TouchableOpacity
            className="bg-primary px-6 py-3 rounded-xl mt-6"
            onPress={() => {
              triggerHaptic();
              setShowCreateModal(true);
            }}
          >
            <Text className="text-white font-semibold">Create Campaign</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}
