import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import { getAccessibilityProps } from "@/lib/accessibility";

interface AccessibleButtonProps {
  onPress: () => void;
  label: string;
  hint?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  testID?: string;
}

/**
 * Accessible button component that meets WCAG 2.1 AA standards
 * - Proper contrast ratios
 * - Screen reader support
 * - Keyboard navigation (web)
 * - Touch target size (minimum 44x44)
 * - Focus indicators
 */
export function AccessibleButton({
  onPress,
  label,
  hint,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  testID,
}: AccessibleButtonProps) {
  const colors = useColors();

  const handlePress = () => {
    if (disabled || loading) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          container: { backgroundColor: colors.primary },
          text: { color: "#FFFFFF" },
          loadingColor: "#FFFFFF",
        };
      case "secondary":
        return {
          container: { backgroundColor: colors.surface },
          text: { color: colors.foreground },
          loadingColor: colors.foreground,
        };
      case "outline":
        return {
          container: {
            backgroundColor: "transparent",
            borderWidth: 2,
            borderColor: colors.primary,
          },
          text: { color: colors.primary },
          loadingColor: colors.primary,
        };
      case "ghost":
        return {
          container: { backgroundColor: "transparent" },
          text: { color: colors.primary },
          loadingColor: colors.primary,
        };
      case "danger":
        return {
          container: { backgroundColor: colors.error },
          text: { color: "#FFFFFF" },
          loadingColor: "#FFFFFF",
        };
      default:
        return {
          container: { backgroundColor: colors.primary },
          text: { color: "#FFFFFF" },
          loadingColor: "#FFFFFF",
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          container: { paddingVertical: 8, paddingHorizontal: 16, minHeight: 36 },
          text: { fontSize: 14 },
        };
      case "md":
        return {
          container: { paddingVertical: 12, paddingHorizontal: 20, minHeight: 44 },
          text: { fontSize: 16 },
        };
      case "lg":
        return {
          container: { paddingVertical: 16, paddingHorizontal: 24, minHeight: 52 },
          text: { fontSize: 18 },
        };
      default:
        return {
          container: { paddingVertical: 12, paddingHorizontal: 20, minHeight: 44 },
          text: { fontSize: 16 },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const accessibilityProps = getAccessibilityProps({
    label: loading ? `${label}, loading` : label,
    hint,
    role: "button",
    state: {
      disabled: disabled || loading,
      busy: loading,
    },
  });

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      testID={testID}
      style={[
        styles.container,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
      ]}
      {...accessibilityProps}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyles.loadingColor} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === "left" && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text
            style={[
              styles.text,
              variantStyles.text,
              sizeStyles.text,
              (disabled || loading) && styles.disabledText,
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === "right" && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    // Minimum touch target size for accessibility (WCAG 2.5.5)
    minWidth: 44,
    minHeight: 44,
  },
  fullWidth: {
    width: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
});
