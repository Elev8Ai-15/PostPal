import { useRef, useCallback, useEffect } from "react";
import { AccessibilityInfo, Platform, findNodeHandle } from "react-native";

/**
 * Accessibility utilities for ADA/WCAG compliance
 */

// WCAG 2.1 AA minimum contrast ratios
export const CONTRAST_RATIOS = {
  normalText: 4.5,
  largeText: 3.0,
  uiComponents: 3.0,
};

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 formula
 */
export function getLuminance(hexColor: string): number {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const [rs, gs, bs] = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * Returns a value between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? CONTRAST_RATIOS.largeText : CONTRAST_RATIOS.normalText;
  return ratio >= requiredRatio;
}

/**
 * Hook to announce messages to screen readers
 */
export function useScreenReaderAnnouncement() {
  const announce = useCallback((message: string, isPolite: boolean = true) => {
    if (Platform.OS === "web") {
      // Create an ARIA live region for web
      const announcement = document.createElement("div");
      announcement.setAttribute("role", "status");
      announcement.setAttribute("aria-live", isPolite ? "polite" : "assertive");
      announcement.setAttribute("aria-atomic", "true");
      announcement.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `;
      announcement.textContent = message;
      document.body.appendChild(announcement);

      // Remove after announcement
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    } else {
      // Use React Native's AccessibilityInfo for native platforms
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, []);

  return announce;
}

/**
 * Hook to manage focus for accessibility
 */
export function useFocusManagement() {
  const focusRef = useRef<any>(null);

  const setFocus = useCallback(() => {
    if (Platform.OS === "web") {
      focusRef.current?.focus?.();
    } else {
      const node = findNodeHandle(focusRef.current);
      if (node) {
        AccessibilityInfo.setAccessibilityFocus(node);
      }
    }
  }, []);

  return { focusRef, setFocus };
}

/**
 * Hook to detect if screen reader is enabled
 */
export function useScreenReaderStatus() {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const checkScreenReader = async () => {
      const enabled = await AccessibilityInfo.isScreenReaderEnabled();
      setIsEnabled(enabled);
    };

    checkScreenReader();

    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setIsEnabled
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return isEnabled;
}

// Need to import useState for the hook
import { useState } from "react";

/**
 * Generate accessibility props for interactive elements
 */
export function getAccessibilityProps(options: {
  label: string;
  hint?: string;
  role?: "button" | "link" | "checkbox" | "radio" | "tab" | "menuitem" | "header" | "image" | "text" | "none";
  state?: {
    selected?: boolean;
    checked?: boolean;
    disabled?: boolean;
    expanded?: boolean;
    busy?: boolean;
  };
}) {
  const { label, hint, role = "button", state = {} } = options;

  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: role,
    accessibilityState: {
      selected: state.selected,
      checked: state.checked,
      disabled: state.disabled,
      expanded: state.expanded,
      busy: state.busy,
    },
    // Web-specific ARIA attributes
    ...(Platform.OS === "web" && {
      "aria-label": label,
      "aria-disabled": state.disabled,
      "aria-selected": state.selected,
      "aria-checked": state.checked,
      "aria-expanded": state.expanded,
      "aria-busy": state.busy,
    }),
  };
}

/**
 * Generate props for form inputs with accessibility
 */
export function getFormAccessibilityProps(options: {
  label: string;
  error?: string;
  required?: boolean;
  describedBy?: string;
}) {
  const { label, error, required, describedBy } = options;

  return {
    accessible: true,
    accessibilityLabel: `${label}${required ? ", required" : ""}${error ? `, error: ${error}` : ""}`,
    accessibilityHint: error ? `Error: ${error}` : undefined,
    accessibilityState: {
      disabled: false,
    },
    // Web-specific ARIA attributes
    ...(Platform.OS === "web" && {
      "aria-label": label,
      "aria-required": required,
      "aria-invalid": !!error,
      "aria-describedby": describedBy,
    }),
  };
}

/**
 * Skip navigation link component props
 */
export function getSkipNavProps(targetId: string) {
  return {
    accessible: true,
    accessibilityLabel: "Skip to main content",
    accessibilityRole: "link" as const,
    ...(Platform.OS === "web" && {
      href: `#${targetId}`,
      "aria-label": "Skip to main content",
    }),
  };
}

/**
 * Heading level props for proper document structure
 */
export function getHeadingProps(level: 1 | 2 | 3 | 4 | 5 | 6) {
  return {
    accessible: true,
    accessibilityRole: "header" as const,
    ...(Platform.OS === "web" && {
      role: "heading",
      "aria-level": level,
    }),
  };
}

/**
 * Live region props for dynamic content updates
 */
export function getLiveRegionProps(politeness: "polite" | "assertive" = "polite") {
  return {
    accessibilityLiveRegion: politeness,
    ...(Platform.OS === "web" && {
      "aria-live": politeness,
      "aria-atomic": true,
    }),
  };
}
