import { ScrollView, Text, View, TouchableOpacity, TextInput, StyleSheet, Alert, Platform, ActivityIndicator, Linking } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getApiConfig,
  saveApiConfig,
  clearApiConfig,
  validateApiKey,
  isApiConfigured,
  type UploadPostConfig,
} from "@/lib/upload-post-api";
import * as Haptics from "expo-haptics";

export default function UploadPostSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [userProfile, setUserProfile] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [validationStatus, setValidationStatus] = useState<"none" | "valid" | "invalid">("none");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getApiConfig();
      if (config) {
        setApiKey(config.apiKey);
        setUserProfile(config.userProfile);
        setIsConfigured(true);
        setValidationStatus("valid");
      }
    } catch (error) {
      console.error("Failed to load Upload-Post config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      Alert.alert("API Key Required", "Please enter your Upload-Post API key.");
      return;
    }

    triggerHaptic();
    setIsValidating(true);
    setValidationStatus("none");

    try {
      const result = await validateApiKey(apiKey.trim());
      if (result.valid) {
        setValidationStatus("valid");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Valid!", "Your API key is valid and connected.");
      } else {
        setValidationStatus("invalid");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert("Invalid Key", result.error || "The API key could not be validated.");
      }
    } catch (error: any) {
      setValidationStatus("invalid");
      Alert.alert("Error", error.message || "Failed to validate API key.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert("API Key Required", "Please enter your Upload-Post API key.");
      return;
    }
    if (!userProfile.trim()) {
      Alert.alert("User Profile Required", "Please enter your Upload-Post user profile name.");
      return;
    }

    triggerHaptic();
    setIsSaving(true);

    try {
      await saveApiConfig({
        apiKey: apiKey.trim(),
        userProfile: userProfile.trim(),
      });
      setIsConfigured(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "Saved!",
        "Upload-Post API is now configured. You can post directly to all connected platforms from the Create screen.",
      );
    } catch (error: any) {
      Alert.alert("Error", "Failed to save configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      "Disconnect Upload-Post",
      "This will remove your API key and disable real posting. You can still use copy-to-clipboard posting.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            await clearApiConfig();
            setApiKey("");
            setUserProfile("");
            setIsConfigured(false);
            setValidationStatus("none");
          },
        },
      ],
    );
  };

  const handleOpenDashboard = () => {
    Linking.openURL("https://app.upload-post.com/");
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-4">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: colors.surface }]}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <View className="flex-1 ml-3">
              <Text className="text-2xl font-bold text-foreground">Upload-Post API</Text>
              <Text className="text-sm text-muted">Real one-tap posting to all platforms</Text>
            </View>
          </View>

          {/* Status Card */}
          <View
            className="rounded-xl p-4 mb-6"
            style={{
              backgroundColor: isConfigured ? `${colors.success}15` : `${colors.warning}15`,
            }}
          >
            <View className="flex-row items-center">
              <View
                className="rounded-full p-2 mr-3"
                style={{
                  backgroundColor: isConfigured ? `${colors.success}25` : `${colors.warning}25`,
                }}
              >
                <IconSymbol
                  name={isConfigured ? "checkmark.seal.fill" : "bolt.fill"}
                  size={24}
                  color={isConfigured ? colors.success : colors.warning}
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">
                  {isConfigured ? "Connected" : "Not Connected"}
                </Text>
                <Text className="text-sm text-muted mt-0.5">
                  {isConfigured
                    ? "Real posting is enabled for all connected platforms"
                    : "Connect to enable real posting (currently using copy-to-clipboard)"}
                </Text>
              </View>
            </View>
          </View>

          {/* How It Works */}
          <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: `${colors.primary}10` }}>
            <Text className="text-base font-semibold text-foreground mb-2">How It Works</Text>
            <View style={{ gap: 8 }}>
              <View className="flex-row items-start">
                <View className="rounded-full w-6 h-6 items-center justify-center mr-3 mt-0.5" style={{ backgroundColor: colors.primary }}>
                  <Text className="text-xs font-bold text-background">1</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-foreground font-medium">Create a free Upload-Post account</Text>
                  <Text className="text-xs text-muted">Visit app.upload-post.com and sign up</Text>
                </View>
              </View>
              <View className="flex-row items-start">
                <View className="rounded-full w-6 h-6 items-center justify-center mr-3 mt-0.5" style={{ backgroundColor: colors.primary }}>
                  <Text className="text-xs font-bold text-background">2</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-foreground font-medium">Connect your social accounts there</Text>
                  <Text className="text-xs text-muted">Link Instagram, TikTok, Twitter/X, etc.</Text>
                </View>
              </View>
              <View className="flex-row items-start">
                <View className="rounded-full w-6 h-6 items-center justify-center mr-3 mt-0.5" style={{ backgroundColor: colors.primary }}>
                  <Text className="text-xs font-bold text-background">3</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-foreground font-medium">Copy your API key and user profile here</Text>
                  <Text className="text-xs text-muted">PostPal will post directly to your accounts</Text>
                </View>
              </View>
            </View>
          </View>

          {/* API Key Input */}
          <Text className="text-sm font-medium text-foreground mb-1.5">API Key</Text>
          <View className="flex-row items-center mb-1">
            <TextInput
              value={apiKey}
              onChangeText={(text) => {
                setApiKey(text);
                setValidationStatus("none");
              }}
              placeholder="Paste your Upload-Post API key"
              placeholderTextColor={colors.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderColor: validationStatus === "valid" ? colors.success : validationStatus === "invalid" ? colors.error : colors.border,
                  color: colors.foreground,
                  marginRight: 8,
                },
              ]}
            />
            <TouchableOpacity
              onPress={handleValidate}
              disabled={isValidating || !apiKey.trim()}
              style={[
                styles.validateButton,
                {
                  backgroundColor: apiKey.trim() ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              {isValidating ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text className="text-sm font-semibold" style={{ color: apiKey.trim() ? colors.background : colors.muted }}>
                  Test
                </Text>
              )}
            </TouchableOpacity>
          </View>
          {validationStatus === "valid" && (
            <Text className="text-xs mb-3" style={{ color: colors.success }}>
              API key is valid
            </Text>
          )}
          {validationStatus === "invalid" && (
            <Text className="text-xs mb-3" style={{ color: colors.error }}>
              Invalid API key - check and try again
            </Text>
          )}
          {validationStatus === "none" && <View style={{ height: 16 }} />}

          {/* User Profile Input */}
          <Text className="text-sm font-medium text-foreground mb-1.5">User Profile</Text>
          <TextInput
            value={userProfile}
            onChangeText={setUserProfile}
            placeholder="Your Upload-Post username"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.foreground,
                marginBottom: 16,
              },
            ]}
          />
          <Text className="text-xs text-muted mb-6 -mt-3">
            This is the username you created on Upload-Post (found in your dashboard)
          </Text>

          {/* Save / Disconnect Buttons */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || !apiKey.trim() || !userProfile.trim()}
            style={[
              styles.mainButton,
              {
                backgroundColor: apiKey.trim() && userProfile.trim() ? colors.primary : colors.border,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text
              className="text-base font-semibold"
              style={{
                color: apiKey.trim() && userProfile.trim() ? colors.background : colors.muted,
              }}
            >
              {isSaving ? "Saving..." : isConfigured ? "Update Configuration" : "Save & Connect"}
            </Text>
          </TouchableOpacity>

          {isConfigured && (
            <TouchableOpacity
              onPress={handleDisconnect}
              className="items-center mt-4"
              activeOpacity={0.7}
            >
              <Text className="text-sm" style={{ color: colors.error }}>
                Disconnect Upload-Post
              </Text>
            </TouchableOpacity>
          )}

          {/* Open Dashboard Link */}
          <TouchableOpacity
            onPress={handleOpenDashboard}
            style={[styles.dashboardLink, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <IconSymbol name="globe" size={20} color={colors.primary} />
              <View className="flex-1 ml-3">
                <Text className="text-base font-medium text-foreground">
                  Open Upload-Post Dashboard
                </Text>
                <Text className="text-sm text-muted">
                  Manage accounts, get API key, view analytics
                </Text>
              </View>
              <IconSymbol name="arrow.up.right" size={16} color={colors.muted} />
            </View>
          </TouchableOpacity>

          {/* Supported Platforms */}
          <View className="mt-6 mb-8">
            <Text className="text-base font-semibold text-foreground mb-3">Supported Platforms</Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {[
                { name: "Instagram", color: "#E4405F" },
                { name: "TikTok", color: "#000000" },
                { name: "Twitter/X", color: "#1DA1F2" },
                { name: "Facebook", color: "#1877F2" },
                { name: "LinkedIn", color: "#0A66C2" },
                { name: "YouTube", color: "#FF0000" },
                { name: "Reddit", color: "#FF4500" },
                { name: "Threads", color: "#000000" },
                { name: "Bluesky", color: "#0085FF" },
                { name: "Pinterest", color: "#E60023" },
              ].map((platform) => (
                <View
                  key={platform.name}
                  style={[styles.platformChip, { borderColor: `${platform.color}40` }]}
                >
                  <View
                    style={[styles.platformDot, { backgroundColor: platform.color }]}
                  />
                  <Text className="text-sm text-foreground">{platform.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Info */}
          <View className="rounded-xl p-4 mb-8" style={{ backgroundColor: `${colors.primary}08` }}>
            <View className="flex-row items-start">
              <IconSymbol name="lock.fill" size={16} color={colors.muted} style={{ marginTop: 2 }} />
              <Text className="text-xs text-muted ml-2 flex-1 leading-4">
                Your API key is stored securely on your device only. PostPal never sends your credentials to our servers. Upload-Post handles all OAuth connections with social platforms.
              </Text>
            </View>
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
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    height: 44,
  },
  validateButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mainButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  dashboardLink: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  platformChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  platformDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
});
