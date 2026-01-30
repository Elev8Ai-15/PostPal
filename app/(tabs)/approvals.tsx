import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

interface ContentItem {
  id: string;
  title: string;
  preview: string;
  type: "social" | "blog" | "newsletter" | "video";
  platform?: string;
  scheduledDate: string;
  scheduledTime: string;
}

const initialPendingContent: ContentItem[] = [
  {
    id: "1",
    title: "5 Marketing Trends to Watch in 2026",
    preview: "The marketing landscape is evolving rapidly. Here are the top 5 trends that will shape how brands connect with their audiences this year...",
    type: "social",
    platform: "Instagram",
    scheduledDate: "Jan 30, 2026",
    scheduledTime: "10:00 AM",
  },
  {
    id: "2",
    title: "How AI is Transforming Content Creation",
    preview: "Artificial intelligence has revolutionized the way we create and distribute content. From automated copywriting to personalized recommendations...",
    type: "blog",
    scheduledDate: "Jan 31, 2026",
    scheduledTime: "9:00 AM",
  },
  {
    id: "3",
    title: "Weekly Marketing Digest - Issue #42",
    preview: "This week's highlights: New social media algorithm changes, email marketing best practices, and a case study on viral content strategies...",
    type: "newsletter",
    scheduledDate: "Feb 1, 2026",
    scheduledTime: "8:00 AM",
  },
  {
    id: "4",
    title: "Behind the Scenes: Our Creative Process",
    preview: "Take a look at how our team develops content strategies, from initial brainstorming to final execution. Learn our secrets to consistent engagement...",
    type: "video",
    platform: "YouTube",
    scheduledDate: "Feb 2, 2026",
    scheduledTime: "3:00 PM",
  },
  {
    id: "5",
    title: "Customer Success Story: TechStart Inc.",
    preview: "See how TechStart Inc. grew their social following by 300% in just 3 months using our AI-powered marketing strategies...",
    type: "social",
    platform: "LinkedIn",
    scheduledDate: "Feb 3, 2026",
    scheduledTime: "12:00 PM",
  },
];

function getTypeColor(type: string, colors: any) {
  switch (type) {
    case "social": return colors.primary;
    case "blog": return colors.success;
    case "newsletter": return "#9333EA";
    case "video": return colors.warning;
    default: return colors.muted;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "social": return "message";
    case "blog": return "doc.text";
    case "newsletter": return "envelope";
    case "video": return "video";
    default: return "doc.text";
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case "social": return "Social Post";
    case "blog": return "Blog Article";
    case "newsletter": return "Newsletter";
    case "video": return "Video";
    default: return "Content";
  }
}

interface ApprovalCardProps {
  item: ContentItem;
  onApprove: () => void;
  onRevise: () => void;
  onPreview: () => void;
}

function ApprovalCard({ item, onApprove, onRevise, onPreview }: ApprovalCardProps) {
  const colors = useColors();
  const typeColor = getTypeColor(item.type, colors);

  return (
    <View className="bg-surface rounded-2xl mb-4 border border-border overflow-hidden">
      {/* Header */}
      <View className="p-4 border-b border-border">
        <View className="flex-row items-center mb-2">
          <View 
            className="rounded-full px-2.5 py-1 flex-row items-center mr-2"
            style={{ backgroundColor: `${typeColor}20` }}
          >
            <IconSymbol name={getTypeIcon(item.type) as any} size={14} color={typeColor} />
            <Text className="text-xs font-medium ml-1" style={{ color: typeColor }}>
              {getTypeLabel(item.type)}
            </Text>
          </View>
          {item.platform && (
            <Text className="text-xs text-muted">{item.platform}</Text>
          )}
        </View>
        <Text className="text-base font-semibold text-foreground">{item.title}</Text>
      </View>

      {/* Preview */}
      <TouchableOpacity className="p-4" onPress={onPreview} activeOpacity={0.7}>
        <Text className="text-sm text-muted leading-5" numberOfLines={3}>
          {item.preview}
        </Text>
        <Text className="text-sm text-primary font-medium mt-2">Tap to preview full content</Text>
      </TouchableOpacity>

      {/* Schedule Info */}
      <View className="px-4 pb-3 flex-row items-center">
        <IconSymbol name="clock" size={14} color={colors.muted} />
        <Text className="text-xs text-muted ml-1">
          Scheduled for {item.scheduledDate} at {item.scheduledTime}
        </Text>
      </View>

      {/* Action Buttons */}
      <View className="flex-row border-t border-border">
        <TouchableOpacity 
          className="flex-1 py-3.5 flex-row items-center justify-center border-r border-border"
          onPress={onRevise}
          activeOpacity={0.7}
        >
          <IconSymbol name="pencil" size={18} color={colors.warning} />
          <Text className="text-sm font-medium ml-2" style={{ color: colors.warning }}>
            Request Revision
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className="flex-1 py-3.5 flex-row items-center justify-center bg-primary/10"
          onPress={onApprove}
          activeOpacity={0.7}
        >
          <IconSymbol name="checkmark.circle.fill" size={18} color={colors.success} />
          <Text className="text-sm font-medium ml-2" style={{ color: colors.success }}>
            Approve
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ApprovalsScreen() {
  const colors = useColors();
  const [pendingContent, setPendingContent] = useState(initialPendingContent);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleApprove = (id: string) => {
    triggerHaptic();
    setPendingContent(prev => prev.filter(item => item.id !== id));
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleRevise = (id: string) => {
    triggerHaptic();
    Alert.alert(
      "Request Revision",
      "What changes would you like to make?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Submit", 
          onPress: () => {
            setPendingContent(prev => prev.filter(item => item.id !== id));
          }
        },
      ]
    );
  };

  const handlePreview = (item: ContentItem) => {
    triggerHaptic();
    Alert.alert(item.title, item.preview);
  };

  const handleApproveAll = () => {
    triggerHaptic();
    Alert.alert(
      "Approve All",
      `Are you sure you want to approve all ${pendingContent.length} items?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Approve All", 
          onPress: () => {
            setPendingContent([]);
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-foreground">Approvals</Text>
              <Text className="text-sm text-muted mt-1">
                {pendingContent.length} items pending review
              </Text>
            </View>
            {pendingContent.length > 0 && (
              <TouchableOpacity 
                className="bg-primary/10 px-4 py-2 rounded-full"
                onPress={handleApproveAll}
                activeOpacity={0.7}
              >
                <Text className="text-sm font-medium text-primary">Approve All</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content List */}
        <View className="px-5 pt-4 pb-8">
          {pendingContent.length > 0 ? (
            pendingContent.map((item) => (
              <ApprovalCard
                key={item.id}
                item={item}
                onApprove={() => handleApprove(item.id)}
                onRevise={() => handleRevise(item.id)}
                onPreview={() => handlePreview(item)}
              />
            ))
          ) : (
            <View className="bg-surface rounded-2xl p-8 border border-border items-center mt-8">
              <View className="bg-success/10 rounded-full p-4 mb-4">
                <IconSymbol name="checkmark.circle.fill" size={48} color={colors.success} />
              </View>
              <Text className="text-xl font-semibold text-foreground">All caught up!</Text>
              <Text className="text-sm text-muted mt-2 text-center">
                You have no pending content to review. New AI-generated content will appear here.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});
