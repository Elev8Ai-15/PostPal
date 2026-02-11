import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, KeyboardAvoidingView, RefreshControl, ActivityIndicator } from "react-native";
import { useState, useCallback, useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import {
  getLocalDrafts,
  getPendingDrafts,
  updateDraftStatus,
  updateDraftContent,
  deleteDraft,
  logActivity,
  incrementStat,
  type LocalDraft,
} from "@/lib/content-store";

interface ContentItem {
  id: string;
  title: string;
  preview: string;
  type: "social" | "blog" | "newsletter" | "video";
  platform?: string;
  scheduledDate: string;
  scheduledTime: string;
  source: "local" | "server";
  serverId?: number;
}

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
  onDelete: () => void;
}

function ApprovalCard({ item, onApprove, onRevise, onPreview, onDelete }: ApprovalCardProps) {
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
          <View className="flex-1" />
          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: item.source === "server" ? `${colors.primary}15` : `${colors.warning}15` }}>
            <Text className="text-xs" style={{ color: item.source === "server" ? colors.primary : colors.warning }}>
              {item.source === "server" ? "Cloud" : "Local"}
            </Text>
          </View>
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
          {item.scheduledDate ? `Scheduled for ${item.scheduledDate} at ${item.scheduledTime}` : `Created ${item.scheduledDate || "recently"}`}
        </Text>
      </View>

      {/* Action Buttons */}
      <View className="flex-row border-t border-border">
        <TouchableOpacity
          className="flex-1 py-3.5 flex-row items-center justify-center border-r border-border"
          onPress={onDelete}
          activeOpacity={0.7}
        >
          <IconSymbol name="xmark.circle" size={18} color={colors.error} />
          <Text className="text-sm font-medium ml-1.5" style={{ color: colors.error }}>
            Delete
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 py-3.5 flex-row items-center justify-center border-r border-border"
          onPress={onRevise}
          activeOpacity={0.7}
        >
          <IconSymbol name="pencil" size={18} color={colors.warning} />
          <Text className="text-sm font-medium ml-1.5" style={{ color: colors.warning }}>
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 py-3.5 flex-row items-center justify-center bg-primary/10"
          onPress={onApprove}
          activeOpacity={0.7}
        >
          <IconSymbol name="checkmark.circle.fill" size={18} color={colors.success} />
          <Text className="text-sm font-medium ml-1.5" style={{ color: colors.success }}>
            Approve
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ApprovalsScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const [pendingContent, setPendingContent] = useState<ContentItem[]>([]);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [editedText, setEditedText] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState<ContentItem | null>(null);
  const [filterType, setFilterType] = useState<"all" | "social" | "blog" | "newsletter" | "video">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Server data query (only if authenticated)
  const pendingQuery = trpc.posts.pending.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const approveMutation = trpc.posts.approve.useMutation();
  const updateMutation = trpc.posts.update.useMutation();
  const deleteMutation = trpc.posts.delete.useMutation();

  // Load content from both local and server sources
  const loadContent = useCallback(async () => {
    try {
      const items: ContentItem[] = [];

      // Load local drafts
      const localDrafts = await getPendingDrafts();
      for (const draft of localDrafts) {
        items.push({
          id: draft.id,
          title: draft.title,
          preview: draft.content,
          type: draft.contentType,
          platform: draft.platform,
          scheduledDate: new Date(draft.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          scheduledTime: new Date(draft.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          source: "local",
        });
      }

      // Load server posts if authenticated
      if (isAuthenticated && pendingQuery.data) {
        for (const post of pendingQuery.data) {
          items.push({
            id: `server_${post.id}`,
            title: post.title,
            preview: post.content,
            type: (post.contentType as any) || "social",
            platform: post.platform || undefined,
            scheduledDate: post.scheduledAt
              ? new Date(post.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            scheduledTime: post.scheduledAt
              ? new Date(post.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
              : new Date(post.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            source: "server",
            serverId: post.id,
          });
        }
      }

      // Sort by date, newest first
      items.sort((a, b) => {
        const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`);
        const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`);
        return dateB.getTime() - dateA.getTime();
      });

      setPendingContent(items);
    } catch (error) {
      console.error("Failed to load content:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, pendingQuery.data]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (isAuthenticated) {
      await pendingQuery.refetch();
    }
    await loadContent();
    setIsRefreshing(false);
  }, [isAuthenticated, pendingQuery, loadContent]);

  const filteredContent = filterType === "all"
    ? pendingContent
    : pendingContent.filter(item => item.type === filterType);

  const FILTER_OPTIONS: { id: "all" | "social" | "blog" | "newsletter" | "video"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "social", label: "Social" },
    { id: "blog", label: "Blog" },
    { id: "newsletter", label: "Newsletter" },
    { id: "video", label: "Video" },
  ];

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleApprove = async (item: ContentItem) => {
    triggerHaptic();
    try {
      if (item.source === "server" && item.serverId) {
        await approveMutation.mutateAsync({ id: item.serverId });
      } else {
        await updateDraftStatus(item.id, "approved");
      }
      await incrementStat("approved");
      await logActivity({ type: "approved", title: item.title, platform: item.platform });
      setPendingContent(prev => prev.filter(i => i.id !== item.id));
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to approve content. Please try again.");
    }
  };

  const handleDelete = async (item: ContentItem) => {
    triggerHaptic();
    Alert.alert(
      "Delete Content",
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (item.source === "server" && item.serverId) {
                await deleteMutation.mutateAsync({ id: item.serverId });
              } else {
                await deleteDraft(item.id);
              }
              await logActivity({ type: "rejected", title: item.title, platform: item.platform });
              setPendingContent(prev => prev.filter(i => i.id !== item.id));
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete content.");
            }
          },
        },
      ]
    );
  };

  const handleRevise = (item: ContentItem) => {
    triggerHaptic();
    setEditingItem(item);
    setEditedText(item.preview);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    triggerHaptic();
    try {
      if (editingItem.source === "server" && editingItem.serverId) {
        await updateMutation.mutateAsync({ id: editingItem.serverId, content: editedText });
      } else {
        await updateDraftContent(editingItem.id, editedText);
      }
      setPendingContent(prev =>
        prev.map(item =>
          item.id === editingItem.id
            ? { ...item, preview: editedText }
            : item
        )
      );
      setShowEditModal(false);
      setEditingItem(null);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save changes.");
    }
  };

  const handlePreview = (item: ContentItem) => {
    triggerHaptic();
    setShowFullPreview(item);
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
          onPress: async () => {
            try {
              for (const item of pendingContent) {
                if (item.source === "server" && item.serverId) {
                  await approveMutation.mutateAsync({ id: item.serverId });
                } else {
                  await updateDraftStatus(item.id, "approved");
                }
                await incrementStat("approved");
              }
              setPendingContent([]);
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (error) {
              Alert.alert("Error", "Some items could not be approved.");
              await loadContent();
            }
          },
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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-foreground">Approvals</Text>
              <Text className="text-sm text-muted mt-1">
                {pendingContent.length} item{pendingContent.length !== 1 ? "s" : ""} pending review
              </Text>
            </View>
            {pendingContent.length > 1 && (
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

        {/* Content Type Filter */}
        {pendingContent.length > 0 && (
          <View className="px-5 pt-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                {FILTER_OPTIONS.map((filter) => {
                  const count = filter.id === "all"
                    ? pendingContent.length
                    : pendingContent.filter(i => i.type === filter.id).length;
                  if (filter.id !== "all" && count === 0) return null;
                  return (
                    <TouchableOpacity
                      key={filter.id}
                      className={`mr-2 px-4 py-2 rounded-full border ${
                        filterType === filter.id
                          ? "bg-primary border-primary"
                          : "bg-surface border-border"
                      }`}
                      onPress={() => {
                        triggerHaptic();
                        setFilterType(filter.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text className={`text-sm font-medium ${
                        filterType === filter.id ? "text-background" : "text-foreground"
                      }`}>
                        {filter.label} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Content List */}
        <View className="px-5 pt-4 pb-8">
          {isLoading ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="text-sm text-muted mt-3">Loading content...</Text>
            </View>
          ) : filteredContent.length > 0 ? (
            filteredContent.map((item) => (
              <ApprovalCard
                key={item.id}
                item={item}
                onApprove={() => handleApprove(item)}
                onRevise={() => handleRevise(item)}
                onPreview={() => handlePreview(item)}
                onDelete={() => handleDelete(item)}
              />
            ))
          ) : (
            <View className="bg-surface rounded-2xl p-8 border border-border items-center mt-8">
              <View className="bg-success/10 rounded-full p-4 mb-4">
                <IconSymbol name="checkmark.circle.fill" size={48} color={colors.success} />
              </View>
              <Text className="text-xl font-semibold text-foreground">All caught up!</Text>
              <Text className="text-sm text-muted mt-2 text-center">
                {pendingContent.length === 0 && filterType === "all"
                  ? "No content to review yet. Create some content to get started!"
                  : "No items match this filter. Try selecting a different category."}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Content Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-background rounded-t-3xl max-h-[90%]">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between p-4 border-b border-border">
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Text className="text-base text-muted">Cancel</Text>
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-foreground">Edit Content</Text>
                <TouchableOpacity onPress={handleSaveEdit}>
                  <Text className="text-base font-semibold text-primary">Save</Text>
                </TouchableOpacity>
              </View>

              {/* Edit Title */}
              {editingItem && (
                <View className="p-4">
                  <Text className="text-sm font-medium text-foreground mb-2">
                    {editingItem.title}
                  </Text>
                  <View className="flex-row items-center mb-4">
                    <View
                      className="rounded-full px-2.5 py-1 flex-row items-center mr-2"
                      style={{ backgroundColor: `${getTypeColor(editingItem.type, colors)}20` }}
                    >
                      <IconSymbol name={getTypeIcon(editingItem.type) as any} size={14} color={getTypeColor(editingItem.type, colors)} />
                      <Text className="text-xs font-medium ml-1" style={{ color: getTypeColor(editingItem.type, colors) }}>
                        {getTypeLabel(editingItem.type)}
                      </Text>
                    </View>
                    {editingItem.platform && (
                      <Text className="text-xs text-muted">{editingItem.platform}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Edit Text Area */}
              <ScrollView className="px-4 pb-8">
                <Text className="text-sm font-medium text-foreground mb-2">Content</Text>
                <TextInput
                  className="bg-surface border border-border rounded-xl p-4"
                  value={editedText}
                  onChangeText={setEditedText}
                  multiline
                  style={{ minHeight: 200, textAlignVertical: "top", color: colors.foreground }}
                  placeholder="Edit your content..."
                  placeholderTextColor={colors.muted}
                />
                <Text className="text-xs text-muted mt-2">
                  {editedText.length} characters
                </Text>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Full Preview Modal */}
      <Modal
        visible={showFullPreview !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFullPreview(null)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-3xl max-h-[80%]">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-border">
              <View className="w-16" />
              <Text className="text-lg font-semibold text-foreground">Full Preview</Text>
              <TouchableOpacity onPress={() => setShowFullPreview(null)} className="w-16 items-end">
                <Text className="text-base text-primary">Done</Text>
              </TouchableOpacity>
            </View>

            {showFullPreview && (
              <ScrollView className="p-4">
                <Text className="text-lg font-bold text-foreground mb-2">
                  {showFullPreview.title}
                </Text>
                <View className="flex-row items-center mb-4">
                  <View
                    className="rounded-full px-2.5 py-1 flex-row items-center mr-2"
                    style={{ backgroundColor: `${getTypeColor(showFullPreview.type, colors)}20` }}
                  >
                    <IconSymbol name={getTypeIcon(showFullPreview.type) as any} size={14} color={getTypeColor(showFullPreview.type, colors)} />
                    <Text className="text-xs font-medium ml-1" style={{ color: getTypeColor(showFullPreview.type, colors) }}>
                      {getTypeLabel(showFullPreview.type)}
                    </Text>
                  </View>
                  {showFullPreview.platform && (
                    <Text className="text-xs text-muted">{showFullPreview.platform}</Text>
                  )}
                </View>
                <View className="bg-surface rounded-xl p-4 border border-border">
                  <Text className="text-sm text-foreground leading-relaxed">
                    {showFullPreview.preview}
                  </Text>
                </View>
                <View className="flex-row items-center mt-4 mb-8">
                  <IconSymbol name="clock" size={14} color={colors.muted} />
                  <Text className="text-xs text-muted ml-1">
                    {showFullPreview.scheduledDate} at {showFullPreview.scheduledTime}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});
