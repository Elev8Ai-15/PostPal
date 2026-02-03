import { Text, View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";
import { useState, useEffect } from "react";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading, router]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await startOAuthLogin();
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 px-6 justify-center">
        {/* Logo and Branding */}
        <View className="items-center mb-12">
          <Image
            source={require("@/assets/images/logo-full.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <Text className="text-base text-muted mt-4 text-center">
            Your AI-powered marketing assistant
          </Text>
        </View>

        {/* Features List */}
        <View className="mb-12">
          <FeatureItem 
            icon="chart.bar.fill" 
            title="Grow Your Audience" 
            description="AI-driven strategies to boost engagement"
          />
          <FeatureItem 
            icon="calendar" 
            title="Smart Scheduling" 
            description="Plan and automate your content calendar"
          />
          <FeatureItem 
            icon="checkmark.circle.fill" 
            title="Easy Approvals" 
            description="Review and approve AI-generated content"
          />
        </View>

        {/* Login Button */}
        <TouchableOpacity
          className="bg-primary rounded-xl py-4 items-center flex-row justify-center"
          onPress={handleLogin}
          activeOpacity={0.8}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <IconSymbol name="person.fill" size={20} color={colors.background} />
              <Text className="text-lg font-semibold text-background ml-2">
                Sign in to Continue
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Guest Mode - Prominent Button */}
        <TouchableOpacity
          className="mt-4 bg-surface border-2 border-primary rounded-xl py-4 items-center flex-row justify-center"
          onPress={() => router.replace("/(tabs)")}
          activeOpacity={0.8}
        >
          <IconSymbol name="sparkles" size={20} color={colors.primary} />
          <Text className="text-lg font-semibold text-primary ml-2">
            Try PostPal Free
          </Text>
        </TouchableOpacity>
        
        <Text className="text-sm text-muted text-center mt-2">
          No account needed • Full app access • Data saved locally
        </Text>

        {/* Terms */}
        <Text className="text-xs text-muted text-center mt-8">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </ScreenContainer>
  );
}

function FeatureItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  const colors = useColors();
  
  return (
    <View className="flex-row items-center mb-4">
      <View className="bg-primary/10 rounded-full p-3 mr-4">
        <IconSymbol name={icon as any} size={22} color={colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        <Text className="text-sm text-muted">{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 200,
    height: 250,
  },
});
