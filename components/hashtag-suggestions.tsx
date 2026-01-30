import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useState } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type Platform = "instagram" | "twitter" | "linkedin" | "facebook" | "youtube";

interface HashtagSuggestionsProps {
  content: string;
  platform?: Platform;
  selectedHashtags: string[];
  onHashtagToggle: (hashtag: string) => void;
  onHashtagsGenerated?: (hashtags: string[]) => void;
}

export function HashtagSuggestions({
  content,
  platform,
  selectedHashtags,
  onHashtagToggle,
  onHashtagsGenerated,
}: HashtagSuggestionsProps) {
  const colors = useColors();
  const [suggestions, setSuggestions] = useState<{
    hashtags: string[];
    trending: string[];
    niche: string[];
    tips: string;
  } | null>(null);

  const suggestMutation = trpc.ai.suggestHashtags.useMutation({
    onSuccess: (data) => {
      setSuggestions(data);
      onHashtagsGenerated?.(data.hashtags || []);
    },
  });

  const handleGenerateSuggestions = () => {
    if (!content.trim()) return;
    suggestMutation.mutate({
      content,
      platform,
      count: platform === "instagram" ? 20 : 10,
    });
  };

  const isSelected = (hashtag: string) => selectedHashtags.includes(hashtag);

  const HashtagChip = ({ tag, category }: { tag: string; category?: "trending" | "niche" }) => {
    const selected = isSelected(tag);
    const categoryColors = {
      trending: colors.warning,
      niche: colors.success,
    };
    const chipColor = category ? categoryColors[category] : colors.primary;

    return (
      <TouchableOpacity
        onPress={() => onHashtagToggle(tag)}
        style={[
          styles.chip,
          selected 
            ? { backgroundColor: chipColor, borderColor: chipColor }
            : { backgroundColor: `${chipColor}15`, borderColor: `${chipColor}40` }
        ]}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.chipText,
          { color: selected ? colors.background : chipColor }
        ]}>
          #{tag}
        </Text>
        {selected && (
          <IconSymbol name="checkmark" size={12} color={colors.background} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol name="number" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>Hashtag Suggestions</Text>
        </View>
        <TouchableOpacity
          onPress={handleGenerateSuggestions}
          disabled={suggestMutation.isPending || !content.trim()}
          style={[
            styles.generateButton,
            { 
              backgroundColor: suggestMutation.isPending ? colors.muted : colors.primary,
              opacity: !content.trim() ? 0.5 : 1,
            }
          ]}
          activeOpacity={0.7}
        >
          {suggestMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <>
              <IconSymbol name="sparkles" size={16} color={colors.background} />
              <Text style={[styles.generateText, { color: colors.background }]}>
                {suggestions ? "Regenerate" : "Generate"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Selected count */}
      {selectedHashtags.length > 0 && (
        <View style={[styles.selectedInfo, { backgroundColor: `${colors.primary}10` }]}>
          <Text style={[styles.selectedText, { color: colors.primary }]}>
            {selectedHashtags.length} hashtag{selectedHashtags.length !== 1 ? "s" : ""} selected
          </Text>
          <TouchableOpacity onPress={() => selectedHashtags.forEach(h => onHashtagToggle(h))}>
            <Text style={[styles.clearText, { color: colors.primary }]}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Suggestions */}
      {suggestions ? (
        <View style={styles.suggestionsContainer}>
          {/* Trending hashtags */}
          {suggestions.trending && suggestions.trending.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol name="flame.fill" size={14} color={colors.warning} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trending</Text>
              </View>
              <View style={styles.chipContainer}>
                {suggestions.trending.map((tag, index) => (
                  <HashtagChip key={`trending-${index}`} tag={tag} category="trending" />
                ))}
              </View>
            </View>
          )}

          {/* Niche hashtags */}
          {suggestions.niche && suggestions.niche.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol name="target" size={14} color={colors.success} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Niche</Text>
              </View>
              <View style={styles.chipContainer}>
                {suggestions.niche.map((tag, index) => (
                  <HashtagChip key={`niche-${index}`} tag={tag} category="niche" />
                ))}
              </View>
            </View>
          )}

          {/* All suggested hashtags */}
          {suggestions.hashtags && suggestions.hashtags.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol name="number" size={14} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Suggested</Text>
              </View>
              <View style={styles.chipContainer}>
                {suggestions.hashtags
                  .filter(tag => 
                    !suggestions.trending?.includes(tag) && 
                    !suggestions.niche?.includes(tag)
                  )
                  .map((tag, index) => (
                    <HashtagChip key={`suggested-${index}`} tag={tag} />
                  ))}
              </View>
            </View>
          )}

          {/* Tips */}
          {suggestions.tips && (
            <View style={[styles.tipsContainer, { backgroundColor: `${colors.primary}10` }]}>
              <IconSymbol name="lightbulb" size={14} color={colors.primary} />
              <Text style={[styles.tipsText, { color: colors.primary }]}>
                {suggestions.tips}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol name="sparkles" size={32} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Tap "Generate" to get AI-powered hashtag suggestions based on your content
          </Text>
        </View>
      )}

      {/* Error state */}
      {suggestMutation.isError && (
        <View style={[styles.errorContainer, { backgroundColor: `${colors.error}15` }]}>
          <IconSymbol name="exclamationmark.triangle" size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            Failed to generate suggestions. Please try again.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  generateText: {
    fontSize: 13,
    fontWeight: "600",
  },
  selectedInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedText: {
    fontSize: 13,
    fontWeight: "500",
  },
  clearText: {
    fontSize: 13,
    fontWeight: "600",
  },
  suggestionsContainer: {
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  tipsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
});
