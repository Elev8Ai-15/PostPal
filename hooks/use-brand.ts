import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BRAND_STORAGE_KEY = "@postpal_brand_settings";

export interface BrandSettings {
  brandName: string;
  tagline: string;
  industry: string;
  toneOfVoice: string;
  targetAudience: string;
  brandColors: string[];
  keyTopics: string[];
  website: string;
  uniqueSellingPoint: string;
}

export const DEFAULT_BRAND: BrandSettings = {
  brandName: "",
  tagline: "",
  industry: "",
  toneOfVoice: "professional",
  targetAudience: "",
  brandColors: [],
  keyTopics: [],
  website: "",
  uniqueSellingPoint: "",
};

export const TONE_OPTIONS = [
  { id: "professional", label: "Professional", description: "Polished, authoritative, and business-focused" },
  { id: "casual", label: "Casual", description: "Relaxed, conversational, and approachable" },
  { id: "friendly", label: "Friendly", description: "Warm, welcoming, and personable" },
  { id: "witty", label: "Witty", description: "Clever, humorous, and engaging" },
  { id: "inspirational", label: "Inspirational", description: "Motivating, uplifting, and empowering" },
  { id: "educational", label: "Educational", description: "Informative, clear, and instructive" },
  { id: "bold", label: "Bold", description: "Confident, direct, and attention-grabbing" },
  { id: "empathetic", label: "Empathetic", description: "Understanding, caring, and supportive" },
];

export const INDUSTRY_OPTIONS = [
  "Technology",
  "Marketing & Advertising",
  "E-commerce & Retail",
  "Health & Wellness",
  "Finance & Banking",
  "Education",
  "Real Estate",
  "Food & Restaurant",
  "Fashion & Beauty",
  "Travel & Hospitality",
  "Entertainment & Media",
  "Consulting",
  "Non-Profit",
  "Fitness & Sports",
  "Home & Garden",
  "Automotive",
  "Legal Services",
  "Construction",
  "Art & Design",
  "Other",
];

export const PRESET_COLORS = [
  "#F97316", // Orange (PostPal brand)
  "#EF4444", // Red
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#3B82F6", // Blue
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#22C55E", // Green
  "#EAB308", // Yellow
  "#F59E0B", // Amber
  "#78716C", // Stone
  "#1C1917", // Black
];

export function useBrand() {
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load brand settings from AsyncStorage
  useEffect(() => {
    loadBrand();
  }, []);

  const loadBrand = async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem(BRAND_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setBrand({ ...DEFAULT_BRAND, ...parsed });
      }
    } catch (error) {
      console.error("Failed to load brand settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBrand = useCallback(async (updates: Partial<BrandSettings>) => {
    try {
      setIsSaving(true);
      const updated = { ...brand, ...updates };
      setBrand(updated);
      await AsyncStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.error("Failed to save brand settings:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [brand]);

  const updateField = useCallback(async (field: keyof BrandSettings, value: any) => {
    return saveBrand({ [field]: value });
  }, [saveBrand]);

  const addKeyTopic = useCallback(async (topic: string) => {
    const trimmed = topic.trim();
    if (!trimmed || brand.keyTopics.includes(trimmed)) return false;
    return saveBrand({ keyTopics: [...brand.keyTopics, trimmed] });
  }, [brand.keyTopics, saveBrand]);

  const removeKeyTopic = useCallback(async (topic: string) => {
    return saveBrand({ keyTopics: brand.keyTopics.filter(t => t !== topic) });
  }, [brand.keyTopics, saveBrand]);

  const addBrandColor = useCallback(async (color: string) => {
    if (brand.brandColors.includes(color)) return false;
    return saveBrand({ brandColors: [...brand.brandColors, color] });
  }, [brand.brandColors, saveBrand]);

  const removeBrandColor = useCallback(async (color: string) => {
    return saveBrand({ brandColors: brand.brandColors.filter(c => c !== color) });
  }, [brand.brandColors, saveBrand]);

  const resetBrand = useCallback(async () => {
    try {
      setBrand(DEFAULT_BRAND);
      await AsyncStorage.removeItem(BRAND_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("Failed to reset brand settings:", error);
      return false;
    }
  }, []);

  const isConfigured = brand.brandName.trim().length > 0;

  // Generate a brand context string for AI content generation
  const getBrandContext = useCallback(() => {
    if (!isConfigured) return "";

    const parts: string[] = [];
    
    if (brand.brandName) parts.push(`Brand: ${brand.brandName}`);
    if (brand.tagline) parts.push(`Tagline: "${brand.tagline}"`);
    if (brand.industry) parts.push(`Industry: ${brand.industry}`);
    if (brand.toneOfVoice) parts.push(`Tone: ${brand.toneOfVoice}`);
    if (brand.targetAudience) parts.push(`Target Audience: ${brand.targetAudience}`);
    if (brand.uniqueSellingPoint) parts.push(`USP: ${brand.uniqueSellingPoint}`);
    if (brand.keyTopics.length > 0) parts.push(`Key Topics: ${brand.keyTopics.join(", ")}`);
    if (brand.website) parts.push(`Website: ${brand.website}`);

    return parts.join(". ");
  }, [brand, isConfigured]);

  return {
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
    getBrandContext,
    reload: loadBrand,
  };
}
