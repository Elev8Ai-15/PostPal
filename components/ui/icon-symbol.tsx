// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING: Record<string, MaterialIconName> = {
  // Tab bar icons
  "house.fill": "home",
  "calendar": "calendar-today",
  "checkmark.circle.fill": "check-circle",
  "chart.bar.fill": "bar-chart",
  "gearshape.fill": "settings",
  // Navigation icons
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  // Action icons
  "paperplane.fill": "send",
  "plus": "add",
  "xmark": "close",
  "arrow.up.right": "trending-up",
  "arrow.down.right": "trending-down",
  "person.fill": "person",
  "bell.fill": "notifications",
  "pencil": "edit",
  "trash": "delete",
  "eye": "visibility",
  "clock": "schedule",
  "star.fill": "star",
  "heart.fill": "favorite",
  "share": "share",
  // Content type icons
  "photo": "image",
  "video": "videocam",
  "doc.text": "article",
  "envelope": "email",
  // Social platform icons
  "camera": "camera-alt",
  "message": "chat",
  // AI and special icons
  "sparkles": "auto-awesome",
  // Misc
  "chevron.left.forwardslash.chevron.right": "code",
  "info.circle": "info",
  "questionmark.circle": "help",
  "checkmark": "check",
  "minus": "remove",
};

type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
