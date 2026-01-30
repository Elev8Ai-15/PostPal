import { 
  ScrollView, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { useState, useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const DAYS_OF_WEEK = [
  { id: 0, name: "Sun", short: "S" },
  { id: 1, name: "Mon", short: "M" },
  { id: 2, name: "Tue", short: "T" },
  { id: 3, name: "Wed", short: "W" },
  { id: 4, name: "Thu", short: "T" },
  { id: 5, name: "Fri", short: "F" },
  { id: 6, name: "Sat", short: "S" },
];

const RECURRENCE_TYPES = [
  { id: "daily", name: "Daily" },
  { id: "weekly", name: "Weekly" },
  { id: "biweekly", name: "Bi-weekly" },
  { id: "monthly", name: "Monthly" },
];

const CONTENT_TYPES = [
  { id: "social", name: "Social Post", icon: "message" },
  { id: "blog", name: "Blog Article", icon: "doc.text" },
  { id: "newsletter", name: "Newsletter", icon: "envelope" },
  { id: "video", name: "Video", icon: "video" },
];

const PLATFORMS = [
  { id: "instagram", name: "Instagram" },
  { id: "twitter", name: "Twitter" },
  { id: "linkedin", name: "LinkedIn" },
  { id: "facebook", name: "Facebook" },
  { id: "youtube", name: "YouTube" },
];

interface Template {
  id: number;
  title: string;
  content: string;
  contentType: string;
  platform: string | null;
  recurrenceType: string;
  recurrenceDays: string | null;
  recurrenceTime: string | null;
  isActive: boolean;
  nextScheduledAt: Date | null;
}

function getRecurrenceLabel(template: Template): string {
  const time = template.recurrenceTime || "09:00";
  switch (template.recurrenceType) {
    case "daily":
      return `Daily at ${time}`;
    case "weekly": {
      const days = template.recurrenceDays?.split(",").map(Number) || [];
      const dayNames = days.map(d => DAYS_OF_WEEK.find(dw => dw.id === d)?.name || "").join(", ");
      return `Weekly on ${dayNames} at ${time}`;
    }
    case "biweekly":
      return `Every 2 weeks at ${time}`;
    case "monthly":
      return `Monthly at ${time}`;
    default:
      return template.recurrenceType;
  }
}

export default function TemplatesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<"social" | "blog" | "newsletter" | "video">("social");
  const [platform, setPlatform] = useState<string | undefined>("instagram");
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly");
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Monday by default
  const [recurrenceTime, setRecurrenceTime] = useState("09:00");

  const { data: templates, isLoading, refetch } = trpc.templates.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => refetch(),
  });

  const updateMutation = trpc.templates.update.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const generatePostMutation = trpc.templates.generatePost.useMutation();

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refetch();
      }
    }, [isAuthenticated, refetch])
  );

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setContentType("social");
    setPlatform("instagram");
    setRecurrenceType("weekly");
    setSelectedDays([1]);
    setRecurrenceTime("09:00");
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Error", "Please fill in title and content");
      return;
    }

    setIsCreating(true);
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        contentType,
        platform: contentType === "social" || contentType === "video" ? platform as any : undefined,
        recurrenceType,
        recurrenceDays: recurrenceType === "weekly" ? selectedDays.join(",") : undefined,
        recurrenceTime,
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setShowCreateModal(false);
      resetForm();
      Alert.alert("Success", "Recurring template created!");
    } catch (error) {
      Alert.alert("Error", "Failed to create template");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (template: Template) => {
    triggerHaptic();
    try {
      await updateMutation.mutateAsync({
        id: template.id,
        isActive: !template.isActive,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to update template");
    }
  };

  const handleDelete = (template: Template) => {
    triggerHaptic();
    Alert.alert(
      "Delete Template",
      `Are you sure you want to delete "${template.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync({ id: template.id });
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete template");
            }
          },
        },
      ]
    );
  };

  const handleGenerateNow = async (template: Template) => {
    triggerHaptic();
    try {
      await generatePostMutation.mutateAsync({
        templateId: template.id,
        scheduledAt: new Date(),
      });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Success", "Post generated and scheduled!");
    } catch (error) {
      Alert.alert("Error", "Failed to generate post");
    }
  };

  const toggleDay = (dayId: number) => {
    triggerHaptic();
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId].sort()
    );
  };

  return (
    <ScreenContainer>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => router.back()} 
              className="mr-3 p-1"
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <View>
              <Text className="text-2xl font-bold text-foreground">Recurring Templates</Text>
              <Text className="text-sm text-muted mt-1">Automate your content schedule</Text>
            </View>
          </View>
          {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        {/* Create Button */}
        <View className="px-5 py-4">
          <TouchableOpacity
            className="bg-primary rounded-xl p-4 flex-row items-center justify-center"
            onPress={() => {
              triggerHaptic();
              setShowCreateModal(true);
            }}
            activeOpacity={0.7}
          >
            <IconSymbol name="plus" size={20} color={colors.background} />
            <Text className="text-base font-semibold text-background ml-2">
              Create Recurring Template
            </Text>
          </TouchableOpacity>
        </View>

        {/* Templates List */}
        <View className="px-5 pb-8">
          {templates && templates.length > 0 ? (
            templates.map((template: Template) => (
              <View 
                key={template.id}
                className="bg-surface rounded-xl border border-border mb-3 overflow-hidden"
              >
                <View className="p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-3">
                      <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                        {template.title}
                      </Text>
                      <Text className="text-sm text-muted mt-1" numberOfLines={2}>
                        {template.content}
                      </Text>
                    </View>
                    <TouchableOpacity
                      className={`px-3 py-1.5 rounded-full ${template.isActive ? "bg-success/20" : "bg-muted/20"}`}
                      onPress={() => handleToggleActive(template)}
                      activeOpacity={0.7}
                    >
                      <Text className={`text-xs font-medium ${template.isActive ? "text-success" : "text-muted"}`}>
                        {template.isActive ? "Active" : "Paused"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row items-center mt-3 flex-wrap gap-2">
                    <View className="bg-primary/10 px-2 py-1 rounded-full">
                      <Text className="text-xs text-primary font-medium">{template.contentType}</Text>
                    </View>
                    {template.platform && (
                      <View className="bg-muted/10 px-2 py-1 rounded-full">
                        <Text className="text-xs text-muted">{template.platform}</Text>
                      </View>
                    )}
                    <View className="flex-row items-center">
                      <IconSymbol name="clock" size={12} color={colors.muted} />
                      <Text className="text-xs text-muted ml-1">{getRecurrenceLabel(template)}</Text>
                    </View>
                  </View>

                  {template.nextScheduledAt && (
                    <Text className="text-xs text-muted mt-2">
                      Next: {new Date(template.nextScheduledAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                <View className="flex-row border-t border-border">
                  <TouchableOpacity
                    className="flex-1 py-3 items-center border-r border-border"
                    onPress={() => handleGenerateNow(template)}
                    activeOpacity={0.7}
                  >
                    <Text className="text-sm font-medium text-primary">Generate Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 py-3 items-center"
                    onPress={() => handleDelete(template)}
                    activeOpacity={0.7}
                  >
                    <Text className="text-sm font-medium text-error">Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View className="bg-surface rounded-xl p-6 border border-border items-center">
              <IconSymbol name="calendar" size={40} color={colors.muted} />
              <Text className="text-base font-medium text-foreground mt-3">No templates yet</Text>
              <Text className="text-sm text-muted mt-1 text-center">
                Create recurring templates to automate your content schedule.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Template Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View className="flex-1 bg-background">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-border">
            <TouchableOpacity onPress={() => setShowCreateModal(false)} activeOpacity={0.7}>
              <Text className="text-base text-primary">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-foreground">New Template</Text>
            <TouchableOpacity 
              onPress={handleCreate} 
              activeOpacity={0.7}
              disabled={!title.trim() || !content.trim() || isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text className={`text-base font-semibold ${title.trim() && content.trim() ? "text-primary" : "text-muted"}`}>
                  Create
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
            {/* Title */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Title *</Text>
              <TextInput
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                placeholder="Template title"
                placeholderTextColor={colors.muted}
                value={title}
                onChangeText={setTitle}
                style={{ color: colors.foreground }}
              />
            </View>

            {/* Content */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Content *</Text>
              <TextInput
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                placeholder="Post content..."
                placeholderTextColor={colors.muted}
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={4}
                style={{ minHeight: 100, textAlignVertical: "top", color: colors.foreground }}
              />
            </View>

            {/* Content Type */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Content Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row">
                  {CONTENT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      className={`mr-2 px-4 py-2 rounded-xl border ${
                        contentType === type.id 
                          ? "bg-primary border-primary" 
                          : "bg-surface border-border"
                      }`}
                      onPress={() => {
                        triggerHaptic();
                        setContentType(type.id as any);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text className={`font-medium ${
                        contentType === type.id ? "text-background" : "text-foreground"
                      }`}>
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Platform */}
            {(contentType === "social" || contentType === "video") && (
              <View className="mb-4">
                <Text className="text-sm font-semibold text-foreground mb-2">Platform</Text>
                <View className="flex-row flex-wrap">
                  {PLATFORMS.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      className={`mr-2 mb-2 px-4 py-2 rounded-full border ${
                        platform === p.id 
                          ? "bg-primary border-primary" 
                          : "bg-surface border-border"
                      }`}
                      onPress={() => {
                        triggerHaptic();
                        setPlatform(p.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text className={`font-medium ${
                        platform === p.id ? "text-background" : "text-foreground"
                      }`}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Recurrence Type */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Repeat</Text>
              <View className="flex-row flex-wrap">
                {RECURRENCE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    className={`mr-2 mb-2 px-4 py-2 rounded-full border ${
                      recurrenceType === type.id 
                        ? "bg-primary border-primary" 
                        : "bg-surface border-border"
                    }`}
                    onPress={() => {
                      triggerHaptic();
                      setRecurrenceType(type.id as any);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text className={`font-medium ${
                      recurrenceType === type.id ? "text-background" : "text-foreground"
                    }`}>
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Days of Week (for weekly) */}
            {recurrenceType === "weekly" && (
              <View className="mb-4">
                <Text className="text-sm font-semibold text-foreground mb-2">Days</Text>
                <View className="flex-row justify-between">
                  {DAYS_OF_WEEK.map((day) => (
                    <TouchableOpacity
                      key={day.id}
                      className={`w-10 h-10 rounded-full items-center justify-center ${
                        selectedDays.includes(day.id) 
                          ? "bg-primary" 
                          : "bg-surface border border-border"
                      }`}
                      onPress={() => toggleDay(day.id)}
                      activeOpacity={0.7}
                    >
                      <Text className={`font-semibold ${
                        selectedDays.includes(day.id) ? "text-background" : "text-foreground"
                      }`}>
                        {day.short}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Time */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Time</Text>
              <TextInput
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                placeholder="09:00"
                placeholderTextColor={colors.muted}
                value={recurrenceTime}
                onChangeText={setRecurrenceTime}
                style={{ color: colors.foreground }}
              />
              <Text className="text-xs text-muted mt-1">Format: HH:MM (24-hour)</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
