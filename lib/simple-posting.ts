/**
 * Simple Posting Service
 * Copy content to clipboard and open native apps via deep links
 * No API keys required - works immediately
 */

import * as Clipboard from 'expo-clipboard';
import { Linking, Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

export type SocialPlatform = 
  | 'tiktok'
  | 'instagram'
  | 'twitter'
  | 'facebook'
  | 'linkedin'
  | 'threads'
  | 'youtube'
  | 'reddit'
  | 'pinterest'
  | 'bluesky';

interface PlatformConfig {
  name: string;
  icon: string;
  color: string;
  // Deep link to open the app
  appUrl: string;
  // Fallback web URL if app not installed
  webUrl: string;
  // iOS App Store URL
  iosStoreUrl: string;
  // Android Play Store URL
  androidStoreUrl: string;
  // Character limit
  charLimit: number;
  // Instructions for user
  instructions: string;
}

export const PLATFORM_CONFIGS: Record<SocialPlatform, PlatformConfig> = {
  tiktok: {
    name: 'TikTok',
    icon: 'music.note',
    color: '#000000',
    appUrl: 'tiktok://',
    webUrl: 'https://www.tiktok.com/upload',
    iosStoreUrl: 'https://apps.apple.com/app/tiktok/id835599320',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.zhiliaoapp.musically',
    charLimit: 2200,
    instructions: 'Tap + to create, paste your caption',
  },
  instagram: {
    name: 'Instagram',
    icon: 'camera.fill',
    color: '#E4405F',
    appUrl: 'instagram://camera',
    webUrl: 'https://www.instagram.com/',
    iosStoreUrl: 'https://apps.apple.com/app/instagram/id389801252',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.instagram.android',
    charLimit: 2200,
    instructions: 'Create a post/reel, paste your caption',
  },
  twitter: {
    name: 'X (Twitter)',
    icon: 'at',
    color: '#000000',
    appUrl: 'twitter://post',
    webUrl: 'https://twitter.com/compose/tweet',
    iosStoreUrl: 'https://apps.apple.com/app/x/id333903271',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.twitter.android',
    charLimit: 280,
    instructions: 'Paste your content in the compose box',
  },
  facebook: {
    name: 'Facebook',
    icon: 'person.2.fill',
    color: '#1877F2',
    appUrl: 'fb://publish',
    webUrl: 'https://www.facebook.com/',
    iosStoreUrl: 'https://apps.apple.com/app/facebook/id284882215',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.facebook.katana',
    charLimit: 63206,
    instructions: 'Tap "What\'s on your mind?", paste content',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: 'briefcase.fill',
    color: '#0A66C2',
    appUrl: 'linkedin://share',
    webUrl: 'https://www.linkedin.com/feed/',
    iosStoreUrl: 'https://apps.apple.com/app/linkedin/id288429040',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.linkedin.android',
    charLimit: 3000,
    instructions: 'Tap "Start a post", paste your content',
  },
  threads: {
    name: 'Threads',
    icon: 'at',
    color: '#000000',
    appUrl: 'barcelona://create',
    webUrl: 'https://www.threads.net/',
    iosStoreUrl: 'https://apps.apple.com/app/threads/id6446901002',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.instagram.barcelona',
    charLimit: 500,
    instructions: 'Tap + to create, paste your content',
  },
  youtube: {
    name: 'YouTube',
    icon: 'play.rectangle.fill',
    color: '#FF0000',
    appUrl: 'youtube://upload',
    webUrl: 'https://studio.youtube.com/',
    iosStoreUrl: 'https://apps.apple.com/app/youtube/id544007664',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.youtube',
    charLimit: 5000,
    instructions: 'Upload video, paste title & description',
  },
  reddit: {
    name: 'Reddit',
    icon: 'bubble.left.fill',
    color: '#FF4500',
    appUrl: 'reddit://submit',
    webUrl: 'https://www.reddit.com/submit',
    iosStoreUrl: 'https://apps.apple.com/app/reddit/id1064216828',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.reddit.frontpage',
    charLimit: 40000,
    instructions: 'Choose subreddit, paste your content',
  },
  pinterest: {
    name: 'Pinterest',
    icon: 'pin.fill',
    color: '#E60023',
    appUrl: 'pinterest://pin/create',
    webUrl: 'https://www.pinterest.com/pin-builder/',
    iosStoreUrl: 'https://apps.apple.com/app/pinterest/id429047995',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.pinterest',
    charLimit: 500,
    instructions: 'Create pin, paste description',
  },
  bluesky: {
    name: 'Bluesky',
    icon: 'cloud.fill',
    color: '#0085FF',
    appUrl: 'bluesky://compose',
    webUrl: 'https://bsky.app/',
    iosStoreUrl: 'https://apps.apple.com/app/bluesky-social/id6444370199',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=xyz.blueskyweb.app',
    charLimit: 300,
    instructions: 'Tap + to post, paste your content',
  },
};

/**
 * Copy content to clipboard and open the native app
 */
export async function copyAndOpenApp(
  platform: SocialPlatform,
  content: string
): Promise<{ success: boolean; message: string }> {
  const config = PLATFORM_CONFIGS[platform];
  
  if (!config) {
    return { success: false, message: 'Unknown platform' };
  }

  // Truncate content if needed
  const truncatedContent = content.length > config.charLimit 
    ? content.substring(0, config.charLimit - 3) + '...'
    : content;

  try {
    // Copy to clipboard
    await Clipboard.setStringAsync(truncatedContent);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Try to open the app
    const canOpenApp = await Linking.canOpenURL(config.appUrl);
    
    if (canOpenApp) {
      await Linking.openURL(config.appUrl);
      return {
        success: true,
        message: `Content copied! ${config.instructions}`,
      };
    } else {
      // App not installed - open web version or store
      const webCanOpen = await Linking.canOpenURL(config.webUrl);
      if (webCanOpen) {
        await Linking.openURL(config.webUrl);
        return {
          success: true,
          message: `Content copied! Opening ${config.name} in browser. ${config.instructions}`,
        };
      } else {
        // Offer to install the app
        const storeUrl = Platform.OS === 'ios' ? config.iosStoreUrl : config.androidStoreUrl;
        Alert.alert(
          `${config.name} Not Installed`,
          `Would you like to install ${config.name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Install', onPress: () => Linking.openURL(storeUrl) },
          ]
        );
        return {
          success: true,
          message: `Content copied to clipboard! Install ${config.name} to post.`,
        };
      }
    }
  } catch (error) {
    console.error('Error in copyAndOpenApp:', error);
    return {
      success: false,
      message: `Failed to open ${config.name}. Content copied to clipboard.`,
    };
  }
}

/**
 * Just copy content to clipboard without opening app
 */
export async function copyToClipboard(content: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(content);
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Get platform display info
 */
export function getPlatformInfo(platform: SocialPlatform) {
  return PLATFORM_CONFIGS[platform];
}

/**
 * Get all available platforms
 */
export function getAllPlatforms(): SocialPlatform[] {
  return Object.keys(PLATFORM_CONFIGS) as SocialPlatform[];
}

/**
 * Format content for a specific platform (add hashtags, truncate, etc.)
 */
export function formatContentForPlatform(
  content: string,
  platform: SocialPlatform,
  hashtags?: string[]
): string {
  const config = PLATFORM_CONFIGS[platform];
  let formatted = content;

  // Add hashtags if provided
  if (hashtags && hashtags.length > 0) {
    const hashtagString = hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    formatted = `${content}\n\n${hashtagString}`;
  }

  // Truncate if needed
  if (formatted.length > config.charLimit) {
    const truncateAt = config.charLimit - 3;
    formatted = formatted.substring(0, truncateAt) + '...';
  }

  return formatted;
}
