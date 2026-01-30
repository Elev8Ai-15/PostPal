import { useState, useCallback } from "react";
import { Text, View, TouchableOpacity, FlatList, TextInput, StyleSheet, Modal, Platform, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

// Mock data for demonstration (in production, this would come from tRPC)
const MOCK_MESSAGES = [
  {
    id: 1,
    platform: "instagram",
    messageType: "dm",
    senderName: "Sarah Johnson",
    senderUsername: "@sarahj",
    content: "Hi! I love your products. Do you ship internationally?",
    isRead: false,
    isStarred: true,
    receivedAt: new Date(Date.now() - 1000 * 60 * 5),
    sentiment: "positive",
  },
  {
    id: 2,
    platform: "twitter",
    messageType: "mention",
    senderName: "Tech Reviewer",
    senderUsername: "@techreviewer",
    content: "@PostPal Just tried your app and it's amazing! The AI content generation is 🔥",
    isRead: false,
    isStarred: false,
    receivedAt: new Date(Date.now() - 1000 * 60 * 30),
    sentiment: "positive",
  },
  {
    id: 3,
    platform: "linkedin",
    messageType: "comment",
    senderName: "Marketing Pro",
    senderUsername: "marketing-pro",
    content: "Great insights on content strategy! Would love to connect and discuss further.",
    isRead: true,
    isStarred: false,
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    sentiment: "positive",
  },
  {
    id: 4,
    platform: "facebook",
    messageType: "dm",
    senderName: "Local Business",
    senderUsername: "localbiz",
    content: "Can you help us with our social media strategy? We're struggling with engagement.",
    isRead: true,
    isStarred: true,
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    sentiment: "neutral",
  },
  {
    id: 5,
    platform: "instagram",
    messageType: "comment",
    senderName: "Happy Customer",
    senderUsername: "@happycustomer",
    content: "Just received my order! Everything was perfect. Thank you so much! ❤️",
    isRead: true,
    isStarred: false,
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    sentiment: "positive",
  },
];

const PLATFORMS = [
  { id: "all", label: "All", icon: "tray.fill" },
  { id: "instagram", label: "Instagram", icon: "camera.fill" },
  { id: "twitter", label: "Twitter", icon: "bubble.left.fill" },
  { id: "linkedin", label: "LinkedIn", icon: "briefcase.fill" },
  { id: "facebook", label: "Facebook", icon: "person.2.fill" },
];

const MESSAGE_TYPES = [
  { id: "all", label: "All" },
  { id: "dm", label: "DMs" },
  { id: "comment", label: "Comments" },
  { id: "mention", label: "Mentions" },
];

export default function InboxScreen() {
  const colors = useColors();
  const router = useRouter();
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<typeof MOCK_MESSAGES[0] | null>(null);
  const [replyText, setReplyText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    if (selectedPlatform !== "all" && msg.platform !== selectedPlatform) return false;
    if (selectedType !== "all" && msg.messageType !== selectedType) return false;
    if (searchQuery && !msg.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !msg.senderName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const unreadCount = messages.filter((m) => !m.isRead).length;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleMessagePress = (message: typeof MOCK_MESSAGES[0]) => {
    triggerHaptic();
    // Mark as read
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, isRead: true } : m))
    );
    setSelectedMessage(message);
    setShowReplyModal(true);
  };

  const handleStarToggle = (messageId: number) => {
    triggerHaptic();
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isStarred: !m.isStarred } : m))
    );
  };

  const handleArchive = (messageId: number) => {
    triggerHaptic();
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getPlatformColor = (platform: string) => {
    const platformColors: Record<string, string> = {
      instagram: "#E4405F",
      twitter: "#1DA1F2",
      linkedin: "#0A66C2",
      facebook: "#1877F2",
      youtube: "#FF0000",
    };
    return platformColors[platform] || colors.primary;
  };

  const getMessageTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      dm: "envelope.fill",
      comment: "bubble.left.fill",
      mention: "at",
      reply: "arrowshape.turn.up.left.fill",
    };
    return icons[type] || "envelope.fill";
  };

  const getSentimentColor = (sentiment: string) => {
    const sentimentColors: Record<string, string> = {
      positive: colors.success,
      neutral: colors.muted,
      negative: colors.error,
    };
    return sentimentColors[sentiment] || colors.muted;
  };

  const renderMessage = ({ item }: { item: typeof MOCK_MESSAGES[0] }) => (
    <TouchableOpacity
      style={[
        styles.messageCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        !item.isRead && { borderLeftWidth: 3, borderLeftColor: colors.primary },
      ]}
      onPress={() => handleMessagePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.messageHeader}>
        <View style={styles.platformBadge}>
          <View style={[styles.platformDot, { backgroundColor: getPlatformColor(item.platform) }]} />
          <Text style={[styles.platformText, { color: colors.muted }]}>
            {item.platform.charAt(0).toUpperCase() + item.platform.slice(1)}
          </Text>
          <IconSymbol name={getMessageTypeIcon(item.messageType) as any} size={12} color={colors.muted} />
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => handleStarToggle(item.id)}
            style={styles.actionButton}
          >
            <IconSymbol
              name={item.isStarred ? "star.fill" : "star"}
              size={18}
              color={item.isStarred ? "#FFD700" : colors.muted}
            />
          </TouchableOpacity>
          <Text style={[styles.timeText, { color: colors.muted }]}>{formatTime(item.receivedAt)}</Text>
        </View>
      </View>

      <View style={styles.senderRow}>
        <View style={[styles.avatar, { backgroundColor: getPlatformColor(item.platform) + "20" }]}>
          <Text style={[styles.avatarText, { color: getPlatformColor(item.platform) }]}>
            {item.senderName.charAt(0)}
          </Text>
        </View>
        <View style={styles.senderInfo}>
          <Text style={[styles.senderName, { color: colors.foreground }]} numberOfLines={1}>
            {item.senderName}
          </Text>
          <Text style={[styles.senderUsername, { color: colors.muted }]} numberOfLines={1}>
            {item.senderUsername}
          </Text>
        </View>
        {item.sentiment && (
          <View style={[styles.sentimentBadge, { backgroundColor: getSentimentColor(item.sentiment) + "20" }]}>
            <View style={[styles.sentimentDot, { backgroundColor: getSentimentColor(item.sentiment) }]} />
          </View>
        )}
      </View>

      <Text style={[styles.messageContent, { color: colors.foreground }]} numberOfLines={2}>
        {item.content}
      </Text>

      <View style={styles.messageActions}>
        <TouchableOpacity
          style={[styles.replyButton, { backgroundColor: colors.primary + "15" }]}
          onPress={() => handleMessagePress(item)}
        >
          <IconSymbol name="arrowshape.turn.up.left.fill" size={14} color={colors.primary} />
          <Text style={[styles.replyButtonText, { color: colors.primary }]}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.archiveButton, { backgroundColor: colors.muted + "15" }]}
          onPress={() => handleArchive(item.id)}
        >
          <IconSymbol name="archivebox.fill" size={14} color={colors.muted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.title, { color: colors.foreground }]}>Inbox</Text>
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.settingsButton}>
            <IconSymbol name="gearshape.fill" size={22} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search messages..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <IconSymbol name="xmark.circle.fill" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Platform Filter */}
        <View style={styles.filterSection}>
          <FlatList
            data={PLATFORMS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  selectedPlatform === item.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => {
                  triggerHaptic();
                  setSelectedPlatform(item.id);
                }}
              >
                <IconSymbol
                  name={item.icon as any}
                  size={14}
                  color={selectedPlatform === item.id ? colors.background : colors.muted}
                />
                <Text
                  style={[
                    styles.filterText,
                    { color: selectedPlatform === item.id ? colors.background : colors.foreground },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Message Type Filter */}
        <View style={styles.typeFilterRow}>
          {MESSAGE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeChip,
                selectedType === type.id && { borderBottomWidth: 2, borderBottomColor: colors.primary },
              ]}
              onPress={() => {
                triggerHaptic();
                setSelectedType(type.id);
              }}
            >
              <Text
                style={[
                  styles.typeText,
                  { color: selectedType === type.id ? colors.primary : colors.muted },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Messages List */}
        <FlatList
          data={filteredMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol name="tray.fill" size={48} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No messages</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                Messages from your connected accounts will appear here
              </Text>
            </View>
          }
        />

        {/* Reply Modal */}
        <Modal visible={showReplyModal} animationType="slide" transparent>
          <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Reply</Text>
                <TouchableOpacity onPress={() => setShowReplyModal(false)}>
                  <IconSymbol name="xmark" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>

              {selectedMessage && (
                <View style={[styles.originalMessage, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.originalSender, { color: colors.foreground }]}>
                    {selectedMessage.senderName}
                  </Text>
                  <Text style={[styles.originalContent, { color: colors.muted }]}>
                    {selectedMessage.content}
                  </Text>
                </View>
              )}

              <TextInput
                style={[
                  styles.replyInput,
                  { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
                ]}
                placeholder="Type your reply..."
                placeholderTextColor={colors.muted}
                value={replyText}
                onChangeText={setReplyText}
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.aiSuggestButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <IconSymbol name="sparkles" size={16} color={colors.primary} />
                  <Text style={[styles.aiSuggestText, { color: colors.primary }]}>AI Suggest</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    triggerHaptic();
                    setShowReplyModal(false);
                    setReplyText("");
                  }}
                >
                  <Text style={[styles.sendButtonText, { color: colors.background }]}>Send Reply</Text>
                  <IconSymbol name="paperplane.fill" size={16} color={colors.background} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 24, fontWeight: "bold" },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  settingsButton: { padding: 4 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16 },
  filterSection: { marginBottom: 8 },
  filterList: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterText: { fontSize: 13, fontWeight: "500" },
  typeFilterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 16,
  },
  typeChip: { paddingVertical: 8 },
  typeText: { fontSize: 14, fontWeight: "500" },
  messagesList: { paddingHorizontal: 16, paddingBottom: 20 },
  messageCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  platformBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  platformDot: { width: 8, height: 8, borderRadius: 4 },
  platformText: { fontSize: 12, fontWeight: "500" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionButton: { padding: 2 },
  timeText: { fontSize: 12 },
  senderRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "600" },
  senderInfo: { flex: 1, marginLeft: 10 },
  senderName: { fontSize: 15, fontWeight: "600" },
  senderUsername: { fontSize: 13 },
  sentimentBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sentimentDot: { width: 8, height: 8, borderRadius: 4 },
  messageContent: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  messageActions: { flexDirection: "row", gap: 8 },
  replyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  replyButtonText: { fontSize: 13, fontWeight: "500" },
  archiveButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: "center", marginTop: 8, paddingHorizontal: 40 },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  originalMessage: { padding: 12, borderRadius: 10, marginBottom: 16 },
  originalSender: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  originalContent: { fontSize: 14, lineHeight: 20 },
  replyInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    marginTop: 16,
    gap: 12,
  },
  aiSuggestButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  aiSuggestText: { fontSize: 14, fontWeight: "500" },
  sendButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  sendButtonText: { fontSize: 16, fontWeight: "600" },
});
