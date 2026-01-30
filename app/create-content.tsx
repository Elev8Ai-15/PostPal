import { ScrollView, Text, View, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform as RNPlatform } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { HashtagSuggestions } from "@/components/hashtag-suggestions";
import { PlatformPreview } from "@/components/platform-preview";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

type ContentType = "social" | "blog" | "newsletter" | "video";
type SocialPlatform = "instagram" | "twitter" | "linkedin" | "facebook" | "youtube" | "email" | "blog";
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
  { id: "instagram", name: "Instagram", icon: "camera" },
  { id: "twitter", name: "Twitter", icon: "message" },
  { id: "linkedin", name: "LinkedIn", icon: "person.fill" },
  { id: "facebook", name: "Facebook", icon: "person.fill" },
  { id: "youtube", name: "YouTube", icon: "video" },
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

export default function CreateContentScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  
  const [contentType, setContentType] = useState<ContentType>("social");
  const [platform, setPlatform] = useState<SocialPlatform>("instagram");
  const [tone, setTone] = useState<Tone>("professional");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{
    title: string;
    content: string;
    hashtags?: string[];
    callToAction?: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const generateMutation = trpc.ai.generateContent.useMutation();
  const createPostMutation = trpc.posts.create.useMutation();

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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

    if (!isAuthenticated) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to use AI content generation.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/login") },
        ]
      );
      return;
    }

    triggerHaptic();
    setIsGenerating(true);
    setGeneratedContent(null);
    setSelectedHashtags([]);

    try {
      const result = await generateMutation.mutateAsync({
        contentType,
        platform,
        topic: topic.trim(),
        tone,
        keywords: keywords ? keywords.split(",").map(k => k.trim()).filter(Boolean) : undefined,
      });

      setGeneratedContent(result);
      // Auto-select generated hashtags
      if (result.hashtags) {
        setSelectedHashtags(result.hashtags);
      }
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

  const getFullContent = () => {
    if (!generatedContent) return "";
    const hashtagString = selectedHashtags.length > 0 
      ? `\n\n${selectedHashtags.map(h => `#${h}`).join(" ")}`
      : "";
    return generatedContent.content + hashtagString;
  };

  const handleSaveAsDraft = async () => {
    if (!generatedContent) return;

    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to save content.");
      return;
    }

    triggerHaptic();
    setIsSaving(true);

    try {
      await createPostMutation.mutateAsync({
        title: generatedContent.title,
        content: getFullContent(),
        contentType,
        platform,
        aiGenerated: true,
      });

      Alert.alert("Saved!", "Your content has been saved as a draft.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to save content. Please try again.");
    } finally {
      setIsSaving(false);
    }
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
      await createPostMutation.mutateAsync({
        title: generatedContent.title,
        content: getFullContent(),
        contentType,
        platform,
        aiGenerated: true,
      });

      Alert.alert("Sent!", "Your content has been sent for approval.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to send content. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Check if platform supports preview
  const supportsPreview = ["instagram", "twitter", "linkedin", "facebook", "youtube"].includes(platform);

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
              <Text className="text-2xl font-bold text-foreground">Create Content</Text>
            </View>
            <Text className="text-sm text-muted mt-1 ml-8">
              Let AI help you create engaging content
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

          {/* Platform Selection */}
          <View className="px-5 pt-4">
            <Text className="text-sm font-semibold text-foreground mb-3">Platform</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                {PLATFORMS.filter(p => {
                  if (contentType === "social") return ["instagram", "twitter", "linkedin", "facebook"].includes(p.id);
                  if (contentType === "video") return p.id === "youtube";
                  if (contentType === "newsletter") return p.id === "email";
                  if (contentType === "blog") return p.id === "blog";
                  return true;
                }).map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    className={`mr-3 px-4 py-3 rounded-xl border ${
                      platform === p.id 
                        ? "bg-primary border-primary" 
                        : "bg-surface border-border"
                    }`}
                    onPress={() => {
                      triggerHaptic();
                      setPlatform(p.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      <IconSymbol 
                        name={p.icon as any} 
                        size={18} 
                        color={platform === p.id ? colors.background : colors.foreground} 
                      />
                      <Text className={`ml-2 font-medium ${
                        platform === p.id ? "text-background" : "text-foreground"
                      }`}>
                        {p.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
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
            <Text className="text-sm font-semibold text-foreground mb-3">Topic *</Text>
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
                    Generating...
                  </Text>
                </>
              ) : (
                <>
                  <IconSymbol name="sparkles" size={20} color={colors.background} />
                  <Text className="text-lg font-semibold text-background ml-2">
                    Generate with AI
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Generated Content Preview */}
          {generatedContent && (
            <View className="px-5 pt-6">
              <Text className="text-sm font-semibold text-foreground mb-3">Generated Content</Text>
              <View className="bg-surface border border-border rounded-xl p-4">
                <Text className="text-lg font-bold text-foreground mb-2">
                  {generatedContent.title}
                </Text>
                <Text className="text-base text-foreground leading-6 mb-4">
                  {generatedContent.content}
                </Text>
                {selectedHashtags.length > 0 && (
                  <View className="flex-row flex-wrap mb-4">
                    {selectedHashtags.map((tag, index) => (
                      <TouchableOpacity 
                        key={index} 
                        onPress={() => handleHashtagToggle(tag)}
                        activeOpacity={0.7}
                      >
                        <Text className="text-primary mr-2 mb-1">
                          #{tag}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {generatedContent.callToAction && (
                  <View className="bg-primary/10 rounded-lg p-3">
                    <Text className="text-sm font-medium text-primary">
                      CTA: {generatedContent.callToAction}
                    </Text>
                  </View>
                )}
              </View>

              {/* Hashtag Suggestions */}
              {contentType === "social" && (
                <View className="mt-4">
                  <HashtagSuggestions
                    content={generatedContent.content}
                    platform={platform as any}
                    selectedHashtags={selectedHashtags}
                    onHashtagToggle={handleHashtagToggle}
                  />
                </View>
              )}

              {/* Platform Preview Toggle */}
              {supportsPreview && (
                <TouchableOpacity
                  className="mt-4 flex-row items-center justify-center py-3 bg-surface border border-border rounded-xl"
                  onPress={() => {
                    triggerHaptic();
                    setShowPreview(!showPreview);
                  }}
                  activeOpacity={0.7}
                >
                  <IconSymbol 
                    name={showPreview ? "eye" : "eye"} 
                    size={18} 
                    color={colors.primary} 
                  />
                  <Text className="ml-2 font-medium text-primary">
                    {showPreview ? "Hide Platform Preview" : "Show Platform Preview"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Platform Preview */}
              {showPreview && supportsPreview && (
                <View className="mt-4">
                  <PlatformPreview
                    content={getFullContent()}
                    hashtags={selectedHashtags}
                    selectedPlatform={platform as any}
                    onPlatformChange={(p) => setPlatform(p)}
                  />
                </View>
              )}

              {/* Action Buttons */}
              <View className="flex-row mt-4">
                <TouchableOpacity
                  className="flex-1 bg-surface border border-border rounded-xl py-3 items-center mr-2"
                  onPress={handleSaveAsDraft}
                  activeOpacity={0.7}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.foreground} size="small" />
                  ) : (
                    <Text className="font-semibold text-foreground">Save as Draft</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-primary rounded-xl py-3 items-center ml-2"
                  onPress={handleSendForApproval}
                  activeOpacity={0.7}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.background} size="small" />
                  ) : (
                    <Text className="font-semibold text-background">Send for Approval</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom Padding */}
          <View className="h-8" />
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
