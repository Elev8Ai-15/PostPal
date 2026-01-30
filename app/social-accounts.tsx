import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

type SocialPlatform = "instagram" | "twitter" | "linkedin" | "facebook" | "youtube";

interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const PLATFORMS: PlatformConfig[] = [
  { id: "instagram", name: "Instagram", icon: "camera", color: "#E4405F", description: "Share photos, stories, and reels" },
  { id: "twitter", name: "Twitter / X", icon: "message", color: "#1DA1F2", description: "Post tweets and threads" },
  { id: "linkedin", name: "LinkedIn", icon: "person.fill", color: "#0A66C2", description: "Professional content and articles" },
  { id: "facebook", name: "Facebook", icon: "person.fill", color: "#1877F2", description: "Posts, stories, and ads" },
  { id: "youtube", name: "YouTube", icon: "video", color: "#FF0000", description: "Videos and shorts" },
];

export default function SocialAccountsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [connecting, setConnecting] = useState<SocialPlatform | null>(null);

  const { data: accounts, isLoading, refetch } = trpc.socialAccounts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const connectMutation = trpc.socialAccounts.connect.useMutation({
    onSuccess: () => {
      refetch();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const disconnectMutation = trpc.socialAccounts.disconnect.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const isConnected = (platformId: SocialPlatform) => {
    return accounts?.some(acc => acc.platform === platformId && acc.isConnected);
  };

  const getAccountForPlatform = (platformId: SocialPlatform) => {
    return accounts?.find(acc => acc.platform === platformId && acc.isConnected);
  };

  const handleConnect = async (platform: PlatformConfig) => {
    triggerHaptic();
    
    if (!isAuthenticated) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to connect your social accounts.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/login") },
        ]
      );
      return;
    }

    setConnecting(platform.id);
    
    // Simulate OAuth flow - in production, this would redirect to the platform's OAuth
    Alert.alert(
      `Connect ${platform.name}`,
      `This would open ${platform.name}'s authorization page. For demo purposes, we'll simulate a successful connection.`,
      [
        { 
          text: "Cancel", 
          style: "cancel",
          onPress: () => setConnecting(null),
        },
        { 
          text: "Connect", 
          onPress: async () => {
            try {
              await connectMutation.mutateAsync({
                platform: platform.id,
                accountName: `Demo ${platform.name} Account`,
                accountId: `demo_${platform.id}_${Date.now()}`,
              });
              Alert.alert("Success", `${platform.name} connected successfully!`);
            } catch (error) {
              Alert.alert("Error", `Failed to connect ${platform.name}`);
            } finally {
              setConnecting(null);
            }
          },
        },
      ]
    );
  };

  const handleDisconnect = (platform: PlatformConfig) => {
    triggerHaptic();
    const account = getAccountForPlatform(platform.id);
    if (!account) return;

    Alert.alert(
      `Disconnect ${platform.name}`,
      `Are you sure you want to disconnect your ${platform.name} account?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Disconnect", 
          style: "destructive",
          onPress: async () => {
            try {
              await disconnectMutation.mutateAsync({ id: account.id });
            } catch (error) {
              Alert.alert("Error", `Failed to disconnect ${platform.name}`);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
            <Text className="text-2xl font-bold text-foreground">Connected Accounts</Text>
          </View>
          <Text className="text-sm text-muted mt-1 ml-8">
            Connect your social media accounts to publish content directly
          </Text>
        </View>

        {/* Loading State */}
        {isLoading && isAuthenticated && (
          <View className="py-8 items-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* Platforms List */}
        <View className="px-5 pt-4 pb-8">
          {PLATFORMS.map((platform) => {
            const connected = isConnected(platform.id);
            const account = getAccountForPlatform(platform.id);
            const isConnecting = connecting === platform.id;

            return (
              <View 
                key={platform.id}
                className="bg-surface rounded-xl mb-3 border border-border overflow-hidden"
              >
                <View className="p-4 flex-row items-center">
                  <View 
                    className="w-12 h-12 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: `${platform.color}20` }}
                  >
                    <IconSymbol name={platform.icon as any} size={24} color={platform.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">{platform.name}</Text>
                    {connected && account ? (
                      <Text className="text-sm text-success">{account.accountName || "Connected"}</Text>
                    ) : (
                      <Text className="text-sm text-muted">{platform.description}</Text>
                    )}
                  </View>
                  {isConnecting ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : connected ? (
                    <TouchableOpacity
                      className="bg-error/10 px-4 py-2 rounded-full"
                      onPress={() => handleDisconnect(platform)}
                      activeOpacity={0.7}
                    >
                      <Text className="text-sm font-medium" style={{ color: colors.error }}>
                        Disconnect
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      className="bg-primary px-4 py-2 rounded-full"
                      onPress={() => handleConnect(platform)}
                      activeOpacity={0.7}
                    >
                      <Text className="text-sm font-medium text-background">Connect</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Info Card */}
        <View className="px-5 pb-8">
          <View className="bg-primary/5 rounded-xl p-4 border border-primary/20">
            <View className="flex-row items-center mb-2">
              <IconSymbol name="info.circle" size={20} color={colors.primary} />
              <Text className="text-base font-semibold text-foreground ml-2">About Connections</Text>
            </View>
            <Text className="text-sm text-muted leading-5">
              PostPal uses secure OAuth to connect to your social accounts. We never store your 
              passwords. You can disconnect any account at any time from this screen.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});
