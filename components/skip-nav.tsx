import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface SkipNavProps {
  targetId?: string;
  onSkip?: () => void;
}

/**
 * Skip navigation link for keyboard users
 * Appears on focus and allows users to skip to main content
 * WCAG 2.1 Success Criterion 2.4.1 - Bypass Blocks
 */
export function SkipNav({ targetId = "main-content", onSkip }: SkipNavProps) {
  const colors = useColors();

  // Only render on web platform
  if (Platform.OS !== "web") {
    return null;
  }

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      // Focus the main content
      const mainContent = document.getElementById(targetId);
      if (mainContent) {
        mainContent.focus();
        mainContent.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <TouchableOpacity
      onPress={handleSkip}
      style={[styles.skipLink, { backgroundColor: colors.primary }]}
      accessibilityRole="link"
      accessibilityLabel="Skip to main content"
    >
      <Text style={styles.skipLinkText}>Skip to main content</Text>
    </TouchableOpacity>
  );
}

/**
 * Main content wrapper that can receive focus from skip link
 */
export function MainContent({
  children,
  id = "main-content",
}: {
  children: React.ReactNode;
  id?: string;
}) {
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  return (
    <View
      style={styles.mainContent}
      nativeID={id}
      accessible={true}
      accessibilityLabel="Main content"
      // Make focusable for skip link
      {...(Platform.OS === "web" && {
        tabIndex: -1,
        role: "main",
      })}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  skipLink: {
    position: "absolute",
    top: -100,
    left: 0,
    right: 0,
    padding: 16,
    zIndex: 9999,
    // Show on focus (handled via CSS on web)
  },
  skipLinkText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  mainContent: {
    flex: 1,
  },
});

// Add CSS for skip link focus state on web
if (Platform.OS === "web" && typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    [data-skip-nav]:focus {
      top: 0 !important;
      outline: 3px solid #6366F1;
      outline-offset: 2px;
    }
    
    /* Focus visible styles for all interactive elements */
    button:focus-visible,
    a:focus-visible,
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible,
    [tabindex]:focus-visible {
      outline: 3px solid #6366F1;
      outline-offset: 2px;
    }
    
    /* Reduce motion for users who prefer it */
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
  `;
  document.head.appendChild(style);
}
