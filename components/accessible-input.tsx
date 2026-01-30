import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  TextInputProps,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { getFormAccessibilityProps } from "@/lib/accessibility";

interface AccessibleInputProps extends Omit<TextInputProps, "style"> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  containerStyle?: object;
}

/**
 * Accessible text input component that meets WCAG 2.1 AA standards
 * - Proper labeling
 * - Error announcements
 * - Focus indicators
 * - Sufficient contrast
 */
export function AccessibleInput({
  label,
  error,
  hint,
  required = false,
  disabled = false,
  containerStyle,
  ...textInputProps
}: AccessibleInputProps) {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);
  const inputId = useRef(`input-${Math.random().toString(36).substr(2, 9)}`).current;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const accessibilityProps = getFormAccessibilityProps({
    label: `${label}${required ? ", required" : ""}`,
    error,
    required,
    describedBy: error ? errorId : hint ? hintId : undefined,
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      <Text
        style={[styles.label, { color: colors.foreground }]}
        nativeID={inputId}
      >
        {label}
        {required && (
          <Text style={[styles.required, { color: colors.error }]}> *</Text>
        )}
      </Text>

      {/* Hint text */}
      {hint && !error && (
        <Text
          style={[styles.hint, { color: colors.muted }]}
          nativeID={hintId}
        >
          {hint}
        </Text>
      )}

      {/* Input field */}
      <TextInput
        {...textInputProps}
        {...accessibilityProps}
        editable={!disabled}
        onFocus={(e) => {
          setIsFocused(true);
          textInputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          textInputProps.onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.foreground,
            borderColor: error
              ? colors.error
              : isFocused
              ? colors.primary
              : colors.border,
          },
          isFocused && styles.inputFocused,
          disabled && styles.inputDisabled,
          error && styles.inputError,
        ]}
        placeholderTextColor={colors.muted}
        // Web-specific accessibility attributes
        {...(Platform.OS === "web" && {
          "aria-labelledby": inputId,
          "aria-describedby": error ? errorId : hint ? hintId : undefined,
          "aria-invalid": !!error,
          "aria-required": required,
        })}
      />

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer} accessibilityLiveRegion="polite">
          <Text
            style={[styles.errorText, { color: colors.error }]}
            nativeID={errorId}
            accessibilityRole="alert"
          >
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  required: {
    fontWeight: "400",
  },
  hint: {
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    // Minimum touch target height
    minHeight: 48,
  },
  inputFocused: {
    // Focus indicator with sufficient contrast
    borderWidth: 2,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  inputError: {
    borderWidth: 2,
  },
  errorContainer: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
