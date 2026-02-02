import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useFeatureGate, SubscriptionFeatures } from "@/hooks/use-subscription";

interface FeatureGateProps {
  feature: keyof SubscriptionFeatures;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

/**
 * Feature gate component that shows content only if user has the required subscription
 * 
 * Usage:
 * <FeatureGate feature="hasCampaignAnalytics">
 *   <CampaignAnalyticsScreen />
 * </FeatureGate>
 */
export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { isEnabled, upgradeMessage, requiredTier } = useFeatureGate(feature);
  const router = useRouter();
  const colors = useColors();

  if (isEnabled) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <View className="flex-1 items-center justify-center p-6 bg-background">
      <View className="bg-surface rounded-2xl p-6 items-center max-w-sm border border-border">
        <View className="bg-primary/10 rounded-full p-4 mb-4">
          <IconSymbol name="crown.fill" size={32} color={colors.primary} />
        </View>
        
        <Text className="text-xl font-bold text-foreground text-center mb-2">
          Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
        </Text>
        
        <Text className="text-sm text-muted text-center mb-6">
          {upgradeMessage}
        </Text>
        
        <TouchableOpacity
          onPress={() => router.push("/subscription")}
          className="bg-primary px-6 py-3 rounded-xl w-full items-center"
        >
          <Text className="text-white font-semibold">View Plans</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Inline upgrade prompt for features within a screen
 */
interface UpgradePromptProps {
  feature: keyof SubscriptionFeatures;
  compact?: boolean;
}

export function UpgradePrompt({ feature, compact = false }: UpgradePromptProps) {
  const { isEnabled, upgradeMessage, requiredTier } = useFeatureGate(feature);
  const router = useRouter();
  const colors = useColors();

  if (isEnabled) {
    return null;
  }

  if (compact) {
    return (
      <TouchableOpacity
        onPress={() => router.push("/subscription")}
        className="flex-row items-center bg-primary/10 px-3 py-2 rounded-lg"
      >
        <IconSymbol name="crown.fill" size={16} color={colors.primary} />
        <Text className="text-sm text-primary ml-2">
          Upgrade to {requiredTier}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View className="bg-surface rounded-xl p-4 border border-border mb-4">
      <View className="flex-row items-center mb-2">
        <IconSymbol name="crown.fill" size={20} color={colors.primary} />
        <Text className="text-base font-semibold text-foreground ml-2">
          Premium Feature
        </Text>
      </View>
      <Text className="text-sm text-muted mb-3">{upgradeMessage}</Text>
      <TouchableOpacity
        onPress={() => router.push("/subscription")}
        className="bg-primary px-4 py-2 rounded-lg self-start"
      >
        <Text className="text-white font-medium text-sm">Upgrade Now</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Hook to check if a feature is available and show upgrade prompt
 */
export function useFeatureCheck(feature: keyof SubscriptionFeatures) {
  const { isEnabled, upgradeMessage, requiredTier } = useFeatureGate(feature);
  const router = useRouter();

  const checkAndPrompt = () => {
    if (!isEnabled) {
      router.push("/subscription");
      return false;
    }
    return true;
  };

  return {
    isEnabled,
    upgradeMessage,
    requiredTier,
    checkAndPrompt,
  };
}
