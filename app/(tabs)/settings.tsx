import { ScrollView, Text, View, TouchableOpacity, Switch, StyleSheet, Alert, Platform } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

function SettingItem({ icon, title, subtitle, onPress, rightElement, showChevron = true }: SettingItemProps) {
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
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleToggle = (setter: (value: boolean) => void, currentValue: boolean) => {
    triggerHaptic();
    setter(!currentValue);
  };

  const handlePress = (title: string) => {
    triggerHaptic();
    Alert.alert(title, `${title} settings would open here.`);
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
            onPress={() => handlePress("Profile")}
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
              <Text className="text-sm text-primary mt-1">View Profile</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <SettingSection title="Notifications">
          <SettingItem
            icon="bell.fill"
            title="Push Notifications"
            subtitle="Get notified about new content"
            showChevron={false}
            rightElement={
              <Switch
                value={pushNotifications}
                onValueChange={() => handleToggle(setPushNotifications, pushNotifications)}
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
                value={emailNotifications}
                onValueChange={() => handleToggle(setEmailNotifications, emailNotifications)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
              />
            }
          />
        </SettingSection>

        {/* Content Preferences */}
        <SettingSection title="Content Preferences">
          <SettingItem
            icon="calendar"
            title="Posting Schedule"
            subtitle="Set your default posting times"
            onPress={() => handlePress("Posting Schedule")}
          />
          <Divider />
          <SettingItem
            icon="doc.text"
            title="Content Types"
            subtitle="Choose what content to generate"
            onPress={() => handlePress("Content Types")}
          />
          <Divider />
          <SettingItem
            icon="checkmark.circle.fill"
            title="Auto-Approve Low Risk"
            subtitle="Automatically approve safe content"
            showChevron={false}
            rightElement={
              <Switch
                value={autoApprove}
                onValueChange={() => handleToggle(setAutoApprove, autoApprove)}
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

        {/* Connected Accounts */}
        <SettingSection title="Connected Accounts">
          <SettingItem
            icon="share"
            title="Manage Social Accounts"
            subtitle="Connect Instagram, Twitter, LinkedIn, and more"
            onPress={() => router.push("/social-accounts")}
          />
        </SettingSection>

        {/* App Settings */}
        <SettingSection title="App Settings">
          <SettingItem
            icon="eye"
            title="Dark Mode"
            subtitle="Switch to dark theme"
            showChevron={false}
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={() => handleToggle(setDarkMode, darkMode)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
              />
            }
          />
          <Divider />
          <SettingItem
            icon="info.circle"
            title="About PostPal"
            subtitle="Version 1.0.0"
            onPress={() => handlePress("About")}
          />
          <Divider />
          <SettingItem
            icon="questionmark.circle"
            title="Help & Support"
            onPress={() => handlePress("Help & Support")}
          />
        </SettingSection>

        {/* Sign Out */}
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
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});
