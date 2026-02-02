import { useState, useRef } from "react";
import { Text, View, TouchableOpacity, StyleSheet, Dimensions, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const { width } = Dimensions.get("window");

interface OnboardingSlide {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    icon: "sparkles",
    title: "AI-Powered Content",
    description: "Create engaging posts in seconds with our intelligent AI assistant. Just describe your topic and let PostPal craft the perfect message.",
    color: "#F97316",
  },
  {
    id: "2",
    icon: "calendar",
    title: "Smart Scheduling",
    description: "Plan your content calendar with ease. Schedule posts for optimal times and manage your entire content pipeline from one place.",
    color: "#8B5CF6",
  },
  {
    id: "3",
    icon: "chart.bar.fill",
    title: "Powerful Analytics",
    description: "Track your performance with detailed insights. Monitor engagement, follower growth, and content performance across all platforms.",
    color: "#10B981",
  },
  {
    id: "4",
    icon: "checkmark.circle.fill",
    title: "Easy Approvals",
    description: "Review AI-generated content before publishing. Approve, edit, or reject posts with a simple swipe.",
    color: "#3B82F6",
  },
];

const ONBOARDING_KEY = "@postpal_onboarding_complete";

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNext = () => {
    triggerHaptic();
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    triggerHaptic();
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    } catch (error) {
      console.error("Failed to save onboarding state:", error);
    }
    // Navigate to upsell screen to show tier options
    router.replace("/onboarding-upsell");
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + "20" }]}>
        <IconSymbol name={item.icon as any} size={80} color={item.color} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
      <Text style={[styles.description, { color: colors.muted }]}>{item.description}</Text>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {ONBOARDING_SLIDES.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: index === currentIndex ? colors.primary : colors.border,
              width: index === currentIndex ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        {/* Header with Logo and Skip */}
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/logo-header.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.muted }]}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={ONBOARDING_SLIDES}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
          }}
          keyExtractor={(item) => item.id}
        />

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {renderDots()}
          
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: colors.primary }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={[styles.nextButtonText, { color: colors.background }]}>
              {currentIndex === ONBOARDING_SLIDES.length - 1 ? "Get Started" : "Next"}
            </Text>
            <IconSymbol 
              name="chevron.right" 
              size={20} 
              color={colors.background} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  logo: {
    width: 100,
    height: 35,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "500",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
});
