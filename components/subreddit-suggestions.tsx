import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from "react-native";
import { useState } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

interface SubredditSuggestion {
  name: string;
  subscribers: string;
  relevance: "high" | "medium" | "low";
  reason: string;
  tips: string;
}

interface SubredditSuggestionsProps {
  topic: string;
  content?: string;
  selectedSubreddits: string[];
  onToggleSubreddit: (subreddit: string) => void;
  onSubredditInput?: (input: string) => void;
}

const relevanceColors: Record<string, { bg: string; text: string }> = {
  high: { bg: "#22C55E20", text: "#22C55E" },
  medium: { bg: "#F59E0B20", text: "#F59E0B" },
  low: { bg: "#9CA3AF20", text: "#9CA3AF" },
};

export function SubredditSuggestions({
  topic,
  content,
  selectedSubreddits,
  onToggleSubreddit,
  onSubredditInput,
}: SubredditSuggestionsProps) {
  const colors = useColors();
  const [manualInput, setManualInput] = useState("");
  const [suggestions, setSuggestions] = useState<SubredditSuggestion[]>([]);
  const [generalTips, setGeneralTips] = useState<string>("");
  const [showTips, setShowTips] = useState(false);

  const suggestMutation = trpc.ai.suggestSubreddits.useMutation({
    onSuccess: (data) => {
      if (data.subreddits) {
        setSuggestions(data.subreddits);
      }
      if (data.generalTips) {
        setGeneralTips(data.generalTips);
      }
    },
  });

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleGetSuggestions = () => {
    if (!topic.trim()) return;
    triggerHaptic();
    suggestMutation.mutate({
      topic: topic.trim(),
      content: content?.trim(),
    });
  };

  const handleAddManualSubreddit = () => {
    if (!manualInput.trim()) return;
    const subredditName = manualInput.trim().replace(/^r\//, "");
    if (!selectedSubreddits.includes(subredditName)) {
      onToggleSubreddit(subredditName);
    }
    setManualInput("");
    onSubredditInput?.("");
  };

  const handleToggle = (subreddit: string) => {
    triggerHaptic();
    onToggleSubreddit(subreddit);
  };

  return (
    <View className="bg-surface rounded-xl p-4 border border-border">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full bg-[#FF4500] items-center justify-center">
            <IconSymbol name="message" size={16} color="#FFFFFF" />
          </View>
          <Text className="text-base font-semibold text-foreground">Reddit Targeting</Text>
        </View>
        <TouchableOpacity
          className="bg-primary/10 px-3 py-1.5 rounded-lg"
          onPress={handleGetSuggestions}
          disabled={suggestMutation.isPending || !topic.trim()}
          style={{ opacity: !topic.trim() ? 0.5 : 1 }}
        >
          {suggestMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text className="text-sm font-medium text-primary">Get Suggestions</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Manual Input */}
      <View className="flex-row gap-2 mb-3">
        <TextInput
          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground"
          placeholder="Enter subreddit (e.g., technology)"
          placeholderTextColor={colors.muted}
          value={manualInput}
          onChangeText={(text) => {
            setManualInput(text);
            onSubredditInput?.(text);
          }}
          onSubmitEditing={handleAddManualSubreddit}
          returnKeyType="done"
          autoCapitalize="none"
        />
        <TouchableOpacity
          className="bg-primary px-4 rounded-lg items-center justify-center"
          onPress={handleAddManualSubreddit}
          disabled={!manualInput.trim()}
          style={{ opacity: !manualInput.trim() ? 0.5 : 1 }}
        >
          <Text className="text-white font-medium">Add</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Subreddits */}
      {selectedSubreddits.length > 0 && (
        <View className="mb-3">
          <Text className="text-xs text-muted mb-2">Selected ({selectedSubreddits.length})</Text>
          <View className="flex-row flex-wrap gap-2">
            {selectedSubreddits.map((subreddit) => (
              <TouchableOpacity
                key={subreddit}
                className="flex-row items-center bg-primary px-3 py-1.5 rounded-full"
                onPress={() => handleToggle(subreddit)}
              >
                <Text className="text-white text-sm mr-1">r/{subreddit}</Text>
                <IconSymbol name="xmark" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <View>
          <Text className="text-xs text-muted mb-2">AI Suggestions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <View className="flex-row gap-2">
              {suggestions.map((suggestion) => {
                const isSelected = selectedSubreddits.includes(suggestion.name);
                const relevanceStyle = relevanceColors[suggestion.relevance] || relevanceColors.medium;
                
                return (
                  <TouchableOpacity
                    key={suggestion.name}
                    className="bg-background border rounded-xl p-3 min-w-[160px]"
                    style={{
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary + "10" : colors.background,
                    }}
                    onPress={() => handleToggle(suggestion.name)}
                  >
                    <View className="flex-row items-center justify-between mb-1">
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: isSelected ? colors.primary : colors.foreground }}
                      >
                        r/{suggestion.name}
                      </Text>
                      {isSelected && (
                        <IconSymbol name="checkmark.circle.fill" size={16} color={colors.primary} />
                      )}
                    </View>
                    <Text className="text-xs text-muted mb-1">{suggestion.subscribers}</Text>
                    <View
                      className="self-start px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: relevanceStyle.bg }}
                    >
                      <Text className="text-xs font-medium" style={{ color: relevanceStyle.text }}>
                        {suggestion.relevance}
                      </Text>
                    </View>
                    <Text className="text-xs text-muted mt-2" numberOfLines={2}>
                      {suggestion.reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* General Tips Toggle */}
          {generalTips && (
            <TouchableOpacity
              className="flex-row items-center justify-between py-2 border-t border-border mt-2"
              onPress={() => setShowTips(!showTips)}
            >
              <Text className="text-sm font-medium text-foreground">Reddit Posting Tips</Text>
              <IconSymbol
                name={showTips ? "chevron.up" : "chevron.down"}
                size={16}
                color={colors.muted}
              />
            </TouchableOpacity>
          )}
          {showTips && generalTips && (
            <View className="bg-background rounded-lg p-3 mt-2">
              <Text className="text-sm text-muted leading-5">{generalTips}</Text>
            </View>
          )}
        </View>
      )}

      {/* Empty State */}
      {suggestions.length === 0 && selectedSubreddits.length === 0 && (
        <View className="items-center py-4">
          <Text className="text-sm text-muted text-center">
            Enter a topic and tap "Get Suggestions" to find relevant subreddits
          </Text>
        </View>
      )}
    </View>
  );
}
