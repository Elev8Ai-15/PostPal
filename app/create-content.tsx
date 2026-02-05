import { ScrollView, Text, View, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform as RNPlatform } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { trpc } from "@/lib/trpc";
import { HashtagSuggestions } from "@/components/hashtag-suggestions";
import { PlatformPreview } from "@/components/platform-preview";
import { SubredditSuggestions } from "@/components/subreddit-suggestions";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { postToMultiplePlatforms, getConnectedPlatforms, type SocialPlatform as PostingSocialPlatform } from "@/lib/social-posting";
import { copyAndOpenApp, PLATFORM_CONFIGS, type SocialPlatform as SimplePlatform } from "@/lib/simple-posting";

type ContentType = "social" | "blog" | "newsletter" | "video";
type SocialPlatform = "instagram" | "twitter" | "linkedin" | "facebook" | "youtube" | "tiktok" | "reddit" | "email" | "blog";
type Tone = "professional" | "casual" | "friendly" | "authoritative" | "humorous";

interface ContentTypeOption {
  id: ContentType;
  name: string;
  icon: string;
}

interface PlatformOption {
  id: SocialPlatform;
  name: string;
  icon: string;
  charLimit?: number;
  hashtagLimit?: number;
}

interface ToneOption {
  id: Tone;
  name: string;
}

const CONTENT_TYPES: ContentTypeOption[] = [
  { id: "social", name: "Social Post", icon: "message" },
  { id: "blog", name: "Blog Article", icon: "doc.text" },
  { id: "newsletter", name: "Newsletter", icon: "envelope" },
  { id: "video", name: "Video Script", icon: "video" },
];

const PLATFORMS: PlatformOption[] = [
  { id: "instagram", name: "Instagram", icon: "camera", charLimit: 2200, hashtagLimit: 30 },
  { id: "twitter", name: "Twitter/X", icon: "message", charLimit: 280, hashtagLimit: 5 },
  { id: "linkedin", name: "LinkedIn", icon: "person.fill", charLimit: 3000, hashtagLimit: 5 },
  { id: "facebook", name: "Facebook", icon: "person.fill", charLimit: 63206, hashtagLimit: 10 },
  { id: "youtube", name: "YouTube", icon: "video", charLimit: 5000, hashtagLimit: 15 },
  { id: "tiktok", name: "TikTok", icon: "video", charLimit: 2200, hashtagLimit: 5 },
  { id: "reddit", name: "Reddit", icon: "message", charLimit: 40000, hashtagLimit: 0 },
  { id: "email", name: "Email", icon: "envelope" },
  { id: "blog", name: "Blog", icon: "doc.text" },
];

const TONES: ToneOption[] = [
  { id: "professional", name: "Professional" },
  { id: "casual", name: "Casual" },
  { id: "friendly", name: "Friendly" },
  { id: "authoritative", name: "Authoritative" },
  { id: "humorous", name: "Humorous" },
];

// Platform-specific formatting rules
const PLATFORM_FORMATTING: Record<string, { prefix?: string; suffix?: string; style: string }> = {
  instagram: { style: "Visual-focused with emojis, line breaks for readability" },
  twitter: { style: "Concise, punchy, thread-friendly if needed" },
  linkedin: { style: "Professional, thought-leadership focused, no excessive emojis" },
  facebook: { style: "Conversational, community-focused, can be longer" },
  youtube: { style: "SEO-optimized description with timestamps" },
  tiktok: { style: "Video-first, trending sounds/hooks, Gen-Z friendly, use trending hashtags" },
  reddit: { style: "Authentic, community-first, no promotional language, subreddit-aware" },
};

export default function CreateContentScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { limits, canPost, postLimitReason, canUsePlatforms, hasFeature } = useSubscription();
  
  const [contentType, setContentType] = useState<ContentType>("social");
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(["instagram"]);
  const [tone, setTone] = useState<Tone>("professional");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  // Reddit subreddit targeting
  const [targetSubreddits, setTargetSubreddits] = useState<string[]>([]);
  const [subredditInput, setSubredditInput] = useState("");
  const [suggestedSubreddits, setSuggestedSubreddits] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>("instagram");
  const [generatedContent, setGeneratedContent] = useState<{
    title: string;
    content: string;
    hashtags?: string[];
    callToAction?: string;
    platformVersions?: Record<string, { content: string; hashtags: string[] }>;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<PostingSocialPlatform[]>([]);
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  // Load connected platforms on mount
  const loadConnectedPlatforms = async () => {
    const connected = await getConnectedPlatforms();
    setConnectedPlatforms(connected);
  };

  // Check connected platforms when component mounts
  useEffect(() => {
    loadConnectedPlatforms();
  }, []);

  const generateMutation = trpc.ai.generateContent.useMutation();
  const createPostMutation = trpc.posts.create.useMutation();

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePlatformToggle = (platformId: SocialPlatform) => {
    triggerHaptic();
    setSelectedPlatforms(prev => {
      if (prev.includes(platformId)) {
        // Don't allow deselecting if it's the only one
        if (prev.length === 1) return prev;
        return prev.filter(p => p !== platformId);
      } else {
        // Check subscription limit
        if (!canUsePlatforms(prev.length + 1)) {
          Alert.alert(
            "Platform Limit Reached",
            `Your plan allows ${limits.maxPlatforms} platform(s). Upgrade to use more!`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Upgrade", onPress: () => router.push("/subscription") },
            ]
          );
          return prev;
        }
        return [...prev, platformId];
      }
    });
  };

  const handleSelectAllPlatforms = () => {
    triggerHaptic();
    const availablePlatforms = getAvailablePlatforms();
    if (selectedPlatforms.length === availablePlatforms.length || selectedPlatforms.length >= limits.maxPlatforms) {
      // If all selected or at limit, select only the first one
      setSelectedPlatforms([availablePlatforms[0].id]);
    } else {
      // Select up to the subscription limit
      const maxToSelect = Math.min(availablePlatforms.length, limits.maxPlatforms);
      setSelectedPlatforms(availablePlatforms.slice(0, maxToSelect).map(p => p.id));
      
      if (availablePlatforms.length > limits.maxPlatforms) {
        Alert.alert(
          "Platform Limit",
          `Your plan allows ${limits.maxPlatforms} platform(s). Upgrade for more!`,
          [
            { text: "OK" },
            { text: "Upgrade", onPress: () => router.push("/subscription") },
          ]
        );
      }
    }
  };

  const getAvailablePlatforms = () => {
    return PLATFORMS.filter(p => {
      if (contentType === "social") return ["instagram", "twitter", "linkedin", "facebook", "reddit"].includes(p.id);
      if (contentType === "video") return p.id === "youtube";
      if (contentType === "newsletter") return p.id === "email";
      if (contentType === "blog") return p.id === "blog";
      return true;
    });
  };

  const handleHashtagToggle = (hashtag: string) => {
    triggerHaptic();
    setSelectedHashtags(prev => 
      prev.includes(hashtag) 
        ? prev.filter(h => h !== hashtag)
        : [...prev, hashtag]
    );
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      Alert.alert("Topic Required", "Please enter a topic for your content.");
      return;
    }

    if (selectedPlatforms.length === 0) {
      Alert.alert("Platform Required", "Please select at least one platform.");
      return;
    }

    // Guest users can generate content - it's saved locally
    // Authentication only required for cloud sync features

    triggerHaptic();
    setIsGenerating(true);
    setGeneratedContent(null);
    setSelectedHashtags([]);

    try {
      // Generate content for each selected platform
      const platformVersions: Record<string, { content: string; hashtags: string[] }> = {};
      
      for (const platformId of selectedPlatforms) {
        const platformInfo = PLATFORMS.find(p => p.id === platformId);
        const formatting = PLATFORM_FORMATTING[platformId];
        
        const result = await generateMutation.mutateAsync({
          contentType,
          platform: platformId,
          topic: topic.trim(),
          tone,
          keywords: keywords ? keywords.split(",").map(k => k.trim()).filter(Boolean) : undefined,
        });

        platformVersions[platformId] = {
          content: result.content,
          hashtags: result.hashtags || [],
        };
      }

      // Use the first platform's content as the main display
      const firstPlatform = selectedPlatforms[0];
      const firstResult = platformVersions[firstPlatform];
      
      setGeneratedContent({
        title: `Campaign: ${topic.trim().substring(0, 50)}`,
        content: firstResult.content,
        hashtags: firstResult.hashtags,
        platformVersions,
      });
      
      // Auto-select generated hashtags from first platform
      if (firstResult.hashtags) {
        setSelectedHashtags(firstResult.hashtags);
      }
      
      setPreviewPlatform(firstPlatform);
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Generation error:", error);
      Alert.alert("Error", "Failed to generate content. Please try again.");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const getContentForPlatform = (platformId: SocialPlatform) => {
    if (!generatedContent?.platformVersions) return generatedContent?.content || "";
    return generatedContent.platformVersions[platformId]?.content || generatedContent.content;
  };

  const getHashtagsForPlatform = (platformId: SocialPlatform) => {
    if (!generatedContent?.platformVersions) return selectedHashtags;
    return generatedContent.platformVersions[platformId]?.hashtags || selectedHashtags;
  };

  const getFullContent = (platformId?: SocialPlatform) => {
    const pid = platformId || selectedPlatforms[0];
    const content = getContentForPlatform(pid);
    const hashtags = getHashtagsForPlatform(pid);
    
    // Reddit doesn't use hashtags
    if (pid === "reddit") return content;
    
    const hashtagString = hashtags.length > 0 
      ? `\n\n${hashtags.map(h => `#${h}`).join(" ")}`
      : "";
    return content + hashtagString;
  };

  // Save content locally for guest users
  const saveLocally = async () => {
    if (!generatedContent) return;
    
    try {
      // Get existing local drafts
      const existingDrafts = await AsyncStorage.getItem("postpal_local_drafts");
      const drafts = existingDrafts ? JSON.parse(existingDrafts) : [];
      
      // Add new drafts for each platform
      for (const platformId of selectedPlatforms) {
        const newDraft = {
          id: `local_${Date.now()}_${platformId}`,
          title: generatedContent.title,
          content: getFullContent(platformId),
          contentType,
          platform: platformId,
          createdAt: new Date().toISOString(),
          aiGenerated: true,
        };
        drafts.push(newDraft);
      }
      
      await AsyncStorage.setItem("postpal_local_drafts", JSON.stringify(drafts));
      
      const platformCount = selectedPlatforms.length;
      Alert.alert(
        "Saved Locally!",
        `Your content has been saved to this device (${platformCount} draft${platformCount > 1 ? "s" : ""}). Sign in anytime to sync to cloud.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to save locally. Please try again.");
    }
  };

  const handleSaveAsDraft = async () => {
    if (!generatedContent) return;

    // For guest users, show option to save locally or sign in
    if (!isAuthenticated) {
      Alert.alert(
        "Save Options",
        "Sign in to save to cloud, or continue as guest to save locally on this device.",
        [
          { text: "Continue as Guest", onPress: () => saveLocally() },
          { text: "Sign In", onPress: () => router.push("/login") },
        ]
      );
      return;
    }

    // Check post limit
    if (!canPost) {
      Alert.alert(
        "Post Limit Reached",
        postLimitReason || "You've reached your weekly post limit. Upgrade to post more!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/subscription") },
        ]
      );
      return;
    }

    triggerHaptic();
    setIsSaving(true);

    try {
      // Save a post for each selected platform
      for (const platformId of selectedPlatforms) {
        await createPostMutation.mutateAsync({
          title: generatedContent.title,
          content: getFullContent(platformId),
          contentType,
          platform: platformId,
          aiGenerated: true,
        });
      }

      const platformCount = selectedPlatforms.length;
      Alert.alert(
        "Saved!", 
        `Your content has been saved as ${platformCount} draft${platformCount > 1 ? "s" : ""} (one for each platform).`, 
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to save content. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostToAllPlatforms = async () => {
    if (!generatedContent) return;

    // For guest users, save locally instead
    if (!isAuthenticated) {
      Alert.alert(
        "Create Campaign",
        "Sign in to schedule posts to your connected accounts, or save locally for now.",
        [
          { text: "Save Locally", onPress: () => saveLocally() },
          { text: "Sign In", onPress: () => router.push("/login") },
        ]
      );
      return;
    }

    // Check post limit
    if (!canPost) {
      Alert.alert(
        "Post Limit Reached",
        postLimitReason || "You've reached your weekly post limit. Upgrade to post more!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/subscription") },
        ]
      );
      return;
    }

    triggerHaptic();
    setIsSaving(true);

    try {
      // Create and schedule posts for all selected platforms
      const results: string[] = [];
      
      for (const platformId of selectedPlatforms) {
        await createPostMutation.mutateAsync({
          title: generatedContent.title,
          content: getFullContent(platformId),
          contentType,
          platform: platformId,
          aiGenerated: true,
        });
        results.push(PLATFORMS.find(p => p.id === platformId)?.name || platformId);
      }

      Alert.alert(
        "Campaign Created!", 
        `Your content has been prepared for ${results.join(", ")}. Go to the Calendar to schedule posting times.`,
        [{ text: "View Calendar", onPress: () => router.push("/(tabs)/calendar") }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to create campaign. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostNow = async () => {
    if (!generatedContent) return;

    // Check which selected platforms are connected
    const platformsToPost = selectedPlatforms.filter(p => 
      connectedPlatforms.includes(p as PostingSocialPlatform)
    ) as PostingSocialPlatform[];

    if (platformsToPost.length === 0) {
      Alert.alert(
        "No Connected Accounts",
        "Please connect your social accounts first to post directly.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Connect Accounts", onPress: () => router.push("/social-accounts") },
        ]
      );
      return;
    }

    // Show confirmation with platforms that will be posted to
    const platformNames = platformsToPost.map(p => 
      PLATFORMS.find(pl => pl.id === p)?.name || p
    ).join(", ");

    Alert.alert(
      "Post Now",
      `This will immediately post to: ${platformNames}\n\nAre you sure?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Post Now",
          style: "default",
          onPress: async () => {
            triggerHaptic();
            setIsPosting(true);

            try {
              const result = await postToMultiplePlatforms(
                platformsToPost,
                {
                  text: generatedContent.content,
                  title: generatedContent.title,
                  hashtags: selectedHashtags,
                  subreddit: targetSubreddits[0],
                }
              );

              if (result.success) {
                if (Platform.OS !== "web") {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                const successPlatforms = result.results
                  .filter(r => r.success)
                  .map(r => PLATFORMS.find(p => p.id === r.platform)?.name || r.platform)
                  .join(", ");

                Alert.alert(
                  "Posted!",
                  `Successfully posted to: ${successPlatforms}${result.failureCount > 0 ? `\n\n${result.failureCount} platform(s) failed.` : ""}`,
                  [{ text: "OK", onPress: () => router.back() }]
                );
              } else {
                Alert.alert("Error", "Failed to post. Please try again.");
              }
            } catch (error) {
              console.error("Post error:", error);
              Alert.alert("Error", "Failed to post. Please try again.");
            } finally {
              setIsPosting(false);
            }
          },
        },
      ]
    );
  };

  const handleSendForApproval = async () => {
    if (!generatedContent) return;

    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to send content for approval.");
      return;
    }

    triggerHaptic();
    setIsSaving(true);

    try {
      for (const platformId of selectedPlatforms) {
        await createPostMutation.mutateAsync({
          title: generatedContent.title,
          content: getFullContent(platformId),
          contentType,
          platform: platformId,
          aiGenerated: true,
        });
      }

      const platformCount = selectedPlatforms.length;
      Alert.alert(
        "Sent!", 
        `${platformCount} post${platformCount > 1 ? "s have" : " has"} been sent for approval.`, 
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to send content. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const availablePlatforms = getAvailablePlatforms();
  const allPlatformsSelected = selectedPlatforms.length === availablePlatforms.length;

  // Check if any selected platform supports preview
  const supportsPreview = selectedPlatforms.some(p => 
    ["instagram", "twitter", "linkedin", "facebook", "youtube", "reddit"].includes(p)
  );

  return (
    <ScreenContainer>
      <KeyboardAvoidingView 
        behavior={RNPlatform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView 
          className="flex-1" 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="px-5 pt-4 pb-2">
            <View className="flex-row items-center mb-2">
              <TouchableOpacity 
                onPress={() => router.back()} 
                className="mr-3 p-1"
                activeOpacity={0.7}
              >
                <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-foreground">Create Campaign</Text>
            </View>
            <Text className="text-sm text-muted mt-1 ml-8">
              Generate content for multiple platforms at once
            </Text>
          </View>

          {/* Content Type Selection */}
          <View className="px-5 pt-4">
            <Text className="text-sm font-semibold text-foreground mb-3">Content Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                {CONTENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    className={`mr-3 px-4 py-3 rounded-xl border ${
                      contentType === type.id 
                        ? "bg-primary border-primary" 
                        : "bg-surface border-border"
                    }`}
                    onPress={() => {
                      triggerHaptic();
                      setContentType(type.id);
                      // Reset platform selection when content type changes
                      const newAvailable = PLATFORMS.filter(p => {
                        if (type.id === "social") return ["instagram", "twitter", "linkedin", "facebook", "reddit"].includes(p.id);
                        if (type.id === "video") return p.id === "youtube";
                        if (type.id === "newsletter") return p.id === "email";
                        if (type.id === "blog") return p.id === "blog";
                        return true;
                      });
                      setSelectedPlatforms([newAvailable[0]?.id || "instagram"]);
                    }}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      <IconSymbol 
                        name={type.icon as any} 
                        size={18} 
                        color={contentType === type.id ? colors.background : colors.foreground} 
                      />
                      <Text className={`ml-2 font-medium ${
                        contentType === type.id ? "text-background" : "text-foreground"
                      }`}>
                        {type.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Platform Selection - Multi-Select */}
          <View className="px-5 pt-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-semibold text-foreground">
                Platforms ({selectedPlatforms.length} selected)
              </Text>
              <TouchableOpacity
                onPress={handleSelectAllPlatforms}
                className="px-3 py-1 rounded-full bg-surface border border-border"
                activeOpacity={0.7}
              >
                <Text className="text-xs font-medium text-primary">
                  {allPlatformsSelected ? "Deselect All" : "Select All"}
                </Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap">
              {availablePlatforms.map((p) => {
                const isSelected = selectedPlatforms.includes(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    className={`mr-2 mb-2 px-4 py-3 rounded-xl border ${
                      isSelected 
                        ? "bg-primary border-primary" 
                        : "bg-surface border-border"
                    }`}
                    onPress={() => handlePlatformToggle(p.id)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      <IconSymbol 
                        name={p.icon as any} 
                        size={18} 
                        color={isSelected ? colors.background : colors.foreground} 
                      />
                      <Text className={`ml-2 font-medium ${
                        isSelected ? "text-background" : "text-foreground"
                      }`}>
                        {p.name}
                      </Text>
                      {isSelected && (
                        <View className="ml-2 w-5 h-5 rounded-full bg-background/20 items-center justify-center">
                          <IconSymbol name="checkmark" size={12} color={colors.background} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedPlatforms.length > 1 && (
              <Text className="text-xs text-muted mt-2">
                Content will be optimized for each platform automatically
              </Text>
            )}
          </View>

          {/* Tone Selection */}
          <View className="px-5 pt-4">
            <Text className="text-sm font-semibold text-foreground mb-3">Tone</Text>
            <View className="flex-row flex-wrap">
              {TONES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  className={`mr-2 mb-2 px-4 py-2 rounded-full border ${
                    tone === t.id 
                      ? "bg-primary border-primary" 
                      : "bg-surface border-border"
                  }`}
                  onPress={() => {
                    triggerHaptic();
                    setTone(t.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Text className={`font-medium ${
                    tone === t.id ? "text-background" : "text-foreground"
                  }`}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Topic Input */}
          <View className="px-5 pt-4">
            <Text className="text-sm font-semibold text-foreground mb-3">Campaign Topic *</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
              placeholder="What should the content be about?"
              placeholderTextColor={colors.muted}
              value={topic}
              onChangeText={setTopic}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: "top", color: colors.foreground }}
            />
          </View>

          {/* Keywords Input */}
          <View className="px-5 pt-4">
            <Text className="text-sm font-semibold text-foreground mb-3">Keywords (optional)</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
              placeholder="marketing, growth, engagement (comma separated)"
              placeholderTextColor={colors.muted}
              value={keywords}
              onChangeText={setKeywords}
              style={{ color: colors.foreground }}
            />
          </View>

          {/* Generate Button */}
          <View className="px-5 pt-6">
            <TouchableOpacity
              className="bg-primary rounded-xl py-4 items-center flex-row justify-center"
              onPress={handleGenerate}
              activeOpacity={0.8}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <ActivityIndicator color={colors.background} />
                  <Text className="text-lg font-semibold text-background ml-2">
                    Generating for {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? "s" : ""}...
                  </Text>
                </>
              ) : (
                <>
                  <IconSymbol name="sparkles" size={22} color={colors.background} />
                  <Text className="text-lg font-semibold text-background ml-2">
                    Generate Campaign
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Generated Content */}
          {generatedContent && (
            <View className="px-5 pt-6">
              <View className="bg-surface rounded-2xl p-4 border border-border">
                <Text className="text-lg font-bold text-foreground mb-2">
                  {generatedContent.title}
                </Text>
                
                {/* Platform Tabs for Preview */}
                {selectedPlatforms.length > 1 && (
                  <View className="mb-4">
                    <Text className="text-xs text-muted mb-2">Preview by platform:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View className="flex-row">
                        {selectedPlatforms.map((pid) => {
                          const platform = PLATFORMS.find(p => p.id === pid);
                          return (
                            <TouchableOpacity
                              key={pid}
                              className={`mr-2 px-3 py-1.5 rounded-full ${
                                previewPlatform === pid ? "bg-primary" : "bg-background"
                              }`}
                              onPress={() => {
                                triggerHaptic();
                                setPreviewPlatform(pid);
                              }}
                            >
                              <Text className={`text-xs font-medium ${
                                previewPlatform === pid ? "text-background" : "text-foreground"
                              }`}>
                                {platform?.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}
                
                {/* Content with expand/collapse */}
                <TouchableOpacity 
                  onPress={() => {
                    triggerHaptic();
                    setIsContentExpanded(!isContentExpanded);
                  }}
                  activeOpacity={0.8}
                >
                  <Text 
                    className="text-sm text-foreground leading-relaxed"
                    numberOfLines={isContentExpanded ? undefined : 6}
                  >
                    {getContentForPlatform(previewPlatform)}
                  </Text>
                  {getContentForPlatform(previewPlatform).length > 300 && (
                    <View className="flex-row items-center justify-center mt-2 py-2">
                      <Text className="text-xs text-primary font-medium">
                        {isContentExpanded ? "Show Less" : "Read Full Content"}
                      </Text>
                      <IconSymbol 
                        name={isContentExpanded ? "chevron.up" : "chevron.down"} 
                        size={14} 
                        color={colors.primary} 
                      />
                    </View>
                  )}
                </TouchableOpacity>
                
                {/* Hashtags (not for Reddit) */}
                {previewPlatform !== "reddit" && getHashtagsForPlatform(previewPlatform).length > 0 && (
                  <View className="mt-3 flex-row flex-wrap">
                    {getHashtagsForPlatform(previewPlatform).map((tag, index) => (
                      <Text key={index} className="text-sm text-primary mr-2">
                        #{tag}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Platform-specific note */}
                <View className="mt-3 pt-3 border-t border-border">
                  <Text className="text-xs text-muted">
                    {PLATFORM_FORMATTING[previewPlatform]?.style || "Standard formatting"}
                  </Text>
                </View>
              </View>

              {/* Hashtag Suggestions */}
              {previewPlatform !== "reddit" && ["instagram", "twitter", "linkedin", "facebook", "youtube", "tiktok"].includes(previewPlatform) && (
                <HashtagSuggestions
                  topic={topic}
                  platform={previewPlatform as "instagram" | "twitter" | "linkedin" | "facebook" | "youtube" | "tiktok"}
                  selectedHashtags={getHashtagsForPlatform(previewPlatform)}
                  onToggleHashtag={handleHashtagToggle}
                />
              )}

              {/* Reddit Subreddit Targeting */}
              {selectedPlatforms.includes("reddit") && (
                <SubredditSuggestions
                  topic={topic}
                  content={generatedContent?.content}
                  selectedSubreddits={targetSubreddits}
                  onToggleSubreddit={(subreddit) => {
                    setTargetSubreddits(prev =>
                      prev.includes(subreddit)
                        ? prev.filter(s => s !== subreddit)
                        : [...prev, subreddit]
                    );
                  }}
                  onSubredditInput={setSubredditInput}
                />
              )}

              {/* Platform Preview Toggle */}
              {supportsPreview && (
                <TouchableOpacity
                  className="mt-4 flex-row items-center justify-center py-3 bg-surface rounded-xl border border-border"
                  onPress={() => {
                    triggerHaptic();
                    setShowPreview(!showPreview);
                  }}
                  activeOpacity={0.7}
                >
                  <IconSymbol 
                    name={showPreview ? "eye.slash" : "eye"} 
                    size={18} 
                    color={colors.primary} 
                  />
                  <Text className="ml-2 font-medium text-primary">
                    {showPreview ? "Hide Preview" : "Show Platform Preview"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Platform Preview */}
              {showPreview && supportsPreview && (
                <PlatformPreview
                  selectedPlatform={previewPlatform as "instagram" | "twitter" | "linkedin" | "facebook" | "youtube" | "reddit"}
                  content={getContentForPlatform(previewPlatform)}
                  hashtags={previewPlatform !== "reddit" ? getHashtagsForPlatform(previewPlatform) : []}
                />
              )}

              {/* Action Buttons */}
              <View className="mt-4 flex-row">
                <TouchableOpacity
                  className="flex-1 mr-2 py-3 rounded-xl border border-border items-center"
                  onPress={handleSaveAsDraft}
                  activeOpacity={0.7}
                  disabled={isSaving || isPosting}
                >
                  <Text className="font-medium text-foreground">Save as Draft</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 ml-2 py-3 rounded-xl bg-primary items-center flex-row justify-center"
                  onPress={() => {
                    triggerHaptic();
                    // Navigate to calendar with generated content
                    router.push({
                      pathname: "/(tabs)/calendar",
                      params: {
                        scheduleContent: "true",
                        title: generatedContent?.title || "",
                        content: getFullContent(previewPlatform),
                        contentType: contentType,
                        platform: previewPlatform,
                      }
                    });
                  }}
                  activeOpacity={0.8}
                  disabled={isSaving || isPosting}
                >
                  <IconSymbol name="calendar" size={18} color={colors.background} />
                  <Text className="font-medium text-background ml-2">
                    Schedule to Calendar
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Post Now Button */}
              {connectedPlatforms.length > 0 && (
                <TouchableOpacity
                  className="mt-3 py-3 rounded-xl bg-success items-center flex-row justify-center"
                  onPress={handlePostNow}
                  activeOpacity={0.8}
                  disabled={isSaving || isPosting}
                >
                  {isPosting ? (
                    <ActivityIndicator color={colors.background} size="small" />
                  ) : (
                    <>
                      <IconSymbol name="paperplane.fill" size={18} color={colors.background} />
                      <Text className="font-semibold text-background ml-2">
                        Post Now to {selectedPlatforms.filter(p => connectedPlatforms.includes(p as PostingSocialPlatform)).length} Platform{selectedPlatforms.filter(p => connectedPlatforms.includes(p as PostingSocialPlatform)).length !== 1 ? "s" : ""}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Quick Post Buttons - Copy & Open App */}
              <View className="mt-4">
                <Text className="text-sm font-semibold text-foreground mb-3">Quick Post (Copy & Open App)</Text>
                <View className="flex-row flex-wrap">
                  {selectedPlatforms.map((platformId) => {
                    const simplePlatformId = platformId as SimplePlatform;
                    const config = PLATFORM_CONFIGS[simplePlatformId];
                    if (!config) return null;
                    return (
                      <TouchableOpacity
                        key={platformId}
                        className="mr-2 mb-2 px-4 py-3 rounded-xl bg-surface border border-border flex-row items-center"
                        onPress={async () => {
                          triggerHaptic();
                          const content = getFullContent(platformId);
                          const result = await copyAndOpenApp(simplePlatformId, content);
                          if (result.success) {
                            Alert.alert("Content Copied!", result.message);
                          } else {
                            Alert.alert("Error", result.message);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View 
                          className="w-8 h-8 rounded-full items-center justify-center mr-2"
                          style={{ backgroundColor: config.color + '20' }}
                        >
                          <IconSymbol name={config.icon as any} size={16} color={config.color} />
                        </View>
                        <Text className="font-medium text-foreground">{config.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text className="text-xs text-muted mt-2">
                  Tap a platform to copy content and open the app
                </Text>
              </View>

              {/* Send for Approval */}
              <TouchableOpacity
                className="mt-3 py-3 rounded-xl border border-primary items-center"
                onPress={handleSendForApproval}
                activeOpacity={0.7}
                disabled={isSaving}
              >
                <Text className="font-medium text-primary">Send for Approval</Text>
              </TouchableOpacity>

              {/* Multi-platform summary */}
              {selectedPlatforms.length > 1 && (
                <View className="mt-4 p-3 bg-success/10 rounded-xl">
                  <Text className="text-sm text-success font-medium text-center">
                    This campaign will post to {selectedPlatforms.length} platforms with optimized formatting for each
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Bottom Padding */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});
