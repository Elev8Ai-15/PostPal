import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type SocialPlatform = "twitter" | "instagram" | "facebook" | "linkedin" | "tiktok" | "reddit" | "youtube" | "threads" | "bluesky" | "pinterest";

interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  icon: string;
  color: string;
  description: string;
  freeTier: boolean; // Available on free tier
}

interface ConnectedAccount {
  platform: SocialPlatform;
  accountName: string;
  accountId: string;
  connectedAt: string;
  isConnected: boolean;
}

const PLATFORMS: PlatformConfig[] = [
  { id: "twitter", name: "Twitter / X", icon: "message", color: "#000000", description: "Post tweets and threads", freeTier: true },
  { id: "instagram", name: "Instagram", icon: "camera", color: "#E4405F", description: "Share photos, stories, and reels", freeTier: true },
  { id: "facebook", name: "Facebook", icon: "person.fill", color: "#1877F2", description: "Posts, stories, and ads", freeTier: true },
  { id: "linkedin", name: "LinkedIn", icon: "briefcase", color: "#0A66C2", description: "Professional content and articles", freeTier: true },
  { id: "youtube", name: "YouTube", icon: "video", color: "#FF0000", description: "Videos and shorts", freeTier: true },
  { id: "tiktok", name: "TikTok", icon: "music.note", color: "#000000", description: "Short-form videos", freeTier: false },
  { id: "reddit", name: "Reddit", icon: "globe", color: "#FF4500", description: "Community posts and discussions", freeTier: true },
  { id: "threads", name: "Threads", icon: "at", color: "#000000", description: "Text-based conversations", freeTier: true },
  { id: "bluesky", name: "Bluesky", icon: "cloud", color: "#0085FF", description: "Decentralized social posts", freeTier: true },
  { id: "pinterest", name: "Pinterest", icon: "pin", color: "#E60023", description: "Visual discovery and pins", freeTier: true },
];

const STORAGE_KEY = "@postpal_connected_accounts";

export default function SocialAccountsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { tier, limits } = useSubscription();
  const [connecting, setConnecting] = useState<SocialPlatform | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load connected accounts from storage
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAccounts(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load accounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAccounts = async (newAccounts: ConnectedAccount[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newAccounts));
      setAccounts(newAccounts);
    } catch (error) {
      console.error("Failed to save accounts:", error);
    }
  };

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const isConnected = (platformId: SocialPlatform) => {
    return accounts.some(acc => acc.platform === platformId && acc.isConnected);
  };

  const getAccountForPlatform = (platformId: SocialPlatform) => {
    return accounts.find(acc => acc.platform === platformId && acc.isConnected);
  };

  const getConnectedCount = () => {
    return accounts.filter(acc => acc.isConnected).length;
  };

  const getPlatformLimit = () => {
    switch (tier) {
      case "vibe": return 10;
      case "pro": return 7;
      case "basic": return 3;
      default: return 1;
    }
  };

  const canConnectMore = () => {
    return getConnectedCount() < getPlatformLimit();
  };

  const handleConnect = async (platform: PlatformConfig) => {
    triggerHaptic();
    
    // Check if platform is available on current tier
    if (!platform.freeTier && tier === "free") {
      Alert.alert(
        "Upgrade Required",
        `${platform.name} is available on Basic tier and above. Upgrade to connect this platform.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "View Plans", onPress: () => router.push("/subscription") },
        ]
      );
      return;
    }

    // Check platform limit
    if (!canConnectMore()) {
      Alert.alert(
        "Platform Limit Reached",
        `Your ${tier} plan allows ${getPlatformLimit()} connected platform${getPlatformLimit() > 1 ? "s" : ""}. Upgrade to connect more.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/subscription") },
        ]
      );
      return;
    }

    setConnecting(platform.id);
    
    // Show OAuth simulation dialog
    Alert.alert(
      `Connect ${platform.name}`,
      `You'll be redirected to ${platform.name} to authorize PostPal to post on your behalf.\n\nThis is a secure OAuth connection - we never see your password.`,
      [
        { 
          text: "Cancel", 
          style: "cancel",
          onPress: () => setConnecting(null),
        },
        { 
          text: "Authorize", 
          onPress: async () => {
            // Simulate OAuth flow with delay
            setTimeout(async () => {
              try {
                const newAccount: ConnectedAccount = {
                  platform: platform.id,
                  accountName: `@${user?.name?.toLowerCase().replace(/\s/g, "") || "user"}_${platform.id}`,
                  accountId: `${platform.id}_${Date.now()}`,
                  connectedAt: new Date().toISOString(),
                  isConnected: true,
                };
                
                const updatedAccounts = [...accounts.filter(a => a.platform !== platform.id), newAccount];
                await saveAccounts(updatedAccounts);
                
                if (Platform.OS !== "web") {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                
                Alert.alert(
                  "Connected!",
                  `${platform.name} is now connected. You can post directly from PostPal!`
                );
              } catch (error) {
                Alert.alert("Error", `Failed to connect ${platform.name}. Please try again.`);
              } finally {
                setConnecting(null);
              }
            }, 1500);
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
      `Are you sure you want to disconnect ${account.accountName}?\n\nYou'll need to reconnect to post to ${platform.name} again.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Disconnect", 
          style: "destructive",
          onPress: async () => {
            try {
              const updatedAccounts = accounts.filter(a => a.platform !== platform.id);
              await saveAccounts(updatedAccounts);
              
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }
            } catch (error) {
              Alert.alert("Error", `Failed to disconnect ${platform.name}`);
            }
          },
        },
      ]
    );
  };

  const renderPlatformCard = (platform: PlatformConfig) => {
    const connected = isConnected(platform.id);
    const account = getAccountForPlatform(platform.id);
    const isConnectingThis = connecting === platform.id;
    const isPremiumPlatform = !platform.freeTier;
    const isLocked = isPremiumPlatform && tier === "free";

    return (
      <View 
        key={platform.id}
        className="bg-surface rounded-xl mb-3 border border-border overflow-hidden"
        style={isLocked ? { opacity: 0.7 } : undefined}
      >
        <View className="p-4 flex-row items-center">
          <View 
            className="w-12 h-12 rounded-full items-center justify-center mr-4"
            style={{ backgroundColor: `${platform.color}20` }}
          >
            <IconSymbol name={platform.icon as any} size={24} color={platform.color} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-base font-semibold text-foreground">{platform.name}</Text>
              {isPremiumPlatform && (
                <View className="bg-warning/20 px-2 py-0.5 rounded ml-2">
                  <Text className="text-xs font-medium" style={{ color: colors.warning }}>PRO</Text>
                </View>
              )}
            </View>
            {connected && account ? (
              <View className="flex-row items-center mt-0.5">
                <View className="w-2 h-2 rounded-full bg-success mr-1.5" />
                <Text className="text-sm text-success">{account.accountName}</Text>
              </View>
            ) : (
              <Text className="text-sm text-muted">{platform.description}</Text>
            )}
          </View>
          {isConnectingThis ? (
            <View className="px-4 py-2">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
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
          ) : isLocked ? (
            <TouchableOpacity
              className="bg-warning/10 px-4 py-2 rounded-full"
              onPress={() => router.push("/subscription")}
              activeOpacity={0.7}
            >
              <Text className="text-sm font-medium" style={{ color: colors.warning }}>
                Upgrade
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
            <Text className="text-2xl font-bold text-foreground">Social Accounts</Text>
          </View>
          <Text className="text-sm text-muted mt-1 ml-8">
            Connect your accounts for one-tap posting
          </Text>
        </View>

        {/* Connection Status Card */}
        <View className="px-5 pt-4">
          <View className="bg-primary/5 rounded-xl p-4 border border-primary/20 mb-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm text-muted">Connected Platforms</Text>
                <Text className="text-2xl font-bold text-foreground">
                  {getConnectedCount()} / {getPlatformLimit()}
                </Text>
              </View>
              <View className="bg-primary/10 rounded-full p-3">
                <IconSymbol name="share" size={24} color={colors.primary} />
              </View>
            </View>
            {!canConnectMore() && (
              <TouchableOpacity 
                className="mt-3 bg-primary py-2 rounded-lg items-center"
                onPress={() => router.push("/subscription")}
                activeOpacity={0.7}
              >
                <Text className="text-sm font-semibold text-background">
                  Upgrade for More Platforms
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View className="py-8 items-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* Platforms List */}
        {!isLoading && (
          <View className="px-5 pt-2 pb-4">
            <Text className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
              Available Platforms
            </Text>
            {PLATFORMS.map(renderPlatformCard)}
          </View>
        )}

        {/* How It Works */}
        <View className="px-5 pb-4">
          <Text className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            How It Works
          </Text>
          <View className="bg-surface rounded-xl border border-border overflow-hidden">
            <View className="p-4 flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
                <Text className="text-sm font-bold text-background">1</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">Connect Once</Text>
                <Text className="text-sm text-muted mt-0.5">
                  Authorize PostPal to post on your behalf via secure OAuth
                </Text>
              </View>
            </View>
            <View className="h-px bg-border ml-14" />
            <View className="p-4 flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
                <Text className="text-sm font-bold text-background">2</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">Create Content</Text>
                <Text className="text-sm text-muted mt-0.5">
                  Use AI to generate optimized posts for each platform
                </Text>
              </View>
            </View>
            <View className="h-px bg-border ml-14" />
            <View className="p-4 flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
                <Text className="text-sm font-bold text-background">3</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">Post Instantly</Text>
                <Text className="text-sm text-muted mt-0.5">
                  One tap to publish to all connected platforms simultaneously
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Security Info */}
        <View className="px-5 pb-8">
          <View className="bg-success/5 rounded-xl p-4 border border-success/20">
            <View className="flex-row items-center mb-2">
              <IconSymbol name="lock.fill" size={18} color={colors.success} />
              <Text className="text-base font-semibold text-foreground ml-2">Secure Connection</Text>
            </View>
            <Text className="text-sm text-muted leading-5">
              PostPal uses industry-standard OAuth 2.0 for all connections. We never store your 
              passwords and you can revoke access anytime from this screen or directly from each platform.
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
