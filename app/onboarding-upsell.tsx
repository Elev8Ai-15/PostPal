import { useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const { width } = Dimensions.get("window");

interface TierFeature {
  name: string;
  free: boolean | string;
  basic: boolean | string;
  pro: boolean | string;
  vibe: boolean | string;
}

const TIER_FEATURES: TierFeature[] = [
  { name: "AI Content Generation", free: true, basic: true, pro: true, vibe: true },
  { name: "Platforms", free: "1", basic: "3", pro: "All 7", vibe: "All 7" },
  { name: "Posts per Week", free: "2", basic: "15", pro: "50", vibe: "Unlimited" },
  { name: "AI Hashtag Suggestions", free: true, basic: true, pro: true, vibe: true },
  { name: "Content Calendar", free: true, basic: true, pro: true, vibe: true },
  { name: "Image Generation", free: true, basic: true, pro: true, vibe: true },
  { name: "Video Content", free: false, basic: false, pro: true, vibe: true },
  { name: "Recurring Templates", free: false, basic: true, pro: true, vibe: true },
  { name: "Social Inbox", free: false, basic: true, pro: true, vibe: true },
  { name: "AI Strategy Generation", free: false, basic: false, pro: true, vibe: true },
  { name: "Campaign Analytics", free: false, basic: false, pro: true, vibe: true },
  { name: "Analytics History", free: "7 days", basic: "30 days", pro: "90 days", vibe: "Full" },
  { name: "Team Members", free: "1", basic: "1", pro: "1", vibe: "3" },
  { name: "Priority Support", free: false, basic: false, pro: false, vibe: true },
  { name: "API Access", free: false, basic: false, pro: false, vibe: true },
];

const TIERS = [
  { id: "free", name: "Free", price: "$0", period: "forever", color: "#6B7280", popular: false },
  { id: "basic", name: "Basic", price: "$4.99", period: "/month", color: "#3B82F6", popular: false },
  { id: "pro", name: "Pro", price: "$9.99", period: "/month", color: "#8B5CF6", popular: true },
  { id: "vibe", name: "Vibe", price: "$19.99", period: "/month", color: "#F97316", popular: false },
];

export default function OnboardingUpsellScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState("free");

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSelectTier = (tierId: string) => {
    triggerHaptic();
    setSelectedTier(tierId);
  };

  const handleContinue = () => {
    triggerHaptic();
    if (selectedTier === "free") {
      router.replace("/(tabs)");
    } else {
      router.push({ pathname: "/subscription", params: { tier: selectedTier } });
    }
  };

  const handleSkip = () => {
    triggerHaptic();
    router.replace("/(tabs)");
  };

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === "boolean") {
      return value ? (
        <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
      ) : (
        <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
      );
    }
    return <Text style={[styles.featureValue, { color: colors.foreground }]}>{value}</Text>;
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Choose Your Plan</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Start free and upgrade anytime
          </Text>
        </View>

        {/* Tier Cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tierCardsContainer}
          snapToInterval={width * 0.7 + 12}
          decelerationRate="fast"
        >
          {TIERS.map((tier) => (
            <TouchableOpacity
              key={tier.id}
              style={[
                styles.tierCard,
                { 
                  backgroundColor: colors.surface,
                  borderColor: selectedTier === tier.id ? tier.color : colors.border,
                  borderWidth: selectedTier === tier.id ? 2 : 1,
                },
              ]}
              onPress={() => handleSelectTier(tier.id)}
              activeOpacity={0.8}
            >
              {tier.popular && (
                <View style={[styles.popularBadge, { backgroundColor: tier.color }]}>
                  <Text style={styles.popularText}>Most Popular</Text>
                </View>
              )}
              <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
              <View style={styles.priceContainer}>
                <Text style={[styles.tierPrice, { color: colors.foreground }]}>{tier.price}</Text>
                <Text style={[styles.tierPeriod, { color: colors.muted }]}>{tier.period}</Text>
              </View>
              {selectedTier === tier.id && (
                <View style={[styles.selectedIndicator, { backgroundColor: tier.color }]}>
                  <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Feature Comparison */}
        <View style={[styles.comparisonContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.comparisonTitle, { color: colors.foreground }]}>
            What's Included
          </Text>
          <ScrollView style={styles.featuresList} showsVerticalScrollIndicator={false}>
            {TIER_FEATURES.slice(0, 8).map((feature, index) => (
              <View 
                key={index} 
                style={[
                  styles.featureRow,
                  { borderBottomColor: colors.border }
                ]}
              >
                <Text style={[styles.featureName, { color: colors.foreground }]}>
                  {feature.name}
                </Text>
                <View style={styles.featureValueContainer}>
                  {renderFeatureValue(feature[selectedTier as keyof TierFeature] as boolean | string)}
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity 
            style={styles.seeAllButton}
            onPress={() => router.push("/subscription")}
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>
              See all features
            </Text>
            <IconSymbol name="chevron.right" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[
              styles.continueButton, 
              { backgroundColor: TIERS.find(t => t.id === selectedTier)?.color || colors.primary }
            ]}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              {selectedTier === "free" ? "Start Free" : `Continue with ${TIERS.find(t => t.id === selectedTier)?.name}`}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.muted }]}>
              Maybe later
            </Text>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  tierCardsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  tierCard: {
    width: width * 0.4,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    alignItems: "center",
    position: "relative",
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  tierName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  tierPrice: {
    fontSize: 24,
    fontWeight: "bold",
  },
  tierPeriod: {
    fontSize: 14,
    marginLeft: 2,
  },
  selectedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  comparisonContainer: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  featuresList: {
    flex: 1,
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  featureName: {
    fontSize: 14,
    flex: 1,
  },
  featureValueContainer: {
    minWidth: 60,
    alignItems: "flex-end",
  },
  featureValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 4,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  skipButton: {
    alignItems: "center",
    padding: 8,
  },
  skipText: {
    fontSize: 14,
  },
});
