import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal } from "react-native";
import { useState, useCallback, useEffect } from "react";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { ScheduleModal, type ScheduleData } from "@/components/schedule-modal";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface ContentItem {
  id: number;
  title: string;
  type: "social" | "blog" | "newsletter" | "video";
  time: string;
  platform?: string;
  content?: string;
  scheduledAt?: Date;
  status?: string;
}

function getTypeColor(type: string, colors: any) {
  switch (type) {
    case "social": return colors.primary;
    case "blog": return colors.success;
    case "newsletter": return "#9333EA";
    case "video": return colors.warning;
    default: return colors.muted;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "social": return "message";
    case "blog": return "doc.text";
    case "newsletter": return "envelope";
    case "video": return "video";
    default: return "doc.text";
  }
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

interface ContentCardProps {
  item: ContentItem;
  onPress: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  isDragging: boolean;
}

function ContentCard({ item, onPress, onDelete, onDragStart, isDragging }: ContentCardProps) {
  const colors = useColors();
  const typeColor = getTypeColor(item.type, colors);
  
  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleLongPress = () => {
    triggerHaptic();
    onDragStart();
  };
  
  return (
    <TouchableOpacity 
      className={`bg-surface rounded-xl p-4 mb-3 border border-border flex-row items-center ${isDragging ? "opacity-50" : ""}`}
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={handleLongPress}
      delayLongPress={300}
    >
      {/* Drag Handle */}
      <View className="mr-2 opacity-50">
        <IconSymbol name="line.3.horizontal" size={16} color={colors.muted} />
      </View>
      <View 
        className="rounded-full p-2 mr-3"
        style={{ backgroundColor: `${typeColor}20` }}
      >
        <IconSymbol name={getTypeIcon(item.type) as any} size={20} color={typeColor} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-medium text-foreground" numberOfLines={1}>
          {item.title}
        </Text>
        <View className="flex-row items-center mt-1">
          <IconSymbol name="clock" size={14} color={colors.muted} />
          <Text className="text-sm text-muted ml-1">{item.time}</Text>
          {item.platform && (
            <>
              <Text className="text-muted mx-2">•</Text>
              <Text className="text-sm text-muted">{item.platform}</Text>
            </>
          )}
        </View>
      </View>
      <View className="flex-row items-center">
        {item.status === "scheduled" && (
          <View className="bg-warning/20 px-2 py-1 rounded-full mr-2">
            <Text className="text-xs text-warning font-medium">Scheduled</Text>
          </View>
        )}
        <IconSymbol name="chevron.right" size={18} color={colors.muted} />
      </View>
    </TouchableOpacity>
  );
}

// Date Picker Modal for drag-and-drop rescheduling
interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  currentDate: Date;
  postTitle: string;
}

function DatePickerModal({ visible, onClose, onSelectDate, currentDate, postTitle }: DatePickerModalProps) {
  const colors = useColors();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedDay, setSelectedDay] = useState(currentDate.getDate());

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleConfirm = () => {
    const newDate = new Date(selectedYear, selectedMonth, selectedDay);
    // Preserve the original time
    newDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);
    onSelectDate(newDate);
  };

  const renderDays = () => {
    const days = [];
    
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.pickerDayCell} />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = day === selectedDay;
      const isToday = 
        day === new Date().getDate() && 
        selectedMonth === new Date().getMonth() && 
        selectedYear === new Date().getFullYear();
      
      days.push(
        <TouchableOpacity
          key={day}
          style={styles.pickerDayCell}
          onPress={() => {
            triggerHaptic();
            setSelectedDay(day);
          }}
          activeOpacity={0.7}
        >
          <View 
            className={`w-9 h-9 rounded-full items-center justify-center ${
              isSelected ? "bg-primary" : isToday ? "bg-primary/20" : ""
            }`}
          >
            <Text 
              className={`text-sm font-medium ${
                isSelected ? "text-background" : isToday ? "text-primary" : "text-foreground"
              }`}
            >
              {day}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
    
    return days;
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
          <Text className="text-lg font-semibold text-foreground">Move Post</Text>
          <TouchableOpacity onPress={handleConfirm} activeOpacity={0.7}>
            <Text className="text-base font-semibold text-primary">Confirm</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
          {/* Post Info */}
          <View className="bg-surface rounded-xl p-4 mb-6 border border-border">
            <Text className="text-sm text-muted mb-1">Moving:</Text>
            <Text className="text-base font-semibold text-foreground">{postTitle}</Text>
          </View>

          {/* Month Navigation */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity 
              onPress={() => {
                triggerHaptic();
                if (selectedMonth === 0) {
                  setSelectedMonth(11);
                  setSelectedYear(selectedYear - 1);
                } else {
                  setSelectedMonth(selectedMonth - 1);
                }
              }} 
              className="p-2" 
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-foreground">
              {MONTHS[selectedMonth]} {selectedYear}
            </Text>
            <TouchableOpacity 
              onPress={() => {
                triggerHaptic();
                if (selectedMonth === 11) {
                  setSelectedMonth(0);
                  setSelectedYear(selectedYear + 1);
                } else {
                  setSelectedMonth(selectedMonth + 1);
                }
              }} 
              className="p-2" 
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.right" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View className="flex-row mb-2">
            {DAYS.map((day) => (
              <View key={day} style={styles.pickerDayCell}>
                <Text className="text-xs font-medium text-muted">{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Days */}
          <View className="flex-row flex-wrap">
            {renderDays()}
          </View>

          {/* Selected Date Preview */}
          <View className="mt-6 bg-primary/10 rounded-xl p-4">
            <Text className="text-sm text-muted mb-1">New date:</Text>
            <Text className="text-lg font-semibold text-primary">
              {new Date(selectedYear, selectedMonth, selectedDay).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
              })}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function CalendarScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    scheduleContent?: string;
    title?: string;
    content?: string;
    contentType?: string;
    platform?: string;
  }>();
  const { isAuthenticated } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentItem | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [incomingContent, setIncomingContent] = useState<{
    title: string;
    content: string;
    contentType: string;
    platform?: string;
  } | null>(null);
  
  // Drag and drop state
  const [draggingPost, setDraggingPost] = useState<ContentItem | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch scheduled posts from backend
  const { data: scheduledPosts, isLoading, refetch } = trpc.posts.scheduled.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createPostMutation = trpc.posts.create.useMutation({
    onSuccess: () => refetch(),
  });

  const updatePostMutation = trpc.posts.update.useMutation({
    onSuccess: () => refetch(),
  });

  const deletePostMutation = trpc.posts.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const rescheduleMutation = trpc.posts.reschedule.useMutation({
    onSuccess: () => refetch(),
  });

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refetch();
      }
    }, [isAuthenticated, refetch])
  );

  // Handle incoming content from create-content screen
  useEffect(() => {
    if (params.scheduleContent === "true" && params.title) {
      setIncomingContent({
        title: params.title,
        content: params.content || "",
        contentType: params.contentType || "social",
        platform: params.platform,
      });
      // Open the schedule modal with the incoming content
      setShowScheduleModal(true);
      // Clear the params to prevent re-triggering
      router.setParams({
        scheduleContent: undefined,
        title: undefined,
        content: undefined,
        contentType: undefined,
        platform: undefined,
      });
    }
  }, [params.scheduleContent, params.title, params.content, params.contentType, params.platform]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Convert posts to calendar items
  const getScheduleForDate = (day: number): ContentItem[] => {
    if (!scheduledPosts) return [];
    
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    
    return scheduledPosts
      .filter(post => {
        if (!post.scheduledAt) return false;
        const postDate = new Date(post.scheduledAt);
        const postDateStr = `${postDate.getFullYear()}-${String(postDate.getMonth() + 1).padStart(2, "0")}-${String(postDate.getDate()).padStart(2, "0")}`;
        return postDateStr === dateStr;
      })
      .map(post => ({
        id: post.id,
        title: post.title,
        type: post.contentType as "social" | "blog" | "newsletter" | "video",
        time: post.scheduledAt ? formatTime(post.scheduledAt) : "",
        platform: post.platform || undefined,
        content: post.content,
        scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : undefined,
        status: post.status,
      }))
      .sort((a, b) => {
        if (!a.scheduledAt || !b.scheduledAt) return 0;
        return a.scheduledAt.getTime() - b.scheduledAt.getTime();
      });
  };

  const selectedItems = getScheduleForDate(selectedDate.getDate());

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear()
    );
  };

  const handleSchedule = async (data: ScheduleData) => {
    setIsScheduling(true);
    try {
      if (data.postId) {
        // Update existing post
        await updatePostMutation.mutateAsync({
          id: data.postId,
          title: data.title,
          content: data.content,
          scheduledAt: data.scheduledAt,
          status: "scheduled",
        });
      } else {
        // Create new post
        await createPostMutation.mutateAsync({
          title: data.title,
          content: data.content,
          contentType: data.contentType,
          platform: data.platform,
          scheduledAt: data.scheduledAt,
        });
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      setShowScheduleModal(false);
      setEditingPost(null);
      Alert.alert("Success", data.postId ? "Post updated successfully!" : "Content scheduled successfully!");
    } catch (error) {
      console.error("Schedule error:", error);
      Alert.alert("Error", "Failed to schedule content. Please try again.");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsScheduling(false);
    }
  };

  const handleEditPost = (item: ContentItem) => {
    triggerHaptic();
    setEditingPost(item);
    setShowScheduleModal(true);
  };

  const handleDeletePost = async (item: ContentItem) => {
    Alert.alert(
      "Delete Post",
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePostMutation.mutateAsync({ id: item.id });
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete post. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleAddContent = () => {
    triggerHaptic();
    setEditingPost(null);
    setShowScheduleModal(true);
  };

  // Drag and drop handlers
  const handleDragStart = (item: ContentItem) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setDraggingPost(item);
    setShowDatePicker(true);
  };

  const handleReschedule = async (newDate: Date) => {
    if (!draggingPost) return;

    try {
      await rescheduleMutation.mutateAsync({
        id: draggingPost.id,
        scheduledAt: newDate,
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        "Rescheduled",
        `"${draggingPost.title}" moved to ${newDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric"
        })}`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to reschedule post. Please try again.");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setDraggingPost(null);
      setShowDatePicker(false);
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const schedule = getScheduleForDate(day);
      const hasContent = schedule.length > 0;
      
      days.push(
        <TouchableOpacity
          key={day}
          style={styles.dayCell}
          onPress={() => {
            triggerHaptic();
            setSelectedDate(new Date(year, month, day));
          }}
          activeOpacity={0.7}
        >
          <View 
            className={`w-9 h-9 rounded-full items-center justify-center ${
              isSelected(day) ? "bg-primary" : isToday(day) ? "bg-primary/20" : ""
            }`}
          >
            <Text 
              className={`text-sm font-medium ${
                isSelected(day) ? "text-background" : isToday(day) ? "text-primary" : "text-foreground"
              }`}
            >
              {day}
            </Text>
          </View>
          {hasContent && !isSelected(day) && (
            <View className="flex-row mt-1 gap-1">
              {schedule.slice(0, 3).map((item, idx) => (
                <View 
                  key={idx}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: getTypeColor(item.type, colors) }}
                />
              ))}
            </View>
          )}
        </TouchableOpacity>
      );
    }
    
    return days;
  };

  return (
    <ScreenContainer>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-foreground">Content Calendar</Text>
            <Text className="text-sm text-muted mt-1">Plan and schedule your content</Text>
          </View>
          <View className="flex-row items-center">
            {isLoading && <ActivityIndicator size="small" color={colors.primary} className="mr-3" />}
            <TouchableOpacity
              className="bg-surface border border-border rounded-full p-2"
              onPress={() => router.push("/templates")}
              activeOpacity={0.7}
            >
              <IconSymbol name="calendar" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Drag hint */}
        <View className="px-5 pb-2">
          <Text className="text-xs text-muted">
            Tip: Long-press a post to move it to another date
          </Text>
        </View>

        {/* Month Navigation */}
        <View className="flex-row items-center justify-between px-5 py-4">
          <TouchableOpacity onPress={prevMonth} className="p-2" activeOpacity={0.7}>
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-foreground">
            {MONTHS[month]} {year}
          </Text>
          <TouchableOpacity onPress={nextMonth} className="p-2" activeOpacity={0.7}>
            <IconSymbol name="chevron.right" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View className="px-3">
          {/* Day Headers */}
          <View className="flex-row">
            {DAYS.map((day) => (
              <View key={day} style={styles.dayCell}>
                <Text className="text-xs font-medium text-muted">{day}</Text>
              </View>
            ))}
          </View>
          
          {/* Calendar Days */}
          <View className="flex-row flex-wrap">
            {renderCalendarDays()}
          </View>
        </View>

        {/* Legend */}
        <View className="flex-row justify-center gap-4 py-4 px-5">
          <View className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: colors.primary }} />
            <Text className="text-xs text-muted">Social</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: colors.success }} />
            <Text className="text-xs text-muted">Blog</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: "#9333EA" }} />
            <Text className="text-xs text-muted">Newsletter</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: colors.warning }} />
            <Text className="text-xs text-muted">Video</Text>
          </View>
        </View>

        {/* Selected Day Content */}
        <View className="px-5 pb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-foreground">
              {selectedDate.toLocaleDateString("en-US", { 
                weekday: "long", 
                month: "long", 
                day: "numeric" 
              })}
            </Text>
            <TouchableOpacity
              className="bg-primary px-4 py-2 rounded-full flex-row items-center"
              onPress={handleAddContent}
              activeOpacity={0.7}
            >
              <IconSymbol name="plus" size={16} color={colors.background} />
              <Text className="text-sm font-semibold text-background ml-1">Add</Text>
            </TouchableOpacity>
          </View>
          
          {selectedItems.length > 0 ? (
            selectedItems.map((item) => (
              <ContentCard 
                key={item.id} 
                item={item} 
                onPress={() => handleEditPost(item)}
                onDelete={() => handleDeletePost(item)}
                onDragStart={() => handleDragStart(item)}
                isDragging={draggingPost?.id === item.id}
              />
            ))
          ) : (
            <View className="bg-surface rounded-xl p-6 border border-border items-center">
              <IconSymbol name="calendar" size={40} color={colors.muted} />
              <Text className="text-base font-medium text-foreground mt-3">No content scheduled</Text>
              <Text className="text-sm text-muted mt-1 text-center">
                Tap the &quot;Add&quot; button to schedule content for this day.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Schedule Modal */}
      <ScheduleModal
        visible={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setEditingPost(null);
          setIncomingContent(null);
        }}
        onSchedule={(data) => {
          handleSchedule(data);
          setIncomingContent(null);
        }}
        selectedDate={selectedDate}
        existingPost={editingPost ? {
          id: editingPost.id,
          title: editingPost.title,
          content: editingPost.content || "",
          contentType: editingPost.type,
          platform: editingPost.platform,
          scheduledAt: editingPost.scheduledAt,
        } : incomingContent ? {
          id: 0,
          title: incomingContent.title,
          content: incomingContent.content,
          contentType: incomingContent.contentType,
          platform: incomingContent.platform,
        } : undefined}
        isLoading={isScheduling}
      />

      {/* Date Picker Modal for Drag & Drop */}
      {draggingPost && (
        <DatePickerModal
          visible={showDatePicker}
          onClose={() => {
            setShowDatePicker(false);
            setDraggingPost(null);
          }}
          onSelectDate={handleReschedule}
          currentDate={draggingPost.scheduledAt || new Date()}
          postTitle={draggingPost.title}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  pickerDayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
