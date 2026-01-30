import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useState } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

type Platform = "instagram" | "twitter" | "linkedin" | "facebook" | "youtube" | "tiktok" | "reddit";

interface PlatformPreviewProps {
  content: string;
  imageUrl?: string | null;
  hashtags?: string[];
  selectedPlatform?: Platform;
  onPlatformChange?: (platform: Platform) => void;
}

const platformConfig: Record<Platform, {
  name: string;
  icon: string;
  color: string;
  charLimit: number;
  hashtagLimit: number;
  aspectRatio: string;
}> = {
  instagram: {
    name: "Instagram",
    icon: "camera",
    color: "#E4405F",
    charLimit: 2200,
    hashtagLimit: 30,
    aspectRatio: "1:1",
  },
  twitter: {
    name: "Twitter/X",
    icon: "paperplane.fill",
    color: "#1DA1F2",
    charLimit: 280,
    hashtagLimit: 5,
    aspectRatio: "16:9",
  },
  linkedin: {
    name: "LinkedIn",
    icon: "person.2.fill",
    color: "#0A66C2",
    charLimit: 3000,
    hashtagLimit: 5,
    aspectRatio: "1.91:1",
  },
  facebook: {
    name: "Facebook",
    icon: "person.3.fill",
    color: "#1877F2",
    charLimit: 63206,
    hashtagLimit: 3,
    aspectRatio: "1.91:1",
  },
  youtube: {
    name: "YouTube",
    icon: "play.circle.fill",
    color: "#FF0000",
    charLimit: 5000,
    hashtagLimit: 15,
    aspectRatio: "16:9",
  },
  tiktok: {
    name: "TikTok",
    icon: "video",
    color: "#000000",
    charLimit: 2200,
    hashtagLimit: 5,
    aspectRatio: "9:16",
  },
  reddit: {
    name: "Reddit",
    icon: "message",
    color: "#FF4500",
    charLimit: 40000,
    hashtagLimit: 0,
    aspectRatio: "16:9",
  },
};

const platforms: Platform[] = ["instagram", "twitter", "linkedin", "facebook", "youtube", "tiktok", "reddit"];

export function PlatformPreview({
  content,
  imageUrl,
  hashtags = [],
  selectedPlatform: initialPlatform = "instagram",
  onPlatformChange,
}: PlatformPreviewProps) {
  const colors = useColors();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(initialPlatform);
  
  const config = platformConfig[selectedPlatform];
  const charCount = content.length;
  const isOverLimit = charCount > config.charLimit;
  const isOverHashtagLimit = config.hashtagLimit > 0 && hashtags.length > config.hashtagLimit;
  
  const truncatedContent = isOverLimit 
    ? content.substring(0, config.charLimit - 3) + "..."
    : content;

  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform);
    onPlatformChange?.(platform);
  };

  const getImageAspectRatio = () => {
    switch (selectedPlatform) {
      case "instagram": return 1;
      case "twitter": return 16/9;
      case "linkedin": return 1.91;
      case "facebook": return 1.91;
      case "youtube": return 16/9;
      case "reddit": return 16/9;
      default: return 1;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Platform selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.platformSelector}
      >
        {platforms.map((platform) => {
          const pConfig = platformConfig[platform];
          const isSelected = platform === selectedPlatform;
          return (
            <TouchableOpacity
              key={platform}
              onPress={() => handlePlatformSelect(platform)}
              style={[
                styles.platformTab,
                isSelected && { backgroundColor: `${pConfig.color}20`, borderColor: pConfig.color },
              ]}
              activeOpacity={0.7}
            >
              <IconSymbol
                name={pConfig.icon as any}
                size={18}
                color={isSelected ? pConfig.color : colors.muted}
              />
              <Text style={[
                styles.platformName,
                { color: isSelected ? pConfig.color : colors.muted }
              ]}>
                {pConfig.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Preview container */}
      <View style={[styles.previewContainer, { borderColor: colors.border }]}>
        {/* Platform header simulation */}
        <View style={styles.previewHeader}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: config.color }]}>
            <Text style={styles.avatarText}>B</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.username, { color: colors.foreground }]}>Brad</Text>
            <Text style={[styles.handle, { color: colors.muted }]}>
              {selectedPlatform === "reddit" ? "u/bradmarketing" : "@bradmarketing"}
            </Text>
          </View>
          <IconSymbol name="ellipsis" size={20} color={colors.muted} />
        </View>

        {/* Image preview */}
        {imageUrl && (
          <View style={[styles.imagePreview, { aspectRatio: getImageAspectRatio() }]}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.previewImage}
              contentFit="cover"
            />
          </View>
        )}

        {/* Content preview */}
        <View style={styles.contentPreview}>
          <Text style={[styles.previewContent, { color: colors.foreground }]}>
            {truncatedContent}
          </Text>
          
          {/* Hashtags (not for Reddit) */}
          {selectedPlatform !== "reddit" && hashtags.length > 0 && (
            <View style={styles.hashtagPreview}>
              {hashtags.slice(0, config.hashtagLimit || hashtags.length).map((tag, index) => (
                <Text key={index} style={[styles.hashtagText, { color: config.color }]}>
                  #{tag}{" "}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Engagement simulation */}
        <View style={[styles.engagementBar, { borderTopColor: colors.border }]}>
          {selectedPlatform === "reddit" ? (
            <>
              <View style={styles.engagementItem}>
                <IconSymbol name="arrow.up" size={18} color={colors.muted} />
                <Text style={[styles.engagementText, { color: colors.muted }]}>Upvote</Text>
              </View>
              <View style={styles.engagementItem}>
                <IconSymbol name="bubble.left" size={18} color={colors.muted} />
                <Text style={[styles.engagementText, { color: colors.muted }]}>Comment</Text>
              </View>
              <View style={styles.engagementItem}>
                <IconSymbol name="arrow.2.squarepath" size={18} color={colors.muted} />
                <Text style={[styles.engagementText, { color: colors.muted }]}>Share</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.engagementItem}>
                <IconSymbol name="heart" size={18} color={colors.muted} />
                <Text style={[styles.engagementText, { color: colors.muted }]}>Like</Text>
              </View>
              <View style={styles.engagementItem}>
                <IconSymbol name="bubble.left" size={18} color={colors.muted} />
                <Text style={[styles.engagementText, { color: colors.muted }]}>Comment</Text>
              </View>
              <View style={styles.engagementItem}>
                <IconSymbol name="arrow.2.squarepath" size={18} color={colors.muted} />
                <Text style={[styles.engagementText, { color: colors.muted }]}>Share</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Stats and warnings */}
      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Characters:</Text>
          <Text style={[
            styles.statValue,
            { color: isOverLimit ? colors.error : colors.foreground }
          ]}>
            {charCount} / {config.charLimit}
          </Text>
        </View>
        {config.hashtagLimit > 0 && (
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Hashtags:</Text>
            <Text style={[
              styles.statValue,
              { color: isOverHashtagLimit ? colors.error : colors.foreground }
            ]}>
              {hashtags.length} / {config.hashtagLimit}
            </Text>
          </View>
        )}
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Image ratio:</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {config.aspectRatio}
          </Text>
        </View>
      </View>

      {/* Warnings */}
      {(isOverLimit || isOverHashtagLimit) && (
        <View style={[styles.warningContainer, { backgroundColor: `${colors.error}15` }]}>
          <IconSymbol name="exclamationmark.triangle" size={16} color={colors.error} />
          <View style={styles.warningTextContainer}>
            {isOverLimit && (
              <Text style={[styles.warningText, { color: colors.error }]}>
                Content exceeds {config.charLimit} character limit for {config.name}
              </Text>
            )}
            {isOverHashtagLimit && (
              <Text style={[styles.warningText, { color: colors.error }]}>
                Too many hashtags ({hashtags.length}/{config.hashtagLimit}) for {config.name}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Platform tips */}
      <View style={[styles.tipsContainer, { backgroundColor: `${colors.primary}10` }]}>
        <IconSymbol name="lightbulb" size={16} color={colors.primary} />
        <Text style={[styles.tipsText, { color: colors.primary }]}>
          {selectedPlatform === "instagram" && "Square images (1:1) perform best. Use all 30 hashtags in first comment for cleaner look."}
          {selectedPlatform === "twitter" && "Keep it concise. Add an image to increase engagement by 150%."}
          {selectedPlatform === "linkedin" && "Professional tone works best. Tag relevant people and companies."}
          {selectedPlatform === "facebook" && "Questions and polls drive engagement. Native video gets 10x more reach."}
          {selectedPlatform === "youtube" && "First 100 characters of description are most important for SEO."}
          {selectedPlatform === "reddit" && "Be authentic and avoid promotional language. Engage with the community first. Choose the right subreddit."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  platformSelector: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
  },
  platformTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 6,
  },
  platformName: {
    fontSize: 13,
    fontWeight: "500",
  },
  previewContainer: {
    marginHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  headerInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
  },
  handle: {
    fontSize: 12,
  },
  imagePreview: {
    width: "100%",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  contentPreview: {
    padding: 12,
  },
  previewContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  hashtagPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  hashtagText: {
    fontSize: 14,
  },
  engagementBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  engagementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  engagementText: {
    fontSize: 12,
  },
  statsContainer: {
    padding: 12,
    gap: 6,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statLabel: {
    fontSize: 13,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
  },
  tipsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    margin: 12,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});

export type { Platform as PreviewPlatform };
