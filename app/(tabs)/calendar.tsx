import { ScrollView, Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface ContentItem {
  id: string;
  title: string;
  type: "social" | "blog" | "newsletter" | "video";
  time: string;
  platform?: string;
}

interface ScheduledDay {
  date: number;
  items: ContentItem[];
}

// Sample data for the calendar
const sampleSchedule: Record<string, ContentItem[]> = {
  "2026-01-29": [
    { id: "1", title: "Instagram Reel: Marketing Tips", type: "video", time: "10:00 AM", platform: "Instagram" },
    { id: "2", title: "Twitter Thread: AI Trends", type: "social", time: "2:00 PM", platform: "Twitter" },
  ],
  "2026-01-30": [
    { id: "3", title: "Blog: Content Strategy Guide", type: "blog", time: "9:00 AM" },
  ],
  "2026-01-31": [
    { id: "4", title: "Weekly Newsletter", type: "newsletter", time: "8:00 AM" },
    { id: "5", title: "LinkedIn Post: Industry Insights", type: "social", time: "12:00 PM", platform: "LinkedIn" },
  ],
  "2026-02-01": [
    { id: "6", title: "Facebook Ad Campaign", type: "social", time: "11:00 AM", platform: "Facebook" },
  ],
  "2026-02-03": [
    { id: "7", title: "YouTube Video: Tutorial", type: "video", time: "3:00 PM", platform: "YouTube" },
    { id: "8", title: "Instagram Story Series", type: "social", time: "6:00 PM", platform: "Instagram" },
  ],
  "2026-02-05": [
    { id: "9", title: "Blog: Case Study", type: "blog", time: "10:00 AM" },
  ],
};

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

interface ContentCardProps {
  item: ContentItem;
}

function ContentCard({ item }: ContentCardProps) {
  const colors = useColors();
  const typeColor = getTypeColor(item.type, colors);
  
  return (
    <TouchableOpacity 
      className="bg-surface rounded-xl p-4 mb-3 border border-border flex-row items-center"
      activeOpacity={0.7}
    >
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
      <IconSymbol name="chevron.right" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
}

export default function CalendarScreen() {
  const colors = useColors();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getScheduleForDate = (day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return sampleSchedule[dateKey] || [];
  };

  const selectedDateKey = formatDateKey(selectedDate);
  const selectedItems = sampleSchedule[selectedDateKey] || [];

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
          onPress={() => setSelectedDate(new Date(year, month, day))}
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
        <View className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-bold text-foreground">Content Calendar</Text>
          <Text className="text-sm text-muted mt-1">Plan and schedule your content</Text>
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
          <Text className="text-lg font-semibold text-foreground mb-3">
            {selectedDate.toLocaleDateString("en-US", { 
              weekday: "long", 
              month: "long", 
              day: "numeric" 
            })}
          </Text>
          
          {selectedItems.length > 0 ? (
            selectedItems.map((item) => (
              <ContentCard key={item.id} item={item} />
            ))
          ) : (
            <View className="bg-surface rounded-xl p-6 border border-border items-center">
              <IconSymbol name="calendar" size={40} color={colors.muted} />
              <Text className="text-base font-medium text-foreground mt-3">No content scheduled</Text>
              <Text className="text-sm text-muted mt-1 text-center">
                This day is free. Add content to your calendar.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
});
