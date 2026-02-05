/**
 * Social Media Posting Service
 * 
 * This service integrates with Upload-Post API for unified social media posting.
 * Upload-Post handles OAuth, token management, and platform-specific formatting.
 * 
 * API Documentation: https://docs.upload-post.com
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Types
export type SocialPlatform = 
  | "twitter" 
  | "instagram" 
  | "facebook" 
  | "linkedin" 
  | "tiktok" 
  | "reddit" 
  | "youtube" 
  | "threads" 
  | "bluesky" 
  | "pinterest";

export interface PostContent {
  text: string;
  title?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  hashtags?: string[];
  scheduledTime?: string; // ISO 8601 format
  subreddit?: string; // For Reddit posts
}

export interface PostResult {
  success: boolean;
  platform: SocialPlatform;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export interface MultiPlatformPostResult {
  success: boolean;
  results: PostResult[];
  successCount: number;
  failureCount: number;
}

export interface ConnectedAccount {
  platform: SocialPlatform;
  accountName: string;
  accountId: string;
  connectedAt: string;
  isConnected: boolean;
}

// Storage keys
const CONNECTED_ACCOUNTS_KEY = "@postpal_connected_accounts";
const POST_HISTORY_KEY = "@postpal_post_history";

// Platform configurations
export const PLATFORM_CONFIG: Record<SocialPlatform, {
  name: string;
  maxLength: number;
  supportsImages: boolean;
  supportsVideos: boolean;
  supportsHashtags: boolean;
  maxHashtags: number;
}> = {
  twitter: {
    name: "Twitter / X",
    maxLength: 280,
    supportsImages: true,
    supportsVideos: true,
    supportsHashtags: true,
    maxHashtags: 5,
  },
  instagram: {
    name: "Instagram",
    maxLength: 2200,
    supportsImages: true,
    supportsVideos: true,
    supportsHashtags: true,
    maxHashtags: 30,
  },
  facebook: {
    name: "Facebook",
    maxLength: 63206,
    supportsImages: true,
    supportsVideos: true,
    supportsHashtags: true,
    maxHashtags: 10,
  },
  linkedin: {
    name: "LinkedIn",
    maxLength: 3000,
    supportsImages: true,
    supportsVideos: true,
    supportsHashtags: true,
    maxHashtags: 5,
  },
  tiktok: {
    name: "TikTok",
    maxLength: 2200,
    supportsImages: false,
    supportsVideos: true,
    supportsHashtags: true,
    maxHashtags: 5,
  },
  reddit: {
    name: "Reddit",
    maxLength: 40000,
    supportsImages: true,
    supportsVideos: true,
    supportsHashtags: false,
    maxHashtags: 0,
  },
  youtube: {
    name: "YouTube",
    maxLength: 5000,
    supportsImages: false,
    supportsVideos: true,
    supportsHashtags: true,
    maxHashtags: 15,
  },
  threads: {
    name: "Threads",
    maxLength: 500,
    supportsImages: true,
    supportsVideos: true,
    supportsHashtags: true,
    maxHashtags: 5,
  },
  bluesky: {
    name: "Bluesky",
    maxLength: 300,
    supportsImages: true,
    supportsVideos: false,
    supportsHashtags: true,
    maxHashtags: 5,
  },
  pinterest: {
    name: "Pinterest",
    maxLength: 500,
    supportsImages: true,
    supportsVideos: true,
    supportsHashtags: true,
    maxHashtags: 20,
  },
};

/**
 * Get all connected social accounts
 */
export async function getConnectedAccounts(): Promise<ConnectedAccount[]> {
  try {
    const stored = await AsyncStorage.getItem(CONNECTED_ACCOUNTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (error) {
    console.error("Failed to get connected accounts:", error);
    return [];
  }
}

/**
 * Check if a specific platform is connected
 */
export async function isPlatformConnected(platform: SocialPlatform): Promise<boolean> {
  const accounts = await getConnectedAccounts();
  return accounts.some(acc => acc.platform === platform && acc.isConnected);
}

/**
 * Get connected platforms only
 */
export async function getConnectedPlatforms(): Promise<SocialPlatform[]> {
  const accounts = await getConnectedAccounts();
  return accounts
    .filter(acc => acc.isConnected)
    .map(acc => acc.platform);
}

/**
 * Format content for a specific platform
 */
export function formatContentForPlatform(
  content: PostContent,
  platform: SocialPlatform
): PostContent {
  const config = PLATFORM_CONFIG[platform];
  let formattedText = content.text;

  // Add hashtags if platform supports them
  if (config.supportsHashtags && content.hashtags && content.hashtags.length > 0) {
    const limitedHashtags = content.hashtags.slice(0, config.maxHashtags);
    const hashtagString = limitedHashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ");
    
    // Only add hashtags if there's room
    if (formattedText.length + hashtagString.length + 2 <= config.maxLength) {
      formattedText = `${formattedText}\n\n${hashtagString}`;
    }
  }

  // Truncate if too long
  if (formattedText.length > config.maxLength) {
    formattedText = formattedText.substring(0, config.maxLength - 3) + "...";
  }

  return {
    ...content,
    text: formattedText,
  };
}

/**
 * Simulate posting to a single platform
 * In production, this would call the Upload-Post API
 */
async function postToPlatform(
  platform: SocialPlatform,
  content: PostContent
): Promise<PostResult> {
  // Check if platform is connected
  const isConnected = await isPlatformConnected(platform);
  if (!isConnected) {
    return {
      success: false,
      platform,
      error: `${PLATFORM_CONFIG[platform].name} is not connected`,
    };
  }

  // Format content for platform
  const formattedContent = formatContentForPlatform(content, platform);

  // Simulate API call with random success (90% success rate)
  // In production, this would be an actual API call to Upload-Post
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  const success = Math.random() > 0.1; // 90% success rate for demo

  if (success) {
    const postId = `${platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: true,
      platform,
      postId,
      postUrl: getPostUrl(platform, postId),
    };
  } else {
    return {
      success: false,
      platform,
      error: "Failed to post. Please try again.",
    };
  }
}

/**
 * Generate a mock post URL for a platform
 */
function getPostUrl(platform: SocialPlatform, postId: string): string {
  const baseUrls: Record<SocialPlatform, string> = {
    twitter: "https://twitter.com/i/status/",
    instagram: "https://instagram.com/p/",
    facebook: "https://facebook.com/post/",
    linkedin: "https://linkedin.com/posts/",
    tiktok: "https://tiktok.com/@user/video/",
    reddit: "https://reddit.com/r/subreddit/comments/",
    youtube: "https://youtube.com/watch?v=",
    threads: "https://threads.net/t/",
    bluesky: "https://bsky.app/profile/user/post/",
    pinterest: "https://pinterest.com/pin/",
  };
  
  return `${baseUrls[platform]}${postId}`;
}

/**
 * Post to multiple platforms simultaneously
 */
export async function postToMultiplePlatforms(
  platforms: SocialPlatform[],
  content: PostContent
): Promise<MultiPlatformPostResult> {
  const results: PostResult[] = [];

  // Post to each platform in parallel
  const promises = platforms.map(platform => postToPlatform(platform, content));
  const postResults = await Promise.all(promises);

  results.push(...postResults);

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  // Save to post history
  await savePostToHistory({
    content,
    platforms,
    results,
    postedAt: new Date().toISOString(),
  });

  return {
    success: successCount > 0,
    results,
    successCount,
    failureCount,
  };
}

/**
 * Schedule a post for later
 */
export async function schedulePost(
  platforms: SocialPlatform[],
  content: PostContent,
  scheduledTime: string
): Promise<{ success: boolean; scheduledId: string }> {
  // In production, this would call the Upload-Post scheduling API
  const scheduledId = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Save to scheduled posts
  const scheduledPosts = await getScheduledPosts();
  scheduledPosts.push({
    id: scheduledId,
    platforms,
    content: { ...content, scheduledTime },
    scheduledTime,
    createdAt: new Date().toISOString(),
    status: "pending",
  });
  
  await AsyncStorage.setItem("@postpal_scheduled_posts", JSON.stringify(scheduledPosts));

  return {
    success: true,
    scheduledId,
  };
}

/**
 * Get scheduled posts
 */
export async function getScheduledPosts(): Promise<Array<{
  id: string;
  platforms: SocialPlatform[];
  content: PostContent;
  scheduledTime: string;
  createdAt: string;
  status: "pending" | "posted" | "failed";
}>> {
  try {
    const stored = await AsyncStorage.getItem("@postpal_scheduled_posts");
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (error) {
    console.error("Failed to get scheduled posts:", error);
    return [];
  }
}

/**
 * Save post to history
 */
async function savePostToHistory(post: {
  content: PostContent;
  platforms: SocialPlatform[];
  results: PostResult[];
  postedAt: string;
}): Promise<void> {
  try {
    const history = await getPostHistory();
    history.unshift(post);
    // Keep only last 100 posts
    const trimmedHistory = history.slice(0, 100);
    await AsyncStorage.setItem(POST_HISTORY_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error("Failed to save post history:", error);
  }
}

/**
 * Get post history
 */
export async function getPostHistory(): Promise<Array<{
  content: PostContent;
  platforms: SocialPlatform[];
  results: PostResult[];
  postedAt: string;
}>> {
  try {
    const stored = await AsyncStorage.getItem(POST_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (error) {
    console.error("Failed to get post history:", error);
    return [];
  }
}

/**
 * Validate content for a platform
 */
export function validateContent(
  content: PostContent,
  platform: SocialPlatform
): { valid: boolean; errors: string[] } {
  const config = PLATFORM_CONFIG[platform];
  const errors: string[] = [];

  // Check text length
  if (content.text.length > config.maxLength) {
    errors.push(`Text exceeds ${config.maxLength} character limit for ${config.name}`);
  }

  // Check media support
  if (content.mediaType === "video" && !config.supportsVideos) {
    errors.push(`${config.name} does not support video posts`);
  }

  if (content.mediaType === "image" && !config.supportsImages) {
    errors.push(`${config.name} does not support image posts`);
  }

  // Check hashtag count
  if (content.hashtags && content.hashtags.length > config.maxHashtags) {
    errors.push(`${config.name} allows maximum ${config.maxHashtags} hashtags`);
  }

  // Reddit-specific validation
  if (platform === "reddit" && !content.subreddit) {
    errors.push("Reddit posts require a subreddit");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get optimal posting times for a platform
 * Based on general social media best practices
 */
export function getOptimalPostingTimes(platform: SocialPlatform): string[] {
  const times: Record<SocialPlatform, string[]> = {
    twitter: ["9:00 AM", "12:00 PM", "5:00 PM"],
    instagram: ["11:00 AM", "2:00 PM", "7:00 PM"],
    facebook: ["9:00 AM", "1:00 PM", "4:00 PM"],
    linkedin: ["7:30 AM", "12:00 PM", "5:00 PM"],
    tiktok: ["7:00 AM", "12:00 PM", "3:00 PM"],
    reddit: ["6:00 AM", "12:00 PM", "8:00 PM"],
    youtube: ["2:00 PM", "4:00 PM", "9:00 PM"],
    threads: ["10:00 AM", "1:00 PM", "6:00 PM"],
    bluesky: ["9:00 AM", "12:00 PM", "6:00 PM"],
    pinterest: ["8:00 PM", "9:00 PM", "11:00 PM"],
  };

  return times[platform] || ["9:00 AM", "12:00 PM", "5:00 PM"];
}
