import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform as RNPlatform,
} from "react-native";
import { useState, useEffect } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ["00", "15", "30", "45"];
const PERIODS = ["AM", "PM"];

interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onSchedule: (data: ScheduleData) => void;
  selectedDate: Date;
  existingPost?: {
    id: number;
    title: string;
    content: string;
    contentType: string;
    platform?: string;
    scheduledAt?: Date;
  };
  isLoading?: boolean;
}

export interface ScheduleData {
  title: string;
  content: string;
  contentType: "social" | "blog" | "newsletter" | "video";
  platform?: "instagram" | "twitter" | "linkedin" | "facebook" | "youtube" | "email" | "blog";
  scheduledAt: Date;
  postId?: number;
}

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

export function ScheduleModal({ 
  visible, 
  onClose, 
  onSchedule, 
  selectedDate,
  existingPost,
  isLoading = false,
}: ScheduleModalProps) {
  const colors = useColors();
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<"social" | "blog" | "newsletter" | "video">("social");
  const [platform, setPlatform] = useState<string | undefined>("instagram");
  
  // Time picker state
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState("00");
  const [selectedPeriod, setSelectedPeriod] = useState("AM");

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      if (existingPost) {
        setTitle(existingPost.title);
        setContent(existingPost.content);
        setContentType(existingPost.contentType as any);
        setPlatform(existingPost.platform);
        if (existingPost.scheduledAt) {
          const date = new Date(existingPost.scheduledAt);
          const hours = date.getHours();
          setSelectedHour(hours > 12 ? hours - 12 : hours === 0 ? 12 : hours);
          setSelectedMinute(String(Math.floor(date.getMinutes() / 15) * 15).padStart(2, "0"));
          setSelectedPeriod(hours >= 12 ? "PM" : "AM");
        }
      } else {
        setTitle("");
        setContent("");
        setContentType("social");
        setPlatform("instagram");
        setSelectedHour(9);
        setSelectedMinute("00");
        setSelectedPeriod("AM");
      }
    }
  }, [visible, existingPost]);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSchedule = () => {
    if (!title.trim()) {
      return;
    }

    triggerHaptic();

    // Convert to 24-hour format
    let hour24 = selectedHour;
    if (selectedPeriod === "PM" && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedPeriod === "AM" && selectedHour === 12) {
      hour24 = 0;
    }

    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(hour24, parseInt(selectedMinute), 0, 0);

    onSchedule({
      title: title.trim(),
      content: content.trim() || title.trim(),
      contentType,
      platform: contentType === "social" || contentType === "video" ? platform as any : undefined,
      scheduledAt,
      postId: existingPost?.id,
    });
  };

  const formatSelectedDate = () => {
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatSelectedTime = () => {
    return `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-border">
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text className="text-base text-primary">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-foreground">
            {existingPost ? "Edit Schedule" : "Schedule Content"}
          </Text>
          <TouchableOpacity 
            onPress={handleSchedule} 
            activeOpacity={0.7}
            disabled={!title.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text className={`text-base font-semibold ${title.trim() ? "text-primary" : "text-muted"}`}>
                {existingPost ? "Update" : "Schedule"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          className="flex-1" 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date Display */}
          <View className="px-5 pt-5">
            <View className="bg-primary/10 rounded-xl p-4 flex-row items-center">
              <IconSymbol name="calendar" size={24} color={colors.primary} />
              <View className="ml-3">
                <Text className="text-sm text-muted">Scheduled for</Text>
                <Text className="text-base font-semibold text-foreground">
                  {formatSelectedDate()}
                </Text>
              </View>
            </View>
          </View>

          {/* Time Picker */}
          <View className="px-5 pt-5">
            <Text className="text-sm font-semibold text-foreground mb-3">Select Time</Text>
            <View className="bg-surface rounded-xl border border-border p-4">
              <View className="flex-row items-center justify-center">
                {/* Hour Picker */}
                <View className="items-center">
                  <Text className="text-xs text-muted mb-2">Hour</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.timePickerRow}
                  >
                    {HOURS.map((hour) => (
                      <TouchableOpacity
                        key={hour}
                        className={`w-12 h-12 rounded-xl items-center justify-center mx-1 ${
                          selectedHour === hour ? "bg-primary" : "bg-background"
                        }`}
                        onPress={() => {
                          triggerHaptic();
                          setSelectedHour(hour);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text className={`text-lg font-semibold ${
                          selectedHour === hour ? "text-background" : "text-foreground"
                        }`}>
                          {hour}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View className="flex-row items-center justify-center mt-4">
                {/* Minute Picker */}
                <View className="items-center mr-4">
                  <Text className="text-xs text-muted mb-2">Minute</Text>
                  <View className="flex-row">
                    {MINUTES.map((minute) => (
                      <TouchableOpacity
                        key={minute}
                        className={`w-14 h-10 rounded-lg items-center justify-center mx-1 ${
                          selectedMinute === minute ? "bg-primary" : "bg-background"
                        }`}
                        onPress={() => {
                          triggerHaptic();
                          setSelectedMinute(minute);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text className={`text-base font-medium ${
                          selectedMinute === minute ? "text-background" : "text-foreground"
                        }`}>
                          :{minute}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* AM/PM Picker */}
                <View className="items-center">
                  <Text className="text-xs text-muted mb-2">Period</Text>
                  <View className="flex-row">
                    {PERIODS.map((period) => (
                      <TouchableOpacity
                        key={period}
                        className={`w-14 h-10 rounded-lg items-center justify-center mx-1 ${
                          selectedPeriod === period ? "bg-primary" : "bg-background"
                        }`}
                        onPress={() => {
                          triggerHaptic();
                          setSelectedPeriod(period);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text className={`text-base font-medium ${
                          selectedPeriod === period ? "text-background" : "text-foreground"
                        }`}>
                          {period}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Selected Time Display */}
              <View className="items-center mt-4 pt-4 border-t border-border">
                <Text className="text-2xl font-bold text-primary">{formatSelectedTime()}</Text>
              </View>
            </View>
          </View>

          {/* Content Type */}
          <View className="px-5 pt-5">
            <Text className="text-sm font-semibold text-foreground mb-3">Content Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                {CONTENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    className={`mr-3 px-4 py-3 rounded-xl border ${
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
                    <View className="flex-row items-center">
                      <IconSymbol 
                        name={type.icon as any} 
                        size={18} 
                        color={contentType === type.id ? colors.background : colors.foreground} 
                      />
                      <Text className={`ml-2 font-medium ${
                        contentType === type.id ? "text-background" : "text-foreground"
                      }`}>
                        {type.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Platform (for social/video) */}
          {(contentType === "social" || contentType === "video") && (
            <View className="px-5 pt-5">
              <Text className="text-sm font-semibold text-foreground mb-3">Platform</Text>
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

          {/* Title Input */}
          <View className="px-5 pt-5">
            <Text className="text-sm font-semibold text-foreground mb-3">Title *</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
              placeholder="Enter a title for your content"
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
              style={{ color: colors.foreground }}
              returnKeyType="next"
            />
          </View>

          {/* Content Input */}
          <View className="px-5 pt-5 pb-8">
            <Text className="text-sm font-semibold text-foreground mb-3">Content (optional)</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
              placeholder="Add content details or notes..."
              placeholderTextColor={colors.muted}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: "top", color: colors.foreground }}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  timePickerRow: {
    paddingHorizontal: 8,
  },
});
