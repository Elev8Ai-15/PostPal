import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

interface ContentCardProps {
  id: number;
  title: string;
  content: string;
  contentType: "social" | "blog" | "newsletter" | "video";
  platform?: string | null;
  status?: string;
  scheduledAt?: Date | string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  hashtags?: string | null;
  onPress?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

const platformIcons: Record<string, string> = {
  instagram: "camera",
  twitter: "paperplane.fill",
  linkedin: "person.2.fill",
  facebook: "person.3.fill",
  youtube: "play.circle.fill",
  email: "envelope",
  blog: "doc.text",
};

const contentTypeColors: Record<string, string> = {
  social: "#6366F1",
  blog: "#10B981",
  newsletter: "#F59E0B",
  video: "#EF4444",
};

export function ContentCard({
  id,
  title,
  content,
  contentType,
  platform,
  status,
  scheduledAt,
  imageUrl,
  thumbnailUrl,
  hashtags,
  onPress,
  onApprove,
  onReject,
  showActions = false,
  compact = false,
}: ContentCardProps) {
  const colors = useColors();
  const displayImage = thumbnailUrl || imageUrl;
  const hashtagArray = hashtags ? hashtags.split(",").map(h => h.trim()) : [];

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const statusColors: Record<string, string> = {
    draft: colors.muted,
    pending: colors.warning,
    approved: colors.success,
    scheduled: colors.primary,
    published: colors.success,
    rejected: colors.error,
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[styles.compactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {displayImage && (
          <Image
            source={{ uri: displayImage }}
            style={styles.compactThumbnail}
            contentFit="cover"
          />
        )}
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, { color: colors.foreground }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.compactSubtitle, { color: colors.muted }]} numberOfLines={1}>
            {content}
          </Text>
        </View>
        <View
          style={[styles.typeIndicator, { backgroundColor: contentTypeColors[contentType] }]}
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {/* Header with type badge and platform */}
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: `${contentTypeColors[contentType]}20` }]}>
          <Text style={[styles.typeText, { color: contentTypeColors[contentType] }]}>
            {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
          </Text>
        </View>
        {platform && (
          <View style={styles.platformBadge}>
            <IconSymbol
              name={platformIcons[platform] as any || "globe"}
              size={14}
              color={colors.muted}
            />
            <Text style={[styles.platformText, { color: colors.muted }]}>
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </Text>
          </View>
        )}
        {status && (
          <View style={[styles.statusBadge, { backgroundColor: `${statusColors[status]}20` }]}>
            <Text style={[styles.statusText, { color: statusColors[status] }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Image thumbnail */}
      {displayImage && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: displayImage }}
            style={styles.thumbnail}
            contentFit="cover"
          />
        </View>
      )}

      {/* Title and content */}
      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
        {title}
      </Text>
      <Text style={[styles.content, { color: colors.muted }]} numberOfLines={3}>
        {content}
      </Text>

      {/* Hashtags */}
      {hashtagArray.length > 0 && (
        <View style={styles.hashtagContainer}>
          {hashtagArray.slice(0, 5).map((tag, index) => (
            <View key={index} style={[styles.hashtag, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={[styles.hashtagText, { color: colors.primary }]}>#{tag}</Text>
            </View>
          ))}
          {hashtagArray.length > 5 && (
            <Text style={[styles.moreHashtags, { color: colors.muted }]}>
              +{hashtagArray.length - 5} more
            </Text>
          )}
        </View>
      )}

      {/* Footer with date */}
      {scheduledAt && (
        <View style={styles.footer}>
          <IconSymbol name="clock" size={14} color={colors.muted} />
          <Text style={[styles.dateText, { color: colors.muted }]}>
            {formatDate(scheduledAt)}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onReject}
            style={[styles.actionButton, styles.rejectButton, { borderColor: colors.error }]}
            activeOpacity={0.7}
          >
            <IconSymbol name="xmark" size={18} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onApprove}
            style={[styles.actionButton, styles.approveButton, { backgroundColor: colors.success }]}
            activeOpacity={0.7}
          >
            <IconSymbol name="checkmark" size={18} color={colors.background} />
            <Text style={[styles.actionText, { color: colors.background }]}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  compactCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  platformBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  platformText: {
    fontSize: 12,
  },
  statusBadge: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  imageContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },
  compactThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  compactSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  typeIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginLeft: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  hashtagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 6,
  },
  hashtag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hashtagText: {
    fontSize: 12,
    fontWeight: "500",
  },
  moreHashtags: {
    fontSize: 12,
    alignSelf: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  dateText: {
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  rejectButton: {
    borderWidth: 1,
  },
  approveButton: {},
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
