import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type BillingCycle = "monthly" | "yearly";
type PlanName = "free" | "basic" | "pro" | "vibe";

interface PlanFeature {
  name: string;
  included: boolean;
}

const PLAN_FEATURES: Record<PlanName, PlanFeature[]> = {
  free: [
    { name: "1 Platform", included: true },
    { name: "2 Posts/Week", included: true },
    { name: "AI Content Generation", included: true },
    { name: "AI Hashtags", included: true },
    { name: "Content Calendar", included: true },
    { name: "7-Day Analytics", included: true },
    { name: "Recurring Templates", included: false },
    { name: "Unified Inbox", included: false },
    { name: "Video Content", included: false },
  ],
  basic: [
    { name: "3 Platforms", included: true },
    { name: "15 Posts/Week", included: true },
    { name: "AI Content Generation", included: true },
    { name: "AI Hashtags", included: true },
    { name: "Content Calendar", included: true },
    { name: "30-Day Analytics", included: true },
    { name: "Recurring Templates", included: true },
    { name: "Unified Inbox", included: true },
    { name: "Saved Replies", included: true },
    { name: "Video Content", included: false },
  ],
  pro: [
    { name: "All 7 Platforms", included: true },
    { name: "50 Posts/Week", included: true },
    { name: "AI Content Generation", included: true },
    { name: "AI Hashtags", included: true },
    { name: "Content Calendar", included: true },
    { name: "90-Day Analytics", included: true },
    { name: "Recurring Templates", included: true },
    { name: "Unified Inbox", included: true },
    { name: "Saved Replies", included: true },
    { name: "Auto-Responders", included: true },
    { name: "Video Content", included: true },
    { name: "Campaign Analytics", included: true },
    { name: "AI Strategy", included: true },
  ],
  vibe: [
    { name: "All 7 Platforms", included: true },
    { name: "Unlimited Posts", included: true },
    { name: "AI Content Generation", included: true },
    { name: "AI Hashtags", included: true },
    { name: "Content Calendar", included: true },
    { name: "Full Analytics History", included: true },
    { name: "Recurring Templates", included: true },
    { name: "Unified Inbox", included: true },
    { name: "Saved Replies", included: true },
    { name: "Auto-Responders", included: true },
    { name: "Video Content", included: true },
    { name: "Campaign Analytics", included: true },
    { name: "AI Strategy", included: true },
    { name: "3 Team Members", included: true },
    { name: "Export Reports", included: true },
    { name: "Priority Support", included: true },
    { name: "API Access", included: true },
  ],
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const colors = useColors();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: plans, isLoading: plansLoading } = trpc.subscription.plans.useQuery();
  const { data: currentSub } = trpc.subscription.current.useQuery();
  const createCheckout = trpc.subscription.createCheckout.useMutation();

  const currentPlanName = currentSub?.plan?.name as PlanName | undefined;

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getYearlySavings = (monthly: number, yearly: number) => {
    if (monthly === 0) return 0;
    const yearlyIfMonthly = monthly * 12;
    return Math.round(((yearlyIfMonthly - yearly) / yearlyIfMonthly) * 100);
  };

  const handleSubscribe = async (planName: PlanName) => {
    if (planName === "free") {
      Alert.alert("Free Plan", "You're already on the free plan!");
      return;
    }

    if (planName === currentPlanName) {
      Alert.alert("Current Plan", "You're already subscribed to this plan.");
      return;
    }

    setSelectedPlan(planName);
    setIsLoading(true);

    try {
      const result = await createCheckout.mutateAsync({
        planName: planName as "basic" | "pro" | "vibe",
        billingCycle,
        successUrl: "postpal://subscription/success",
        cancelUrl: "postpal://subscription/cancel",
      });

      if (result.checkoutUrl) {
        await Linking.openURL(result.checkoutUrl);
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to start checkout"
      );
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  const renderPlanCard = (plan: {
    name: string;
    displayName: string;
    description: string | null;
    priceMonthly: number;
    priceYearly: number;
  }) => {
    const planName = plan.name as PlanName;
    const isCurrentPlan = currentPlanName === planName;
    const isPro = planName === "pro";
    const price = billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
    const savings = getYearlySavings(plan.priceMonthly, plan.priceYearly);
    const features = PLAN_FEATURES[planName] || [];

    return (
      <View
        key={plan.name}
        className={`mb-4 rounded-2xl border-2 p-5 ${
          isPro ? "border-primary bg-primary/5" : "border-border bg-surface"
        }`}
      >
        {isPro && (
          <View className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-3 py-1 rounded-full">
            <Text className="text-xs font-bold text-white">MOST POPULAR</Text>
          </View>
        )}

        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xl font-bold text-foreground">{plan.displayName}</Text>
          {isCurrentPlan && (
            <View className="bg-success/20 px-2 py-1 rounded-full">
              <Text className="text-xs font-semibold text-success">CURRENT</Text>
            </View>
          )}
        </View>

        <Text className="text-sm text-muted mb-4">{plan.description}</Text>

        <View className="flex-row items-baseline mb-4">
          <Text className="text-3xl font-bold text-foreground">
            {formatPrice(price)}
          </Text>
          {price > 0 && (
            <Text className="text-sm text-muted ml-1">
              /{billingCycle === "monthly" ? "mo" : "yr"}
            </Text>
          )}
          {billingCycle === "yearly" && savings > 0 && (
            <View className="ml-2 bg-success/20 px-2 py-0.5 rounded-full">
              <Text className="text-xs font-semibold text-success">
                Save {savings}%
              </Text>
            </View>
          )}
        </View>

        <View className="mb-4">
          {features.map((feature, index) => (
            <View key={index} className="flex-row items-center py-1.5">
              <IconSymbol
                name={feature.included ? "checkmark.circle.fill" : "xmark.circle"}
                size={18}
                color={feature.included ? colors.success : colors.muted}
              />
              <Text
                className={`ml-2 text-sm ${
                  feature.included ? "text-foreground" : "text-muted"
                }`}
              >
                {feature.name}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => handleSubscribe(planName)}
          disabled={isLoading || isCurrentPlan}
          className={`py-3 rounded-xl items-center ${
            isCurrentPlan
              ? "bg-muted/30"
              : isPro
              ? "bg-primary"
              : "bg-foreground"
          }`}
          style={{ opacity: isLoading && selectedPlan === planName ? 0.7 : 1 }}
        >
          {isLoading && selectedPlan === planName ? (
            <ActivityIndicator color={isPro ? "#fff" : colors.background} />
          ) : (
            <Text
              className={`font-semibold ${
                isCurrentPlan
                  ? "text-muted"
                  : isPro
                  ? "text-white"
                  : "text-background"
              }`}
            >
              {isCurrentPlan
                ? "Current Plan"
                : planName === "free"
                ? "Get Started"
                : "Subscribe"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (plansLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-muted">Loading plans...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center py-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-foreground">Choose Your Plan</Text>
        </View>

        {/* Billing Toggle */}
        <View className="flex-row bg-surface rounded-xl p-1 mb-6">
          <TouchableOpacity
            onPress={() => setBillingCycle("monthly")}
            className={`flex-1 py-3 rounded-lg items-center ${
              billingCycle === "monthly" ? "bg-primary" : ""
            }`}
          >
            <Text
              className={`font-semibold ${
                billingCycle === "monthly" ? "text-white" : "text-muted"
              }`}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setBillingCycle("yearly")}
            className={`flex-1 py-3 rounded-lg items-center ${
              billingCycle === "yearly" ? "bg-primary" : ""
            }`}
          >
            <Text
              className={`font-semibold ${
                billingCycle === "yearly" ? "text-white" : "text-muted"
              }`}
            >
              Yearly
            </Text>
            <Text
              className={`text-xs ${
                billingCycle === "yearly" ? "text-white/80" : "text-success"
              }`}
            >
              Save up to 25%
            </Text>
          </TouchableOpacity>
        </View>

        {/* Plans */}
        {plans?.map((plan) => renderPlanCard(plan))}

        {/* Footer */}
        <View className="py-6 items-center">
          <Text className="text-xs text-muted text-center">
            Cancel anytime. All plans include a 7-day money-back guarantee.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
