import { ScrollView, Text, View, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { copyAndOpenApp, PLATFORM_CONFIGS, type SocialPlatform as SimplePlatform } from "@/lib/simple-posting";
import { logActivity, incrementStat, logQuickPost } from "@/lib/content-store";
import { useBrand } from "@/hooks/use-brand";
import { isApiConfigured, postText, type MultiPostResult } from "@/lib/upload-post-api";

// ─── Types ───────────────────────────────────────────────────────────────────
type SocialPlatform = "instagram" | "twitter" | "linkedin" | "facebook" | "youtube" | "tiktok" | "reddit" | "threads" | "pinterest" | "bluesky";

interface PlatformOption {
  id: SocialPlatform;
  name: string;
  icon: string;
  charLimit: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PLATFORMS: PlatformOption[] = [
  { id: "instagram", name: "Instagram", icon: "camera.fill", charLimit: 2200 },
  { id: "twitter", name: "X (Twitter)", icon: "at", charLimit: 280 },
  { id: "linkedin", name: "LinkedIn", icon: "briefcase.fill", charLimit: 3000 },
  { id: "facebook", name: "Facebook", icon: "person.2.fill", charLimit: 63206 },
  { id: "tiktok", name: "TikTok", icon: "music.note", charLimit: 2200 },
  { id: "youtube", name: "YouTube", icon: "play.rectangle.fill", charLimit: 5000 },
  { id: "reddit", name: "Reddit", icon: "bubble.left.fill", charLimit: 40000 },
  { id: "threads", name: "Threads", icon: "at", charLimit: 500 },
  { id: "bluesky", name: "Bluesky", icon: "cloud.fill", charLimit: 300 },
];

const PLATFORM_FORMATTING: Record<string, string> = {
  instagram: "Visual-focused with emojis, line breaks for readability",
  twitter: "Concise, punchy, thread-friendly if needed",
  linkedin: "Professional, thought-leadership focused",
  facebook: "Conversational, community-focused",
  youtube: "SEO-optimized description with timestamps",
  tiktok: "Video-first, trending hooks, Gen-Z friendly",
  reddit: "Authentic, community-first, no promotional language",
  threads: "Short, conversational, casual",
  bluesky: "Concise, community-oriented",
};

// ─── Local content generation for guest users ────────────────────────────────
// This generates substantive content locally when the server AI is unavailable.
// Each platform gets unique content with different angles and approaches.
function generateLocalContent(params: {
  platform: string;
  topic: string;
  brandName?: string;
  brandTagline?: string;
  brandTone?: string;
  brandAudience?: string;
}): { content: string; hashtags: string[] } {
  const { platform, topic, brandName, brandTagline, brandTone, brandAudience } = params;
  const brandLine = brandName ? `\n\n— ${brandName}${brandTagline ? ` | ${brandTagline}` : ""}` : "";
  const topicClean = topic.trim();
  const topicTag = topicClean.replace(/[^a-zA-Z0-9]/g, "").substring(0, 30);

  // Extract key phrases from the topic for more natural content
  const topicWords = topicClean.split(/\s+/);
  const isQuestion = topicClean.endsWith("?");
  const shortTopic = topicWords.length > 5 ? topicWords.slice(0, 5).join(" ") + "..." : topicClean;

  const generators: Record<string, () => { content: string; hashtags: string[] }> = {
    instagram: () => ({
      content: `Stop scrolling — this matters 👇\n\nI spent the last week diving deep into ${topicClean}, and here are 5 things that completely changed my perspective:\n\n1️⃣ The 80/20 rule applies here too — 80% of results come from 20% of the effort. Focus on what actually moves the needle.\n\n2️⃣ Most people fail because they try to do everything at once. Pick ONE strategy and master it before adding more.\n\n3️⃣ Consistency beats intensity every single time. 30 minutes daily > 5 hours once a week.\n\n4️⃣ The people who succeed fastest? They invest in learning from others who've already done it.\n\n5️⃣ Track your progress weekly. What gets measured gets improved.\n\nWhich of these resonates most with you? Drop a number in the comments 👇\n\n💾 Save this for when you need a reminder.${brandLine}`,
      hashtags: [topicTag, "Strategy", "GrowthMindset", "BusinessTips", "Productivity", "Success", "Motivation", "EntrepreneurLife", "PersonalDevelopment", "GoalSetting", "MindsetShift", "DailyHabits", "LevelUp", "ContentCreator", "KnowledgeIsPower"],
    }),
    twitter: () => ({
      content: `The biggest misconception about ${shortTopic}?\n\nThat you need to be an expert to start.\n\nYou don't. You just need to start before you're ready.\n\nThe gap between knowing and doing is where 90% of people get stuck.${brandLine}`,
      hashtags: [topicTag],
    }),
    linkedin: () => ({
      content: `I've been studying ${topicClean} for the past several months, and one pattern keeps emerging.\n\nThe professionals who excel aren't necessarily the most talented. They're the most systematic.\n\nHere's the framework I've seen work repeatedly:\n\n𝗦𝘁𝗲𝗽 𝟭: Audit your current approach. Most people skip this and jump straight to tactics. That's like building a house without checking the foundation.\n\n𝗦𝘁𝗲𝗽 𝟮: Identify the 2-3 highest-leverage activities. Not everything deserves equal attention. Use the ICE framework (Impact, Confidence, Ease) to prioritize.\n\n𝗦𝘁𝗲𝗽 𝟯: Build a 90-day execution plan. Break it into 30-day sprints with clear milestones. Review and adjust monthly.\n\n𝗦𝘁𝗲𝗽 𝟰: Measure what matters. Vanity metrics feel good but don't drive decisions. Focus on leading indicators, not just lagging ones.\n\nThe companies and professionals I've seen transform their results with ${shortTopic} all share one trait: they treat it as a system, not a one-time project.\n\nWhat's your biggest challenge with ${shortTopic}? I'd love to hear your perspective 👇${brandLine}`,
      hashtags: [topicTag, "Leadership", "ProfessionalDevelopment", "Strategy", "BusinessGrowth"],
    }),
    facebook: () => ({
      content: `Can we talk about ${topicClean} for a minute? 🤔\n\nI've been having conversations with so many people about this lately, and I keep hearing the same thing:\n\n"I know I should focus on this, but I don't know where to start."\n\nSound familiar? Here's what I tell everyone:\n\nStart with what you already know. Seriously. You don't need another course, another book, or another webinar. You need to take what you already know and actually DO something with it.\n\nHere are 3 simple steps to get moving TODAY:\n\n✅ Write down your #1 goal related to ${shortTopic}\n✅ Identify the smallest possible action you can take in the next 24 hours\n✅ Tell someone about it (accountability is everything)\n\nThat's it. No complicated strategy. No expensive tools. Just action.\n\nWho's in? Tag someone who needs to hear this! 👇${brandLine}`,
      hashtags: [topicTag, "Community"],
    }),
    tiktok: () => ({
      content: `[HOOK - First 2 seconds]\n"Here's what nobody tells you about ${shortTopic}..."\n\n[CONTENT]\nOkay so I've been deep in the research on this and there are 3 things that blew my mind:\n\nNumber 1 — The people who are crushing it right now? They started when they felt LEAST ready. Not when everything was perfect.\n\nNumber 2 — You don't need a massive budget or following. The data shows that micro-strategies consistently outperform big flashy campaigns.\n\nNumber 3 — And this is the big one — the best time to start was yesterday. The second best time? Right now. Literally right now.\n\n[CTA]\nFollow if you want more real talk about ${shortTopic}. No fluff, just stuff that actually works.\n\nDrop a 🔥 if this hit different.${brandLine}`,
      hashtags: [topicTag, "FYP", "LearnOnTikTok", "RealTalk", "GameChanger"],
    }),
    youtube: () => ({
      content: `${topicClean} — The Complete Breakdown (What Actually Works in 2026)\n\nIn this video, I'm breaking down everything you need to know about ${topicClean} — no fluff, no filler, just actionable strategies you can implement today.\n\n⏰ TIMESTAMPS:\n0:00 - Why ${shortTopic} matters more than ever\n1:45 - The #1 mistake most people make (and how to avoid it)\n3:30 - The 3-step framework that actually works\n6:00 - Real examples and case studies\n8:30 - Tools and resources I recommend\n10:00 - Your 7-day action plan\n11:30 - Q&A and final thoughts\n\n📌 KEY TAKEAWAYS:\n• Why 73% of people fail at ${shortTopic} (and the simple fix)\n• The "minimum viable" approach that gets results in 30 days\n• 3 free tools that will save you hours every week\n• The accountability framework top performers use\n\n🔗 RESOURCES MENTIONED:\n• Free worksheet: [link in description]\n• Recommended reading: [see pinned comment]\n\n🔔 Subscribe and hit the bell so you don't miss the next video!\n\n💬 Drop a comment: What's YOUR biggest challenge with ${shortTopic}?${brandLine}`,
      hashtags: [topicTag, "HowTo", "Tutorial", "Strategy"],
    }),
    reddit: () => ({
      content: `${topicClean} — What I've learned after months of research and experimentation\n\nHey everyone,\n\nI've been going deep on ${topicClean} for a while now and wanted to share some honest observations. Not trying to sell anything — just genuinely curious about others' experiences.\n\nHere's what I've found:\n\n**What actually works:**\n- Starting small and iterating. Every "overnight success" I've looked into had months or years of quiet work behind it.\n- Focusing on fundamentals over trends. The basics haven't changed much — execution is what separates people.\n- Getting feedback early and often. The biggest waste of time is perfecting something nobody wants.\n\n**What doesn't work (despite what the internet says):**\n- Trying to copy exactly what worked for someone else. Context matters enormously.\n- Spending more time planning than doing. Analysis paralysis is real.\n- Going it alone. Having even one person to bounce ideas off makes a huge difference.\n\n**What I'm still figuring out:**\n- How to balance quality with consistency\n- When to pivot vs. when to stay the course\n- How to measure progress when results are slow\n\nHas anyone else been working on ${shortTopic}? What's been your experience? I'd especially love to hear from people who've been at it for 6+ months.\n\nEdit: Thanks for all the responses! Lots of great perspectives here.`,
      hashtags: [],
    }),
    threads: () => ({
      content: `Unpopular opinion about ${shortTopic}:\n\nThe people giving you advice about it probably figured it out through trial and error, not some secret formula.\n\nStop looking for shortcuts. Start experimenting. That's literally the whole secret.\n\nWhat's your take? 👇${brandLine}`,
      hashtags: [topicTag],
    }),
    bluesky: () => ({
      content: `Been thinking about ${shortTopic} a lot lately. The biggest insight? Most advice overcomplicates it. Start with the basics, be consistent, and iterate. That's 90% of the game.${brandLine}`,
      hashtags: [],
    }),
    pinterest: () => ({
      content: `${topicClean} — Your Complete Guide\n\n📌 Save this pin for later!\n\nEverything you need to know about ${topicClean}, broken down into simple, actionable steps.\n\n✅ Start with the fundamentals\n✅ Build consistent habits\n✅ Track your progress\n✅ Adjust and improve\n\nTap the link for the full guide! 🔗${brandLine}`,
      hashtags: [topicTag, "Tips", "Guide", "HowTo", "Inspiration"],
    }),
  };

  const gen = generators[platform] || generators.instagram;
  return gen();
}

// ─── Step indicator component ────────────────────────────────────────────────
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const colors = useColors();
  const stepLabels = ["Topic", "Content", "Schedule", "Post"];

  return (
    <View className="flex-row items-center justify-center px-5 py-3">
      {stepLabels.map((label, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <View key={label} className="flex-row items-center">
            <View className="items-center">
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{
                  backgroundColor: isActive ? colors.primary : isCompleted ? colors.success : colors.surface,
                  borderWidth: 1.5,
                  borderColor: isActive ? colors.primary : isCompleted ? colors.success : colors.border,
                }}
              >
                {isCompleted ? (
                  <IconSymbol name="checkmark" size={14} color={colors.background} />
                ) : (
                  <Text
                    className="text-xs font-bold"
                    style={{ color: isActive ? colors.background : colors.muted }}
                  >
                    {stepNum}
                  </Text>
                )}
              </View>
              <Text
                className="text-xs mt-1"
                style={{ color: isActive ? colors.primary : isCompleted ? colors.success : colors.muted, fontWeight: isActive ? "600" : "400" }}
              >
                {label}
              </Text>
            </View>
            {index < stepLabels.length - 1 && (
              <View
                className="mx-2"
                style={{
                  width: 24,
                  height: 2,
                  backgroundColor: isCompleted ? colors.success : colors.border,
                  marginBottom: 16,
                }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CreateContentScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { limits, canUsePlatforms } = useSubscription();
  const { brand, isConfigured: isBrandConfigured, getBrandContext } = useBrand();
  const scrollViewRef = useRef<ScrollView>(null);

  // Wizard state
  const [step, setStep] = useState(1); // 1=Topic, 2=Content, 3=Schedule, 4=Post

  // Step 1: Topic
  const [topic, setTopic] = useState("");

  // Step 2: Generated content (per platform)
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Record<string, { content: string; hashtags: string[] }>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [editPlatform, setEditPlatform] = useState("");

  // Step 3: Schedule
  const [scheduleDate, setScheduleDate] = useState<Date>(new Date());
  const [scheduleHour, setScheduleHour] = useState(9);
  const [scheduleMinute, setScheduleMinute] = useState(0);
  const [schedulePeriod, setSchedulePeriod] = useState<"AM" | "PM">("AM");
  const [postNow, setPostNow] = useState(true); // Default to "Post Now"

  // Step 4: Platform selection
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);

  // Posting state
  const [isPosting, setIsPosting] = useState(false);
  const [uploadPostEnabled, setUploadPostEnabled] = useState(false);

  // Quick post editor modal
  const [quickPostPlatform, setQuickPostPlatform] = useState<SimplePlatform | null>(null);
  const [quickPostContent, setQuickPostContent] = useState("");
  const [showQuickPostEditor, setShowQuickPostEditor] = useState(false);

  const generateAllMutation = trpc.ai.generateAllPlatforms.useMutation();

  useEffect(() => {
    checkUploadPostStatus();
  }, []);

  const checkUploadPostStatus = async () => {
    const configured = await isApiConfigured();
    setUploadPostEnabled(configured);
  };

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const scrollToTop = () => {
    setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }), 100);
  };

  // ─── Step 1: Generate content ──────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!topic.trim()) {
      Alert.alert("Topic Required", "Please enter a topic or idea for your content.");
      return;
    }

    triggerHaptic();
    setIsGenerating(true);

    try {
      const brandContext = isBrandConfigured ? getBrandContext() : undefined;
      const platformIds = PLATFORMS.map((p) => p.id);
      let results: Record<string, { content: string; hashtags: string[] }> = {};

      if (isAuthenticated) {
        try {
          // Use single API call to generate ALL platforms at once (much faster)
          const aiResult = await generateAllMutation.mutateAsync({
            topic: topic.trim(),
            brandContext,
            platforms: platformIds,
          });

          // Parse the AI response into our format
          const platforms = aiResult?.platforms || aiResult;
          for (const platform of PLATFORMS) {
            const platformData = platforms?.[platform.id];
            if (platformData?.content) {
              results[platform.id] = {
                content: platformData.content,
                hashtags: platformData.hashtags || [],
              };
            } else {
              // Fallback for any platform the AI missed
              results[platform.id] = generateLocalContent({
                platform: platform.id,
                topic: topic.trim(),
                brandName: isBrandConfigured ? brand.brandName : undefined,
                brandTagline: isBrandConfigured ? brand.tagline : undefined,
                brandTone: isBrandConfigured ? brand.toneOfVoice : undefined,
                brandAudience: isBrandConfigured ? brand.targetAudience : undefined,
              });
            }
          }
        } catch (serverError) {
          console.log("Server AI unavailable, using local generation");
          // Fallback to local generation for all platforms
          for (const platform of PLATFORMS) {
            results[platform.id] = generateLocalContent({
              platform: platform.id,
              topic: topic.trim(),
              brandName: isBrandConfigured ? brand.brandName : undefined,
              brandTagline: isBrandConfigured ? brand.tagline : undefined,
              brandTone: isBrandConfigured ? brand.toneOfVoice : undefined,
              brandAudience: isBrandConfigured ? brand.targetAudience : undefined,
            });
          }
        }
      } else {
        // Not authenticated — use local generation
        for (const platform of PLATFORMS) {
          results[platform.id] = generateLocalContent({
            platform: platform.id,
            topic: topic.trim(),
            brandName: isBrandConfigured ? brand.brandName : undefined,
            brandTagline: isBrandConfigured ? brand.tagline : undefined,
            brandTone: isBrandConfigured ? brand.toneOfVoice : undefined,
            brandAudience: isBrandConfigured ? brand.targetAudience : undefined,
          });
        }
      }

      setGeneratedContent(results);
      await incrementStat("created", "instagram");
      await logActivity({ type: "created", title: topic.trim().substring(0, 50), platform: "instagram" as any });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Move to Step 2
      setStep(2);
      scrollToTop();
    } catch (error) {
      console.error("Generation error:", error);
      Alert.alert("Error", "Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Step 3: Schedule helpers ──────────────────────────────────────────────
  const getScheduleDateTime = (): Date => {
    const d = new Date(scheduleDate);
    let hour = scheduleHour;
    if (schedulePeriod === "PM" && hour !== 12) hour += 12;
    if (schedulePeriod === "AM" && hour === 12) hour = 0;
    d.setHours(hour, scheduleMinute, 0, 0);
    return d;
  };

  const formatScheduleDisplay = (): string => {
    const d = getScheduleDateTime();
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
      " at " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  // ─── Step 4: Platform toggle ───────────────────────────────────────────────
  const handlePlatformToggle = (platformId: SocialPlatform) => {
    triggerHaptic();
    setSelectedPlatforms((prev) => {
      if (prev.includes(platformId)) {
        return prev.filter((p) => p !== platformId);
      }
      if (!canUsePlatforms(prev.length + 1)) {
        Alert.alert("Platform Limit", `Your plan allows ${limits.maxPlatforms} platform(s). Upgrade for more.`, [
          { text: "OK" },
          { text: "Upgrade", onPress: () => router.push("/subscription") },
        ]);
        return prev;
      }
      return [...prev, platformId];
    });
  };

  const handleSelectAll = () => {
    triggerHaptic();
    if (selectedPlatforms.length === PLATFORMS.length) {
      setSelectedPlatforms([]);
    } else {
      const max = Math.min(PLATFORMS.length, limits.maxPlatforms);
      setSelectedPlatforms(PLATFORMS.slice(0, max).map((p) => p.id));
    }
  };

  // ─── Final: Post / Schedule ────────────────────────────────────────────────
  const getFullContent = (platformId: string): string => {
    const data = generatedContent[platformId];
    if (!data) return "";
    const hashtagStr = data.hashtags.length > 0 ? `\n\n${data.hashtags.map((h) => `#${h}`).join(" ")}` : "";
    return data.content + hashtagStr;
  };

  const handleFinalPost = async () => {
    if (selectedPlatforms.length === 0) {
      Alert.alert("Select Platforms", "Please select at least one platform to post to.");
      return;
    }

    triggerHaptic();

    if (postNow) {
      // ── Post Now flow ──
      if (uploadPostEnabled) {
        // Use Upload-Post API for real posting
        Alert.alert(
          "Post Now",
          `Post to ${selectedPlatforms.length} platform(s) right now?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Post Now",
              onPress: async () => {
                setIsPosting(true);
                try {
                  const platformContent: Record<string, string> = {};
                  for (const pid of selectedPlatforms) {
                    platformContent[pid] = getFullContent(pid);
                  }
                  const result = await postText({
                    platforms: selectedPlatforms,
                    content: getFullContent(selectedPlatforms[0]),
                    platformContent,
                  });

                  for (const pid of selectedPlatforms) {
                    await logActivity({ type: "published", title: topic.trim().substring(0, 50), platform: pid });
                    await incrementStat("published", pid);
                  }

                  if (result.overallSuccess) {
                    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert("Posted!", `Successfully posted to ${result.successPlatforms.length} platform(s).`, [
                      { text: "Done", onPress: () => router.back() },
                    ]);
                  } else {
                    const failInfo = result.results.filter((r) => !r.success).map((r) => `${r.platform}: ${r.error}`).join("\n");
                    Alert.alert("Partial Success", `Some platforms had issues.\n\n${failInfo}`, [{ text: "OK" }]);
                  }
                } catch (error: any) {
                  Alert.alert("Error", error.message || "Failed to post.");
                } finally {
                  setIsPosting(false);
                }
              },
            },
          ]
        );
      } else {
        // Copy & Open App flow (no API key)
        // Show the quick-post editor for the first selected platform
        const firstPlatform = selectedPlatforms[0] as SimplePlatform;
        setQuickPostPlatform(firstPlatform);
        setQuickPostContent(getFullContent(firstPlatform));
        setShowQuickPostEditor(true);
      }
    } else {
      // ── Schedule flow ──
      const scheduledAt = getScheduleDateTime();
      try {
        // Save scheduled posts locally
        const existingRaw = await AsyncStorage.getItem("postpal_local_scheduled");
        const existing = existingRaw ? JSON.parse(existingRaw) : [];

        for (const pid of selectedPlatforms) {
          existing.push({
            id: Date.now() + Math.random(),
            title: `Campaign: ${topic.trim().substring(0, 50)}`,
            content: getFullContent(pid),
            contentType: "social",
            platform: pid,
            scheduledAt: scheduledAt.toISOString(),
            status: "scheduled",
            createdAt: new Date().toISOString(),
          });
          await logActivity({ type: "scheduled", title: topic.trim().substring(0, 50), platform: pid });
          await incrementStat("created", pid);
        }

        await AsyncStorage.setItem("postpal_local_scheduled", JSON.stringify(existing));

        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Scheduled!",
          `${selectedPlatforms.length} post(s) scheduled for ${formatScheduleDisplay()}.`,
          [{ text: "View Calendar", onPress: () => router.push("/(tabs)/calendar") }, { text: "Done", onPress: () => router.back() }]
        );
      } catch (error) {
        Alert.alert("Error", "Failed to schedule posts. Please try again.");
      }
    }
  };

  // ─── Quick post for remaining platforms ────────────────────────────────────
  const handleNextQuickPost = (currentIndex: number) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < selectedPlatforms.length) {
      const nextPlatform = selectedPlatforms[nextIndex] as SimplePlatform;
      setQuickPostPlatform(nextPlatform);
      setQuickPostContent(getFullContent(nextPlatform));
    } else {
      setShowQuickPostEditor(false);
      Alert.alert("All Done!", `Content shared to ${selectedPlatforms.length} platform(s).`, [
        { text: "Done", onPress: () => router.back() },
      ]);
    }
  };

  // ─── Date picker helpers ───────────────────────────────────────────────────
  const generateDateOptions = (): Date[] => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const dateOptions = generateDateOptions();

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        {/* Header */}
        <View className="px-5 pt-4 pb-1">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                if (step > 1) {
                  setStep(step - 1);
                  scrollToTop();
                } else {
                  router.back();
                }
              }}
              className="mr-3 p-1"
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-foreground flex-1">Create Content</Text>
          </View>
        </View>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} totalSteps={4} />

        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ═══════════════════════════════════════════════════════════════════
              STEP 1: TOPIC
              ═══════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <View className="px-5 pt-4">
              <Text className="text-lg font-semibold text-foreground mb-2">What do you want to post about?</Text>
              <Text className="text-sm text-muted mb-4">Enter your topic or idea and we'll create content for every platform.</Text>

              <TextInput
                className="bg-surface border border-border rounded-2xl px-4 py-4 text-foreground text-base"
                placeholder="e.g. 5 tips for growing your business on social media"
                placeholderTextColor={colors.muted}
                value={topic}
                onChangeText={setTopic}
                multiline
                numberOfLines={4}
                style={{ minHeight: 120, textAlignVertical: "top", color: colors.foreground }}
                returnKeyType="done"
              />

              {/* Brand indicator */}
              {isBrandConfigured && (
                <TouchableOpacity
                  className="flex-row items-center mt-4 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: `${colors.primary}10`, borderWidth: 1, borderColor: `${colors.primary}20` }}
                  onPress={() => router.push("/my-brand")}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="checkmark.seal.fill" size={18} color={colors.primary} />
                  <Text className="text-sm font-medium text-foreground ml-2 flex-1">
                    Brand: {brand.brandName}
                  </Text>
                  <Text className="text-xs text-muted">Tap to edit</Text>
                </TouchableOpacity>
              )}

              {/* Generate Button */}
              <TouchableOpacity
                className="bg-primary rounded-2xl py-4 mt-6 items-center flex-row justify-center"
                onPress={handleGenerate}
                activeOpacity={0.8}
                disabled={isGenerating || !topic.trim()}
                style={!topic.trim() ? { opacity: 0.5 } : undefined}
              >
                {isGenerating ? (
                  <>
                    <ActivityIndicator color={colors.background} />
                    <Text className="text-lg font-semibold text-background ml-2">Generating...</Text>
                  </>
                ) : (
                  <>
                    <IconSymbol name="sparkles" size={22} color={colors.background} />
                    <Text className="text-lg font-semibold text-background ml-2">Generate Content</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              STEP 2: REVIEW CONTENT
              ═══════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <View className="px-5 pt-4">
              <Text className="text-lg font-semibold text-foreground mb-1">Your Content is Ready</Text>
              <Text className="text-sm text-muted mb-4">Review the generated content. Tap any platform to preview or edit.</Text>

              {/* Preview first platform's content */}
              {Object.keys(generatedContent).length > 0 && (
                <View className="bg-surface rounded-2xl p-4 border border-border mb-4">
                  <Text className="text-sm font-medium text-muted mb-2">Preview (Instagram)</Text>
                  <Text className="text-sm text-foreground leading-relaxed" numberOfLines={8}>
                    {generatedContent.instagram?.content || Object.values(generatedContent)[0]?.content || ""}
                  </Text>
                  <TouchableOpacity
                    className="mt-3 flex-row items-center"
                    onPress={() => {
                      triggerHaptic();
                      setEditPlatform("instagram");
                      setEditText(generatedContent.instagram?.content || "");
                      setIsEditing(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="pencil" size={14} color={colors.primary} />
                    <Text className="text-sm font-medium text-primary ml-1">Edit Content</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Platform content list */}
              <Text className="text-sm font-medium text-foreground mb-2">Content generated for:</Text>
              {PLATFORMS.map((p) => {
                const data = generatedContent[p.id];
                if (!data) return null;
                return (
                  <TouchableOpacity
                    key={p.id}
                    className="flex-row items-center py-3 border-b border-border"
                    onPress={() => {
                      triggerHaptic();
                      setEditPlatform(p.id);
                      setEditText(data.content);
                      setIsEditing(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      className="w-9 h-9 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: `${colors.primary}15` }}
                    >
                      <IconSymbol name={p.icon as any} size={18} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground">{p.name}</Text>
                      <Text className="text-xs text-muted" numberOfLines={1}>
                        {data.content.substring(0, 60)}...
                      </Text>
                    </View>
                    <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                  </TouchableOpacity>
                );
              })}

              {/* Next Button */}
              <TouchableOpacity
                className="bg-primary rounded-2xl py-4 mt-6 items-center flex-row justify-center"
                onPress={() => {
                  triggerHaptic();
                  setStep(3);
                  scrollToTop();
                }}
                activeOpacity={0.8}
              >
                <Text className="text-lg font-semibold text-background">Next: Set Schedule</Text>
                <IconSymbol name="chevron.right" size={20} color={colors.background} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              STEP 3: SCHEDULE
              ═══════════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <View className="px-5 pt-4">
              <Text className="text-lg font-semibold text-foreground mb-1">When do you want to post?</Text>
              <Text className="text-sm text-muted mb-4">Choose to post immediately or schedule for later.</Text>

              {/* Post Now / Schedule Toggle */}
              <View className="flex-row bg-surface rounded-2xl p-1 border border-border mb-6">
                <TouchableOpacity
                  className="flex-1 py-3 rounded-xl items-center"
                  style={postNow ? { backgroundColor: colors.primary } : undefined}
                  onPress={() => {
                    triggerHaptic();
                    setPostNow(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text className={`font-semibold ${postNow ? "text-background" : "text-foreground"}`}>Post Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-3 rounded-xl items-center"
                  style={!postNow ? { backgroundColor: colors.primary } : undefined}
                  onPress={() => {
                    triggerHaptic();
                    setPostNow(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text className={`font-semibold ${!postNow ? "text-background" : "text-foreground"}`}>Schedule</Text>
                </TouchableOpacity>
              </View>

              {/* Schedule Date/Time Picker (only if scheduling) */}
              {!postNow && (
                <View>
                  {/* Date Selection */}
                  <Text className="text-sm font-semibold text-foreground mb-2">Date</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                    <View className="flex-row">
                      {dateOptions.map((date, index) => {
                        const isSelected = scheduleDate.toDateString() === date.toDateString();
                        const dayName = index === 0 ? "Today" : index === 1 ? "Tomorrow" : date.toLocaleDateString("en-US", { weekday: "short" });
                        const dayNum = date.getDate();
                        return (
                          <TouchableOpacity
                            key={index}
                            className="mr-2 px-4 py-3 rounded-xl items-center"
                            style={{
                              backgroundColor: isSelected ? colors.primary : colors.surface,
                              borderWidth: 1,
                              borderColor: isSelected ? colors.primary : colors.border,
                              minWidth: 64,
                            }}
                            onPress={() => {
                              triggerHaptic();
                              setScheduleDate(date);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text className={`text-xs ${isSelected ? "text-background" : "text-muted"}`}>{dayName}</Text>
                            <Text className={`text-lg font-bold ${isSelected ? "text-background" : "text-foreground"}`}>{dayNum}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* Time Selection */}
                  <Text className="text-sm font-semibold text-foreground mb-2">Time</Text>
                  <View className="flex-row items-center mb-6">
                    {/* Hour */}
                    <View className="flex-row flex-wrap flex-1 mr-2">
                      {[9, 10, 11, 12, 1, 2, 3, 4, 5, 6].map((h) => (
                        <TouchableOpacity
                          key={h}
                          className="px-3 py-2 rounded-lg mr-1 mb-1"
                          style={{
                            backgroundColor: scheduleHour === h ? colors.primary : colors.surface,
                            borderWidth: 1,
                            borderColor: scheduleHour === h ? colors.primary : colors.border,
                          }}
                          onPress={() => {
                            triggerHaptic();
                            setScheduleHour(h);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text className={`text-sm font-medium ${scheduleHour === h ? "text-background" : "text-foreground"}`}>{h}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {/* Minute */}
                    <View className="mr-2">
                      {["00", "15", "30", "45"].map((m) => (
                        <TouchableOpacity
                          key={m}
                          className="px-3 py-1.5 rounded-lg mb-1"
                          style={{
                            backgroundColor: scheduleMinute === parseInt(m) ? colors.primary : colors.surface,
                            borderWidth: 1,
                            borderColor: scheduleMinute === parseInt(m) ? colors.primary : colors.border,
                          }}
                          onPress={() => {
                            triggerHaptic();
                            setScheduleMinute(parseInt(m));
                          }}
                          activeOpacity={0.7}
                        >
                          <Text className={`text-xs font-medium ${scheduleMinute === parseInt(m) ? "text-background" : "text-foreground"}`}>:{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {/* AM/PM */}
                    <View>
                      {(["AM", "PM"] as const).map((p) => (
                        <TouchableOpacity
                          key={p}
                          className="px-3 py-2 rounded-lg mb-1"
                          style={{
                            backgroundColor: schedulePeriod === p ? colors.primary : colors.surface,
                            borderWidth: 1,
                            borderColor: schedulePeriod === p ? colors.primary : colors.border,
                          }}
                          onPress={() => {
                            triggerHaptic();
                            setSchedulePeriod(p);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text className={`text-sm font-medium ${schedulePeriod === p ? "text-background" : "text-foreground"}`}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Schedule summary */}
                  <View className="bg-surface rounded-xl p-3 border border-border mb-4">
                    <View className="flex-row items-center">
                      <IconSymbol name="calendar" size={18} color={colors.primary} />
                      <Text className="text-sm font-medium text-foreground ml-2">{formatScheduleDisplay()}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Next Button */}
              <TouchableOpacity
                className="bg-primary rounded-2xl py-4 mt-2 items-center flex-row justify-center"
                onPress={() => {
                  triggerHaptic();
                  setStep(4);
                  scrollToTop();
                }}
                activeOpacity={0.8}
              >
                <Text className="text-lg font-semibold text-background">Next: Select Platforms</Text>
                <IconSymbol name="chevron.right" size={20} color={colors.background} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              STEP 4: SELECT PLATFORMS & POST
              ═══════════════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <View className="px-5 pt-4">
              <Text className="text-lg font-semibold text-foreground mb-1">Where do you want to post?</Text>
              <Text className="text-sm text-muted mb-4">Select the platforms to publish your content.</Text>

              {/* Select All */}
              <TouchableOpacity
                className="flex-row items-center justify-between mb-4 px-4 py-3 rounded-xl bg-surface border border-border"
                onPress={handleSelectAll}
                activeOpacity={0.7}
              >
                <Text className="text-sm font-semibold text-foreground">
                  {selectedPlatforms.length === PLATFORMS.length ? "Deselect All" : "Select All Platforms"}
                </Text>
                <View
                  className="w-6 h-6 rounded-md items-center justify-center"
                  style={{
                    backgroundColor: selectedPlatforms.length === PLATFORMS.length ? colors.primary : "transparent",
                    borderWidth: 2,
                    borderColor: selectedPlatforms.length === PLATFORMS.length ? colors.primary : colors.border,
                  }}
                >
                  {selectedPlatforms.length === PLATFORMS.length && (
                    <IconSymbol name="checkmark" size={14} color={colors.background} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Platform Grid */}
              {PLATFORMS.map((p) => {
                const isSelected = selectedPlatforms.includes(p.id);
                const config = PLATFORM_CONFIGS[p.id as SimplePlatform];
                const platformColor = config?.color || colors.primary;

                return (
                  <TouchableOpacity
                    key={p.id}
                    className="flex-row items-center py-3.5 px-4 rounded-xl mb-2"
                    style={{
                      backgroundColor: isSelected ? `${platformColor}12` : colors.surface,
                      borderWidth: 1.5,
                      borderColor: isSelected ? platformColor : colors.border,
                    }}
                    onPress={() => handlePlatformToggle(p.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: `${platformColor}20` }}
                    >
                      <IconSymbol name={p.icon as any} size={20} color={platformColor} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-medium text-foreground">{p.name}</Text>
                      <Text className="text-xs text-muted">{p.charLimit.toLocaleString()} char limit</Text>
                    </View>
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: isSelected ? platformColor : "transparent",
                        borderWidth: 2,
                        borderColor: isSelected ? platformColor : colors.border,
                      }}
                    >
                      {isSelected && <IconSymbol name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Summary */}
              {selectedPlatforms.length > 0 && (
                <View className="bg-surface rounded-xl p-3 mt-4 border border-border">
                  <Text className="text-sm text-foreground text-center">
                    <Text className="font-bold">{selectedPlatforms.length}</Text> platform{selectedPlatforms.length !== 1 ? "s" : ""} selected
                    {!postNow && ` · ${formatScheduleDisplay()}`}
                    {postNow && " · Posting now"}
                  </Text>
                </View>
              )}

              {/* Upload-Post API indicator */}
              {uploadPostEnabled && postNow && (
                <View className="flex-row items-center px-4 py-2.5 rounded-xl mt-3" style={{ backgroundColor: "#6366F115" }}>
                  <IconSymbol name="bolt.fill" size={16} color="#6366F1" />
                  <Text className="text-xs font-medium ml-2" style={{ color: "#6366F1" }}>
                    Upload-Post API connected — real posting enabled
                  </Text>
                </View>
              )}

              {/* Final Action Button */}
              <TouchableOpacity
                className="rounded-2xl py-4 mt-6 items-center flex-row justify-center"
                style={{
                  backgroundColor: selectedPlatforms.length > 0 ? (postNow ? colors.success : colors.primary) : colors.muted,
                  opacity: selectedPlatforms.length > 0 ? 1 : 0.5,
                }}
                onPress={handleFinalPost}
                activeOpacity={0.8}
                disabled={selectedPlatforms.length === 0 || isPosting}
              >
                {isPosting ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <IconSymbol name={postNow ? "paperplane.fill" : "calendar"} size={22} color={colors.background} />
                    <Text className="text-lg font-semibold text-background ml-2">
                      {postNow
                        ? `Post Now to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? "s" : ""}`
                        : `Schedule ${selectedPlatforms.length} Post${selectedPlatforms.length !== 1 ? "s" : ""}`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom padding */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ═══════════════════════════════════════════════════════════════════════
          EDIT CONTENT MODAL
          ═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={isEditing} animationType="slide" transparent onRequestClose={() => setIsEditing(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-background rounded-t-3xl max-h-[90%]">
              <View className="flex-row items-center justify-between p-4 border-b border-border">
                <TouchableOpacity onPress={() => setIsEditing(false)}>
                  <Text className="text-base text-muted">Cancel</Text>
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-foreground">
                  Edit {PLATFORMS.find((p) => p.id === editPlatform)?.name || "Content"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    // Save edited content
                    if (editPlatform && generatedContent[editPlatform]) {
                      setGeneratedContent((prev) => ({
                        ...prev,
                        [editPlatform]: { ...prev[editPlatform], content: editText },
                      }));
                    }
                    setIsEditing(false);
                  }}
                >
                  <Text className="text-base font-semibold text-primary">Save</Text>
                </TouchableOpacity>
              </View>
              <ScrollView className="px-4 pt-4 pb-8">
                <TextInput
                  className="bg-surface border border-border rounded-xl p-4"
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  style={{ minHeight: 250, textAlignVertical: "top", color: colors.foreground }}
                  placeholderTextColor={colors.muted}
                />
                <Text className="text-xs text-muted mt-2">
                  {editText.length} / {PLATFORMS.find((p) => p.id === editPlatform)?.charLimit || "∞"} characters
                </Text>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          QUICK POST MODAL (Copy & Open App)
          ═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showQuickPostEditor} animationType="slide" transparent onRequestClose={() => setShowQuickPostEditor(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-background rounded-t-3xl max-h-[90%]">
              <View className="flex-row items-center justify-between p-4 border-b border-border">
                <TouchableOpacity onPress={() => setShowQuickPostEditor(false)}>
                  <Text className="text-base text-muted">Cancel</Text>
                </TouchableOpacity>
                <View className="items-center">
                  <Text className="text-lg font-semibold text-foreground">
                    {quickPostPlatform ? PLATFORM_CONFIGS[quickPostPlatform]?.name : "Post"}
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

                    if (result.success) {
                      Alert.alert("Content Copied!", result.message, [
                        {
                          text: selectedPlatforms.length > 1 ? "Next Platform" : "Done",
                          onPress: () => {
                            const currentIdx = selectedPlatforms.indexOf(quickPostPlatform as SocialPlatform);
                            handleNextQuickPost(currentIdx);
                          },
                        },
                      ]);
                    } else {
                      Alert.alert("Error", result.message);
                    }
                  }}
                >
                  <Text className="text-base font-semibold text-primary">Copy & Post</Text>
                </TouchableOpacity>
              </View>

              {quickPostPlatform && (
                <View className="p-4 border-b border-border">
                  <View className="flex-row items-center">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: (PLATFORM_CONFIGS[quickPostPlatform]?.color || "#000") + "20" }}
                    >
                      <IconSymbol name={PLATFORM_CONFIGS[quickPostPlatform]?.icon as any} size={20} color={PLATFORM_CONFIGS[quickPostPlatform]?.color || "#000"} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground">Posting to {PLATFORM_CONFIGS[quickPostPlatform]?.name}</Text>
                      <Text className="text-xs text-muted">{PLATFORM_CONFIGS[quickPostPlatform]?.instructions}</Text>
                    </View>
                  </View>
                  {selectedPlatforms.length > 1 && (
                    <Text className="text-xs text-primary mt-2">
                      Platform {selectedPlatforms.indexOf(quickPostPlatform as SocialPlatform) + 1} of {selectedPlatforms.length}
                    </Text>
                  )}
                </View>
              )}

              <ScrollView className="px-4 pt-4 pb-8">
                <Text className="text-sm font-medium text-foreground mb-2">Edit content before posting:</Text>
                <TextInput
                  className="bg-surface border border-border rounded-xl p-4"
                  value={quickPostContent}
                  onChangeText={setQuickPostContent}
                  multiline
                  style={{ minHeight: 200, textAlignVertical: "top", color: colors.foreground }}
                  placeholderTextColor={colors.muted}
                />
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
    paddingBottom: 20,
  },
});
