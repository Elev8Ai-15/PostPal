import { ScrollView, Text, View, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { useState, useEffect, useRef } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { postToMultiplePlatforms, getConnectedPlatforms, type SocialPlatform as PostingSocialPlatform } from "@/lib/social-posting";
import { copyAndOpenApp, PLATFORM_CONFIGS, type SocialPlatform as SimplePlatform } from "@/lib/simple-posting";
import { logActivity, incrementStat, logQuickPost } from "@/lib/content-store";
import { useBrand } from "@/hooks/use-brand";
import { isApiConfigured, postText, type MultiPostResult } from "@/lib/upload-post-api";

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

// Local content generation for guest users (no server needed)
function generateLocalContent(params: {
  contentType: ContentType;
  platform: string;
  topic: string;
  tone: string;
  keywords: string[];
  formatting: string;
  charLimit?: number;
  brandName?: string;
  brandTagline?: string;
}): { content: string; hashtags: string[]; title: string; callToAction: string } {
  const { contentType, platform, topic, tone, keywords, charLimit, brandName, brandTagline } = params;
  const keywordStr = keywords.length > 0 ? keywords.join(", ") : "";
  const brandSuffix = brandName ? `\n\n— ${brandName}${brandTagline ? ` | ${brandTagline}` : ""}` : "";
  
  const toneStyles: Record<string, { opener: string; style: string }> = {
    professional: { opener: "Here's what you need to know about", style: "data-driven and insightful" },
    casual: { opener: "Let's talk about", style: "relaxed and approachable" },
    friendly: { opener: "Hey! Let's dive into", style: "warm and inviting" },
    authoritative: { opener: "The definitive guide to", style: "expert and commanding" },
    humorous: { opener: "Plot twist:", style: "witty and entertaining" },
  };
  
  const ts = toneStyles[tone] || toneStyles.professional;
  
  const platformContent: Record<string, () => { content: string; hashtags: string[] }> = {
    instagram: () => ({
      content: `${ts.opener} ${topic}! \u2728\n\n${keywordStr ? `When it comes to ${keywordStr}, ` : ""}This is a game-changer for anyone looking to level up.\n\n\u2714\uFE0F Key insight: ${topic} is transforming how we think about success\n\u2714\uFE0F Pro tip: Start small, think big, and stay consistent\n\u2714\uFE0F Remember: Every expert was once a beginner\n\nDouble tap if you agree! \u{1F44D} Drop a \u{1F525} in the comments if you're ready to take action.\n\n#${topic.replace(/\s+/g, "")} #ContentCreator #GrowthMindset`,
      hashtags: [topic.replace(/\s+/g, ""), "ContentCreator", "GrowthMindset", "DigitalMarketing", "Success", ...keywords.map(k => k.replace(/\s+/g, ""))].slice(0, 15),
    }),
    twitter: () => ({
      content: `${ts.opener} ${topic}:\n\n${keywordStr ? `${keywordStr} are reshaping the landscape. ` : ""}Here's the thing most people miss \u{1F447}\n\nThe key to success isn't just knowing about ${topic} \u2014 it's taking action on it TODAY.\n\nRT if you agree \u{1F504}`,
      hashtags: [topic.replace(/\s+/g, ""), ...keywords.map(k => k.replace(/\s+/g, ""))].slice(0, 5),
    }),
    linkedin: () => ({
      content: `${ts.opener} ${topic}.\n\n${keywordStr ? `In the world of ${keywordStr}, ` : ""}I've been reflecting on how ${topic} is reshaping our industry.\n\nHere are 3 key takeaways:\n\n1. Innovation starts with understanding the fundamentals\n2. The most successful professionals embrace continuous learning\n3. Collaboration and authentic networking drive real results\n\nWhat's your experience with ${topic}? I'd love to hear your perspective in the comments.\n\n#${topic.replace(/\s+/g, "")} #ProfessionalDevelopment #ThoughtLeadership`,
      hashtags: [topic.replace(/\s+/g, ""), "ProfessionalDevelopment", "ThoughtLeadership", "Innovation", ...keywords.map(k => k.replace(/\s+/g, ""))].slice(0, 5),
    }),
    facebook: () => ({
      content: `${ts.opener} ${topic}! \u{1F680}\n\n${keywordStr ? `If you're interested in ${keywordStr}, ` : ""}This is something I'm really passionate about and I wanted to share my thoughts with you all.\n\n${topic} has the power to transform the way we approach our goals. Whether you're just starting out or you're a seasoned pro, there's always something new to learn.\n\nWhat do you think? Share your thoughts below! \u{1F447}\n\nLike & Share if this resonates with you! \u2764\uFE0F`,
      hashtags: [topic.replace(/\s+/g, ""), ...keywords.map(k => k.replace(/\s+/g, ""))].slice(0, 5),
    }),
    tiktok: () => ({
      content: `\u{1F6A8} STOP SCROLLING \u{1F6A8}\n\n${ts.opener} ${topic}...\n\n${keywordStr ? `${keywordStr} are about to blow up and here's why \u{1F447}` : "Here's what nobody is telling you \u{1F447}"}\n\nThis is the sign you've been waiting for. ${topic} is YOUR moment.\n\nFollow for more \u{1F525}\n\n#${topic.replace(/\s+/g, "")} #FYP #Viral #LearnOnTikTok`,
      hashtags: [topic.replace(/\s+/g, ""), "FYP", "Viral", "LearnOnTikTok", "Trending", ...keywords.map(k => k.replace(/\s+/g, ""))].slice(0, 8),
    }),
    youtube: () => ({
      content: `${topic} - The Complete Guide\n\n${keywordStr ? `Covering: ${keywordStr}\n\n` : ""}In this video, we dive deep into ${topic} and break down everything you need to know.\n\n\u23F0 Timestamps:\n0:00 - Introduction\n1:30 - Why ${topic} matters\n3:00 - Key strategies\n5:00 - Common mistakes to avoid\n7:00 - Action steps\n9:00 - Final thoughts\n\n\u{1F514} Subscribe and hit the bell for more content like this!\n\n#${topic.replace(/\s+/g, "")} #YouTube`,
      hashtags: [topic.replace(/\s+/g, ""), "YouTube", ...keywords.map(k => k.replace(/\s+/g, ""))].slice(0, 10),
    }),
    reddit: () => ({
      content: `${topic} - Thoughts and Discussion\n\n${keywordStr ? `I've been looking into ${keywordStr} and ` : ""}I wanted to share some thoughts on ${topic} and get the community's perspective.\n\nHere's what I've found:\n\n- The landscape is changing rapidly\n- There are some really interesting developments happening\n- Most people are overlooking key aspects\n\nWhat's your experience? Has anyone else noticed these trends?\n\nWould love to hear different viewpoints on this.`,
      hashtags: [],
    }),
    email: () => ({
      content: `Subject: ${topic} - What You Need to Know\n\nHi there,\n\n${ts.opener} ${topic}.\n\n${keywordStr ? `When it comes to ${keywordStr}, ` : ""}There are some exciting developments I wanted to share with you.\n\nKey Highlights:\n\u2022 New insights that could change your approach\n\u2022 Practical tips you can implement today\n\u2022 Resources to help you get started\n\nReady to learn more? Click below to dive in.\n\n[Call to Action Button]\n\nBest regards,\nYour Team`,
      hashtags: [],
    }),
    blog: () => ({
      content: `# ${topic}: A Comprehensive Guide\n\n${keywordStr ? `*Keywords: ${keywordStr}*\n\n` : ""}## Introduction\n\n${topic} is one of the most important topics in today's landscape. Whether you're a beginner or an experienced professional, understanding the nuances can give you a significant advantage.\n\n## Why ${topic} Matters\n\nIn an ever-evolving world, staying ahead means embracing new ideas and approaches. ${topic} represents a shift in how we think about success and growth.\n\n## Key Strategies\n\n### 1. Start with the Fundamentals\nBefore diving into advanced techniques, make sure you have a solid foundation.\n\n### 2. Stay Consistent\nConsistency is the key to long-term success in any endeavor.\n\n### 3. Measure and Adapt\nTrack your progress and be willing to adjust your approach based on results.\n\n## Conclusion\n\n${topic} is more than just a trend \u2014 it's a fundamental shift in how we approach our goals. Start implementing these strategies today and watch the results unfold.\n\n*What are your thoughts on ${topic}? Share in the comments below!*`,
      hashtags: [],
    }),
  };
  
  const generator = platformContent[platform] || platformContent.instagram;
  const generated = generator();
  
  // Trim content to character limit if needed
  if (charLimit && generated.content.length > charLimit) {
    generated.content = generated.content.substring(0, charLimit - 3) + "...";
  }
  
  return {
    ...generated,
    title: `Campaign: ${topic.substring(0, 50)}`,
    callToAction: `Learn more about ${topic}`,
  };
}

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
  const [isContentExpanded, setIsContentExpanded] = useState(true); // Default expanded to show full content
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>("");
  // Quick Post edit-before-posting modal
  const [quickPostPlatform, setQuickPostPlatform] = useState<SimplePlatform | null>(null);
  const [quickPostContent, setQuickPostContent] = useState<string>("");
  const [showQuickPostEditor, setShowQuickPostEditor] = useState(false);
  const [uploadPostEnabled, setUploadPostEnabled] = useState(false);
  const [uploadPostResult, setUploadPostResult] = useState<MultiPostResult | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { brand, isConfigured: isBrandConfigured, getBrandContext } = useBrand();

  // Load connected platforms on mount
  const loadConnectedPlatforms = async () => {
    const connected = await getConnectedPlatforms();
    setConnectedPlatforms(connected);
  };

  // Check connected platforms and Upload-Post API status on mount
  useEffect(() => {
    loadConnectedPlatforms();
    checkUploadPostStatus();
  }, []);

  const checkUploadPostStatus = async () => {
    const configured = await isApiConfigured();
    setUploadPostEnabled(configured);
  };

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
            "Platform Limit",
            `You can select up to ${limits.maxPlatforms} platforms. Deselect one first, or upgrade your plan for more.`,
            [
              { text: "OK", style: "cancel" },
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
      if (contentType === "social") return ["instagram", "twitter", "linkedin", "facebook", "reddit", "tiktok", "youtube"].includes(p.id);
      if (contentType === "video") return ["youtube", "tiktok"].includes(p.id);
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
        
        let result: { content: string; hashtags?: string[]; title?: string; callToAction?: string };
        
        if (isAuthenticated) {
          // Use server AI generation for authenticated users
          // Include brand context if configured
          const brandContext = isBrandConfigured ? getBrandContext() : undefined;
          result = await generateMutation.mutateAsync({
            contentType,
            platform: platformId,
            topic: topic.trim(),
            tone,
            keywords: keywords ? keywords.split(",").map(k => k.trim()).filter(Boolean) : undefined,
            brandContext,
          });
        } else {
          // Local template-based generation for guest users
          result = generateLocalContent({
            contentType,
            platform: platformId,
            topic: topic.trim(),
            tone,
            keywords: keywords ? keywords.split(",").map(k => k.trim()).filter(Boolean) : [],
            formatting: formatting?.style || "",
            charLimit: platformInfo?.charLimit,
            brandName: isBrandConfigured ? brand.brandName : undefined,
            brandTagline: isBrandConfigured ? brand.tagline : undefined,
          });
        }

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
      setIsEditing(false); // Reset editing state
      
      // Log activity and increment stats
      await incrementStat("created", firstPlatform);
      await logActivity({
        type: "created",
        title: `${topic.trim().substring(0, 50)}`,
        platform: firstPlatform,
      });
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Auto-scroll to show generated content
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
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
      
      // Log activity
      await logActivity({
        type: "created",
        title: generatedContent.title,
        platform: selectedPlatforms[0],
      });
      
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

      // Log activity
      await logActivity({
        type: "created",
        title: generatedContent.title,
        platform: selectedPlatforms[0],
      });
      
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView 
          ref={scrollViewRef}
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
                        if (type.id === "social") return ["instagram", "twitter", "linkedin", "facebook", "reddit", "tiktok", "youtube"].includes(p.id);
                        if (type.id === "video") return ["youtube", "tiktok"].includes(p.id);
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

          {/* Brand Context Indicator */}
          {isBrandConfigured && (
            <View className="px-5 pt-4">
              <TouchableOpacity
                className="flex-row items-center px-4 py-3 rounded-xl border"
                style={{ backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}25` }}
                onPress={() => router.push("/my-brand")}
                activeOpacity={0.7}
              >
                <IconSymbol name="checkmark.seal.fill" size={18} color={colors.primary} />
                <View className="flex-1 ml-2">
                  <Text className="text-sm font-medium text-foreground">
                    Brand: {brand.brandName}
                  </Text>
                  <Text className="text-xs text-muted">
                    AI content will be personalized to your brand
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={14} color={colors.muted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Upload-Post API Status */}
          {uploadPostEnabled && (
            <View className="px-5 pt-3">
              <View
                className="flex-row items-center px-4 py-2.5 rounded-xl"
                style={{ backgroundColor: '#6366F115' }}
              >
                <IconSymbol name="bolt.fill" size={16} color="#6366F1" />
                <Text className="text-xs font-medium ml-2" style={{ color: '#6366F1' }}>
                  Upload-Post API connected — real posting enabled
                </Text>
              </View>
            </View>
          )}

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
                
                {/* Edit/View Toggle */}
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-sm font-medium text-foreground">Generated Content</Text>
                  <TouchableOpacity
                    className="flex-row items-center px-3 py-1.5 rounded-full bg-primary/10"
                    onPress={() => {
                      triggerHaptic();
                      if (!isEditing) {
                        setEditedContent(getContentForPlatform(previewPlatform));
                      }
                      setIsEditing(!isEditing);
                    }}
                  >
                    <IconSymbol name={isEditing ? "checkmark" : "pencil"} size={14} color={colors.primary} />
                    <Text className="text-xs font-medium text-primary ml-1">
                      {isEditing ? "Done Editing" : "Edit Content"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Full Content Display / Edit */}
                {isEditing ? (
                  <TextInput
                    className="bg-background rounded-xl p-3 mb-3 text-sm"
                    value={editedContent}
                    onChangeText={(text) => {
                      setEditedContent(text);
                      // Update the platform version with edited content
                      if (generatedContent?.platformVersions) {
                        setGeneratedContent({
                          ...generatedContent,
                          platformVersions: {
                            ...generatedContent.platformVersions,
                            [previewPlatform]: {
                              ...generatedContent.platformVersions[previewPlatform],
                              content: text,
                            },
                          },
                        });
                      }
                    }}
                    multiline
                    style={{ minHeight: 200, textAlignVertical: "top", color: colors.foreground }}
                    placeholder="Edit your content here..."
                    placeholderTextColor={colors.muted}
                  />
                ) : (
                  <View className="bg-background rounded-xl p-3 mb-3">
                    <Text className="text-sm text-foreground leading-relaxed">
                      {getContentForPlatform(previewPlatform)}
                    </Text>
                  </View>
                )}
                
                {/* Character Count */}
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs text-muted">
                    {getContentForPlatform(previewPlatform).length} characters
                  </Text>
                  {PLATFORMS.find(p => p.id === previewPlatform)?.charLimit && (
                    <Text className={`text-xs ${getContentForPlatform(previewPlatform).length > (PLATFORMS.find(p => p.id === previewPlatform)?.charLimit || 0) ? 'text-error' : 'text-muted'}`}>
                      Limit: {PLATFORMS.find(p => p.id === previewPlatform)?.charLimit}
                    </Text>
                  )}
                </View>
                
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

              {/* Upload-Post API - Real Posting */}
              {uploadPostEnabled && (
                <TouchableOpacity
                  className="mt-3 py-3 rounded-xl items-center flex-row justify-center"
                  style={{ backgroundColor: '#6366F1' }}
                  onPress={async () => {
                    if (!generatedContent) return;
                    triggerHaptic();

                    const platformNames = selectedPlatforms
                      .map(p => PLATFORMS.find(pl => pl.id === p)?.name || p)
                      .join(", ");

                    Alert.alert(
                      "Post via Upload-Post API",
                      `This will post directly to: ${platformNames}\n\nAre you sure?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Post Now",
                          style: "default",
                          onPress: async () => {
                            setIsPosting(true);
                            try {
                              // Build platform-specific content map
                              const platformContent: Record<string, string> = {};
                              for (const pid of selectedPlatforms) {
                                platformContent[pid] = getFullContent(pid);
                              }

                              const result = await postText({
                                platforms: selectedPlatforms,
                                content: getFullContent(selectedPlatforms[0]),
                                platformContent,
                                subreddit: targetSubreddits[0],
                              });

                              setUploadPostResult(result);

                              if (result.overallSuccess) {
                                if (Platform.OS !== "web") {
                                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                }
                                Alert.alert(
                                  "Posted!",
                                  `Successfully posted to ${result.successPlatforms.length} platform(s).`,
                                  [{ text: "OK" }]
                                );
                              } else {
                                const successMsg = result.successPlatforms.length > 0
                                  ? `\n\nSucceeded: ${result.successPlatforms.join(", ")}`
                                  : "";
                                const failMsg = result.failedPlatforms.length > 0
                                  ? `\n\nFailed: ${result.results.filter(r => !r.success).map(r => `${r.platform}: ${r.error}`).join("\n")}`
                                  : "";
                                Alert.alert(
                                  "Partial Success",
                                  `Some platforms had issues.${successMsg}${failMsg}`,
                                  [{ text: "OK" }]
                                );
                              }

                              // Log activity
                              for (const pid of selectedPlatforms) {
                                await logActivity({
                                  type: "published",
                                  title: generatedContent.title,
                                  platform: pid,
                                });
                                await incrementStat("published", pid);
                              }
                            } catch (error: any) {
                              Alert.alert("Error", error.message || "Failed to post via Upload-Post API.");
                            } finally {
                              setIsPosting(false);
                            }
                          },
                        },
                      ]
                    );
                  }}
                  activeOpacity={0.8}
                  disabled={isSaving || isPosting}
                >
                  {isPosting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <IconSymbol name="bolt.fill" size={18} color="#FFFFFF" />
                      <Text className="font-semibold ml-2" style={{ color: '#FFFFFF' }}>
                        Post via Upload-Post ({selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? "s" : ""})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Quick Post Buttons - Edit & Copy */}
              <View className="mt-4">
                <Text className="text-sm font-semibold text-foreground mb-3">Quick Post (Edit & Share)</Text>
                <View className="flex-row flex-wrap">
                  {selectedPlatforms.map((platformId) => {
                    const simplePlatformId = platformId as SimplePlatform;
                    const config = PLATFORM_CONFIGS[simplePlatformId];
                    if (!config) return null;
                    return (
                      <TouchableOpacity
                        key={platformId}
                        className="mr-2 mb-2 px-4 py-3 rounded-xl bg-surface border border-border flex-row items-center"
                        onPress={() => {
                          triggerHaptic();
                          const content = getFullContent(platformId);
                          setQuickPostPlatform(simplePlatformId);
                          setQuickPostContent(content);
                          setShowQuickPostEditor(true);
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
                  Tap a platform to review, edit, and share your content
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

      {/* Quick Post Editor Modal */}
      <Modal
        visible={showQuickPostEditor}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuickPostEditor(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-background rounded-t-3xl max-h-[90%]">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between p-4 border-b border-border">
                <TouchableOpacity onPress={() => setShowQuickPostEditor(false)}>
                  <Text className="text-base text-muted">Cancel</Text>
                </TouchableOpacity>
                <View className="items-center">
                  <Text className="text-lg font-semibold text-foreground">
                    {quickPostPlatform ? PLATFORM_CONFIGS[quickPostPlatform]?.name : "Quick Post"}
                  </Text>
                  {quickPostPlatform && (
                    <Text className="text-xs text-muted">
                      {quickPostContent.length}/{PLATFORM_CONFIGS[quickPostPlatform]?.charLimit || 0} chars
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    if (!quickPostPlatform) return;
                    triggerHaptic();
                    const result = await copyAndOpenApp(quickPostPlatform, quickPostContent);
                    await logQuickPost(quickPostPlatform, quickPostContent);
                    setShowQuickPostEditor(false);
                    if (result.success) {
                      Alert.alert("Content Copied!", result.message);
                    } else {
                      Alert.alert("Error", result.message);
                    }
                  }}
                >
                  <Text className="text-base font-semibold text-primary">Copy & Post</Text>
                </TouchableOpacity>
              </View>

              {/* Platform Info */}
              {quickPostPlatform && (
                <View className="p-4 border-b border-border">
                  <View className="flex-row items-center">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: (PLATFORM_CONFIGS[quickPostPlatform]?.color || '#000') + '20' }}
                    >
                      <IconSymbol
                        name={PLATFORM_CONFIGS[quickPostPlatform]?.icon as any}
                        size={20}
                        color={PLATFORM_CONFIGS[quickPostPlatform]?.color || '#000'}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground">
                        Posting to {PLATFORM_CONFIGS[quickPostPlatform]?.name}
                      </Text>
                      <Text className="text-xs text-muted">
                        {PLATFORM_CONFIGS[quickPostPlatform]?.instructions}
                      </Text>
                    </View>
                  </View>
                  {quickPostContent.length > (PLATFORM_CONFIGS[quickPostPlatform]?.charLimit || Infinity) && (
                    <View className="mt-2 p-2 bg-error/10 rounded-lg">
                      <Text className="text-xs text-error">
                        Content exceeds {PLATFORM_CONFIGS[quickPostPlatform]?.name}'s character limit. It will be truncated.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Editable Content */}
              <ScrollView className="px-4 pt-4 pb-8">
                <Text className="text-sm font-medium text-foreground mb-2">Edit content before posting:</Text>
                <TextInput
                  className="bg-surface border border-border rounded-xl p-4"
                  value={quickPostContent}
                  onChangeText={setQuickPostContent}
                  multiline
                  style={{ minHeight: 200, textAlignVertical: "top", color: colors.foreground }}
                  placeholder="Your content..."
                  placeholderTextColor={colors.muted}
                />
                <Text className="text-xs text-muted mt-2">
                  {quickPostContent.length} characters
                </Text>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});
