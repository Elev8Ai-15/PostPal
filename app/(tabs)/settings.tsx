import { ScrollView, Text, View, TouchableOpacity, Switch, StyleSheet, Alert, Platform } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useBrand } from "@/hooks/use-brand";
import { isApiConfigured } from "@/lib/upload-post-api";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "postpal_app_settings";

interface AppSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  autoApprove: boolean;
}

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  badge?: string;
  badgeColor?: string;
}

function SettingItem({ icon, title, subtitle, onPress, rightElement, showChevron = true, badge, badgeColor }: SettingItemProps) {
  const colors = useColors();
  
  const content = (
    <View className="flex-row items-center py-3.5 px-4">
      <View className="bg-primary/10 rounded-lg p-2 mr-3">
        <IconSymbol name={icon as any} size={20} color={colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-base text-foreground">{title}</Text>
        {subtitle && <Text className="text-sm text-muted mt-0.5">{subtitle}</Text>}
      </View>
      {badge && (
        <View className="px-2 py-0.5 rounded-full mr-2" style={{ backgroundColor: (badgeColor || colors.success) + "20" }}>
          <Text className="text-xs font-medium" style={{ color: badgeColor || colors.success }}>{badge}</Text>
        </View>
      )}
      {rightElement}
      {showChevron && !rightElement && (
        <IconSymbol name="chevron.right" size={18} color={colors.muted} />
      )}
    </View>
  );
  
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  
  return content;
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-sm font-semibold text-muted uppercase tracking-wide px-5 mb-2">
        {title}
      </Text>
      <View className="bg-surface mx-4 rounded-xl border border-border overflow-hidden">
        {children}
      </View>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-border ml-14" />;
}

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { brand, isConfigured: isBrandConfigured } = useBrand();
  const [settings, setSettings] = useState<AppSettings>({
    pushNotifications: true,
    emailNotifications: true,
    autoApprove: false,
  });
  const [uploadPostConnected, setUploadPostConnected] = useState(false);

  // Load settings from AsyncStorage
  const loadSettings = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        setSettings(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  }, []);

  const checkUploadPost = useCallback(async () => {
    const configured = await isApiConfigured();
    setUploadPostConnected(configured);
  }, []);

  useEffect(() => {
    loadSettings();
    checkUploadPost();
  }, [loadSettings, checkUploadPost]);

  useFocusEffect(
    useCallback(() => {
      checkUploadPost();
    }, [checkUploadPost])
  );

  const saveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  };

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleToggle = (key: keyof AppSettings) => {
    triggerHaptic();
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const handleSignOut = () => {
    triggerHaptic();
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: async () => {
          await logout();
          router.replace("/login");
        }},
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
        {/* Header with Logo */}
        <View className="px-5 pt-4 pb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Image
              source={require("@/assets/images/logo-header.png")}
              style={{ width: 100, height: 35 }}
              contentFit="contain"
            />
          </View>
          <Text className="text-2xl font-bold text-foreground">Settings</Text>
          <Text className="text-sm text-muted mt-1">Manage your account and preferences</Text>
        </View>

        {/* Profile Section */}
        <View className="px-5 mb-6">
          <TouchableOpacity 
            className="bg-surface rounded-xl p-4 border border-border flex-row items-center"
            onPress={() => {
              triggerHaptic();
              if (!isAuthenticated) {
                router.push("/login");
              }
            }}
            activeOpacity={0.7}
          >
            <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mr-4">
              <Text className="text-2xl font-bold text-background">
                {user?.name?.charAt(0) || "U"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-foreground">
                {user?.name || "Guest User"}
              </Text>
              <Text className="text-sm text-muted">
                {user?.email || "Not signed in"}
              </Text>
              <Text className="text-sm text-primary mt-1">
                {isAuthenticated ? "View Profile" : "Sign In"}
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* My Brand */}
        <SettingSection title="My Brand">
          <SettingItem
            icon="paintbrush"
            title="Brand Settings"
            subtitle={isBrandConfigured ? brand.brandName : "Set up your brand for personalized content"}
            badge={isBrandConfigured ? "Active" : undefined}
            badgeColor={colors.success}
            onPress={() => router.push("/my-brand")}
          />
        </SettingSection>

        {/* Connected Accounts */}
        <SettingSection title="Connected Accounts">
          <SettingItem
            icon="share"
            title="Social Accounts"
            subtitle="Connect Instagram, X, LinkedIn, and more"
            onPress={() => router.push("/social-accounts")}
          />
          <Divider />
          <SettingItem
            icon="bolt.fill"
            title="Upload-Post API"
            subtitle={uploadPostConnected ? "Connected — real posting enabled" : "Enable one-tap posting to all platforms"}
            badge={uploadPostConnected ? "Connected" : undefined}
            badgeColor={uploadPostConnected ? colors.success : undefined}
            onPress={() => router.push("/upload-post-settings")}
          />
        </SettingSection>

        {/* Notifications */}
        <SettingSection title="Notifications">
          <SettingItem
            icon="bell.fill"
            title="Push Notifications"
            subtitle="Get notified about new content"
            showChevron={false}
            rightElement={
              <Switch
                value={settings.pushNotifications}
                onValueChange={() => handleToggle("pushNotifications")}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
              />
            }
          />
          <Divider />
          <SettingItem
            icon="envelope"
            title="Email Notifications"
            subtitle="Receive weekly summaries"
            showChevron={false}
            rightElement={
              <Switch
                value={settings.emailNotifications}
                onValueChange={() => handleToggle("emailNotifications")}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
              />
            }
          />
        </SettingSection>

        {/* Content Preferences */}
        <SettingSection title="Content Preferences">
          <SettingItem
            icon="checkmark.circle.fill"
            title="Auto-Approve Low Risk"
            subtitle="Automatically approve safe content"
            showChevron={false}
            rightElement={
              <Switch
                value={settings.autoApprove}
                onValueChange={() => handleToggle("autoApprove")}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
              />
            }
          />
        </SettingSection>

        {/* Subscription */}
        <SettingSection title="Subscription">
          <SettingItem
            icon="crown.fill"
            title="Manage Subscription"
            subtitle="View plans and billing"
            onPress={() => router.push("/subscription")}
          />
          <Divider />
          <SettingItem
            icon="chart.bar.fill"
            title="Usage Dashboard"
            subtitle="View your usage and limits"
            onPress={() => router.push("/usage-dashboard")}
          />
        </SettingSection>

        {/* App Info */}
        <SettingSection title="App">
          <SettingItem
            icon="info.circle"
            title="About PostPal"
            subtitle="Version 1.0.0"
            showChevron={false}
          />
        </SettingSection>

        {/* Sign Out */}
        {isAuthenticated && (
          <View className="px-5 pb-8">
            <TouchableOpacity 
              className="bg-error/10 rounded-xl py-4 items-center"
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <Text className="text-base font-semibold" style={{ color: colors.error }}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});
