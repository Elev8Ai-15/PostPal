import { ScrollView, Text, View, TouchableOpacity, TextInput, StyleSheet, Alert, Platform, Modal, FlatList } from "react-native";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useBrand, TONE_OPTIONS, INDUSTRY_OPTIONS, PRESET_COLORS } from "@/hooks/use-brand";
import * as Haptics from "expo-haptics";

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-3">
      <Text className="text-lg font-semibold text-foreground">{title}</Text>
      {subtitle && <Text className="text-sm text-muted mt-0.5">{subtitle}</Text>}
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  const colors = useColors();
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-foreground mb-1.5">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        returnKeyType={multiline ? "default" : "done"}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.foreground,
            minHeight: multiline ? 80 : 44,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
      />
      {maxLength && (
        <Text className="text-xs text-muted mt-1 text-right">
          {value.length}/{maxLength}
        </Text>
      )}
    </View>
  );
}

export default function MyBrandScreen() {
  const colors = useColors();
  const router = useRouter();
  const {
    brand,
    isLoading,
    isSaving,
    isConfigured,
    saveBrand,
    updateField,
    addKeyTopic,
    removeKeyTopic,
    addBrandColor,
    removeBrandColor,
    resetBrand,
  } = useBrand();

  const [newTopic, setNewTopic] = useState("");
  const [showIndustryPicker, setShowIndustryPicker] = useState(false);
  const [showTonePicker, setShowTonePicker] = useState(false);
  const [localBrand, setLocalBrand] = useState(brand);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when brand loads
  useEffect(() => {
    setLocalBrand(brand);
  }, [brand]);

  // Update local state and track changes
  const handleFieldChange = useCallback((field: keyof typeof brand, value: any) => {
    setLocalBrand(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSave = async () => {
    triggerHaptic();
    const success = await saveBrand(localBrand);
    if (success) {
      setHasChanges(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Saved!", "Your brand settings have been saved. AI-generated content will now be personalized to your brand.");
    } else {
      Alert.alert("Error", "Failed to save brand settings. Please try again.");
    }
  };

  const handleAddTopic = async () => {
    if (!newTopic.trim()) return;
    triggerHaptic();
    const updated = [...localBrand.keyTopics, newTopic.trim()];
    setLocalBrand(prev => ({ ...prev, keyTopics: updated }));
    setHasChanges(true);
    setNewTopic("");
  };

  const handleRemoveTopic = (topic: string) => {
    triggerHaptic();
    const updated = localBrand.keyTopics.filter(t => t !== topic);
    setLocalBrand(prev => ({ ...prev, keyTopics: updated }));
    setHasChanges(true);
  };

  const handleToggleColor = (color: string) => {
    triggerHaptic();
    const updated = localBrand.brandColors.includes(color)
      ? localBrand.brandColors.filter(c => c !== color)
      : [...localBrand.brandColors, color];
    setLocalBrand(prev => ({ ...prev, brandColors: updated }));
    setHasChanges(true);
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Brand Settings",
      "This will clear all your brand information. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await resetBrand();
            setLocalBrand({
              brandName: "",
              tagline: "",
              industry: "",
              toneOfVoice: "professional",
              targetAudience: "",
              brandColors: [],
              keyTopics: [],
              website: "",
              uniqueSellingPoint: "",
            });
            setHasChanges(false);
          },
        },
      ]
    );
  };

  const selectedTone = TONE_OPTIONS.find(t => t.id === localBrand.toneOfVoice);

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Loading brand settings...</Text>
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
              <Text className="text-2xl font-bold text-foreground">My Brand</Text>
              <Text className="text-sm text-muted">Personalize your AI-generated content</Text>
            </View>
            {hasChanges && (
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.7}
              >
                <Text className="text-sm font-semibold text-background">Save</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Brand Status Card */}
          <View
            className="rounded-xl p-4 mb-6"
            style={{ backgroundColor: isConfigured ? `${colors.success}15` : `${colors.primary}15` }}
          >
            <View className="flex-row items-center">
              <View
                className="rounded-full p-2 mr-3"
                style={{ backgroundColor: isConfigured ? `${colors.success}25` : `${colors.primary}25` }}
              >
                <IconSymbol
                  name={isConfigured ? "checkmark.seal.fill" : "paintbrush"}
                  size={24}
                  color={isConfigured ? colors.success : colors.primary}
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">
                  {isConfigured ? `${localBrand.brandName}` : "Set Up Your Brand"}
                </Text>
                <Text className="text-sm text-muted mt-0.5">
                  {isConfigured
                    ? "AI content will be personalized to your brand"
                    : "Add your brand info for personalized AI content"}
                </Text>
              </View>
            </View>
          </View>

          {/* Brand Name */}
          <SectionHeader title="Brand Identity" subtitle="The basics of your brand" />
          <InputField
            label="Brand Name"
            value={localBrand.brandName}
            onChangeText={(text) => handleFieldChange("brandName", text)}
            placeholder="e.g., Elev8AI"
            maxLength={50}
          />

          <InputField
            label="Tagline / Slogan"
            value={localBrand.tagline}
            onChangeText={(text) => handleFieldChange("tagline", text)}
            placeholder="e.g., Elevate Your Business with AI"
            maxLength={100}
          />

          <InputField
            label="Website"
            value={localBrand.website}
            onChangeText={(text) => handleFieldChange("website", text)}
            placeholder="e.g., https://elev8ai.com"
            maxLength={200}
          />

          {/* Industry Picker */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-foreground mb-1.5">Industry</Text>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                setShowIndustryPicker(true);
              }}
              style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={{ color: localBrand.industry ? colors.foreground : colors.muted }}>
                {localBrand.industry || "Select your industry"}
              </Text>
              <IconSymbol name="chevron.down" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Tone of Voice */}
          <View className="mb-6 mt-4">
            <SectionHeader title="Tone of Voice" subtitle="How your brand communicates" />
            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                setShowTonePicker(true);
              }}
              style={[styles.toneCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <View className="rounded-full p-2 mr-3" style={{ backgroundColor: `${colors.primary}20` }}>
                  <IconSymbol name="megaphone" size={20} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-foreground">
                    {selectedTone?.label || "Professional"}
                  </Text>
                  <Text className="text-sm text-muted">
                    {selectedTone?.description || "Polished, authoritative, and business-focused"}
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={18} color={colors.muted} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Target Audience */}
          <SectionHeader title="Target Audience" subtitle="Who you're creating content for" />
          <InputField
            label="Describe Your Ideal Customer"
            value={localBrand.targetAudience}
            onChangeText={(text) => handleFieldChange("targetAudience", text)}
            placeholder="e.g., Small business owners aged 30-55 looking to grow with AI and digital marketing"
            multiline
            maxLength={300}
          />

          <InputField
            label="Unique Selling Point"
            value={localBrand.uniqueSellingPoint}
            onChangeText={(text) => handleFieldChange("uniqueSellingPoint", text)}
            placeholder="e.g., We make AI accessible and affordable for small businesses"
            multiline
            maxLength={200}
          />

          {/* Brand Colors */}
          <View className="mb-6 mt-2">
            <SectionHeader title="Brand Colors" subtitle="Select colors that represent your brand" />
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => handleToggleColor(color)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    localBrand.brandColors.includes(color) && styles.colorSwatchSelected,
                    localBrand.brandColors.includes(color) && { borderColor: colors.foreground },
                  ]}
                  activeOpacity={0.7}
                >
                  {localBrand.brandColors.includes(color) && (
                    <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {localBrand.brandColors.length > 0 && (
              <Text className="text-xs text-muted mt-2">
                {localBrand.brandColors.length} color{localBrand.brandColors.length !== 1 ? "s" : ""} selected
              </Text>
            )}
          </View>

          {/* Key Topics */}
          <View className="mb-6">
            <SectionHeader title="Key Topics & Themes" subtitle="Topics your content should focus on" />
            <View className="flex-row items-center mb-3">
              <TextInput
                value={newTopic}
                onChangeText={setNewTopic}
                placeholder="Add a topic (e.g., AI, Marketing)"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
                onSubmitEditing={handleAddTopic}
                style={[
                  styles.input,
                  {
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.foreground,
                    marginRight: 8,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={handleAddTopic}
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.7}
              >
                <IconSymbol name="plus" size={20} color={colors.background} />
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {localBrand.keyTopics.map((topic) => (
                <TouchableOpacity
                  key={topic}
                  onPress={() => handleRemoveTopic(topic)}
                  style={[styles.topicChip, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: colors.primary, fontSize: 14 }}>{topic}</Text>
                  <IconSymbol name="xmark" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
              {localBrand.keyTopics.length === 0 && (
                <Text className="text-sm text-muted">No topics added yet. Add topics to guide your AI content.</Text>
              )}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            style={[
              styles.mainSaveButton,
              { backgroundColor: hasChanges ? colors.primary : colors.border },
            ]}
            activeOpacity={0.7}
            disabled={!hasChanges && !isSaving}
          >
            <Text
              className="text-base font-semibold"
              style={{ color: hasChanges ? colors.background : colors.muted }}
            >
              {isSaving ? "Saving..." : hasChanges ? "Save Brand Settings" : "No Changes to Save"}
            </Text>
          </TouchableOpacity>

          {/* Reset */}
          {isConfigured && (
            <TouchableOpacity
              onPress={handleReset}
              className="items-center mt-4 mb-4"
              activeOpacity={0.7}
            >
              <Text className="text-sm" style={{ color: colors.error }}>
                Reset All Brand Settings
              </Text>
            </TouchableOpacity>
          )}

          {/* Info Card */}
          <View
            className="rounded-xl p-4 mt-2 mb-8"
            style={{ backgroundColor: `${colors.primary}10` }}
          >
            <View className="flex-row items-start">
              <IconSymbol name="sparkles" size={20} color={colors.primary} style={{ marginTop: 2 }} />
              <View className="flex-1 ml-3">
                <Text className="text-sm font-semibold text-foreground mb-1">
                  How Brand Settings Work
                </Text>
                <Text className="text-sm text-muted leading-5">
                  Your brand information is used to personalize all AI-generated content. The AI will match your tone of voice, reference your industry, and tailor messaging to your target audience. The more details you provide, the better your content will be.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Industry Picker Modal */}
      <Modal visible={showIndustryPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View className="flex-row items-center justify-between px-5 py-4 border-b" style={{ borderBottomColor: colors.border }}>
              <Text className="text-lg font-semibold text-foreground">Select Industry</Text>
              <TouchableOpacity onPress={() => setShowIndustryPicker(false)}>
                <IconSymbol name="xmark" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={INDUSTRY_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic();
                    handleFieldChange("industry", item);
                    setShowIndustryPicker(false);
                  }}
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: colors.border },
                    localBrand.industry === item && { backgroundColor: `${colors.primary}10` },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-base"
                    style={{ color: localBrand.industry === item ? colors.primary : colors.foreground }}
                  >
                    {item}
                  </Text>
                  {localBrand.industry === item && (
                    <IconSymbol name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </View>
      </Modal>

      {/* Tone Picker Modal */}
      <Modal visible={showTonePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View className="flex-row items-center justify-between px-5 py-4 border-b" style={{ borderBottomColor: colors.border }}>
              <Text className="text-lg font-semibold text-foreground">Tone of Voice</Text>
              <TouchableOpacity onPress={() => setShowTonePicker(false)}>
                <IconSymbol name="xmark" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TONE_OPTIONS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic();
                    handleFieldChange("toneOfVoice", item.id);
                    setShowTonePicker(false);
                  }}
                  style={[
                    styles.tonePickerItem,
                    { borderBottomColor: colors.border },
                    localBrand.toneOfVoice === item.id && { backgroundColor: `${colors.primary}10` },
                  ]}
                  activeOpacity={0.7}
                >
                  <View className="flex-1">
                    <Text
                      className="text-base font-medium"
                      style={{ color: localBrand.toneOfVoice === item.id ? colors.primary : colors.foreground }}
                    >
                      {item.label}
                    </Text>
                    <Text className="text-sm text-muted mt-0.5">{item.description}</Text>
                  </View>
                  {localBrand.toneOfVoice === item.id && (
                    <IconSymbol name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </View>
      </Modal>
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  pickerButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toneCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorSwatchSelected: {
    borderWidth: 3,
  },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mainSaveButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  tonePickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
});
