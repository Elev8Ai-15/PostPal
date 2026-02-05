import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PLATFORM_CONFIGS,
  getAllPlatforms,
  getPlatformInfo,
  formatContentForPlatform,
  copyToClipboard,
} from '../simple-posting';

// Mock expo-clipboard
vi.mock('expo-clipboard', () => ({
  setStringAsync: vi.fn().mockResolvedValue(undefined),
}));

// Mock expo-haptics
vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
  },
}));

// Mock react-native
vi.mock('react-native', () => ({
  Linking: {
    canOpenURL: vi.fn().mockResolvedValue(true),
    openURL: vi.fn().mockResolvedValue(undefined),
  },
  Platform: {
    OS: 'ios',
  },
  Alert: {
    alert: vi.fn(),
  },
}));

describe('Simple Posting Service', () => {
  describe('PLATFORM_CONFIGS', () => {
    it('should have all 10 supported platforms', () => {
      const platforms = Object.keys(PLATFORM_CONFIGS);
      expect(platforms).toContain('tiktok');
      expect(platforms).toContain('instagram');
      expect(platforms).toContain('twitter');
      expect(platforms).toContain('facebook');
      expect(platforms).toContain('linkedin');
      expect(platforms).toContain('threads');
      expect(platforms).toContain('youtube');
      expect(platforms).toContain('reddit');
      expect(platforms).toContain('pinterest');
      expect(platforms).toContain('bluesky');
      expect(platforms.length).toBe(10);
    });

    it('should have required properties for each platform', () => {
      Object.entries(PLATFORM_CONFIGS).forEach(([platform, config]) => {
        expect(config.name).toBeDefined();
        expect(config.icon).toBeDefined();
        expect(config.color).toBeDefined();
        expect(config.appUrl).toBeDefined();
        expect(config.webUrl).toBeDefined();
        expect(config.iosStoreUrl).toBeDefined();
        expect(config.androidStoreUrl).toBeDefined();
        expect(config.charLimit).toBeGreaterThan(0);
        expect(config.instructions).toBeDefined();
      });
    });

    it('should have correct character limits', () => {
      expect(PLATFORM_CONFIGS.twitter.charLimit).toBe(280);
      expect(PLATFORM_CONFIGS.instagram.charLimit).toBe(2200);
      expect(PLATFORM_CONFIGS.tiktok.charLimit).toBe(2200);
      expect(PLATFORM_CONFIGS.linkedin.charLimit).toBe(3000);
      expect(PLATFORM_CONFIGS.threads.charLimit).toBe(500);
      expect(PLATFORM_CONFIGS.bluesky.charLimit).toBe(300);
    });

    it('should have valid deep link URLs', () => {
      expect(PLATFORM_CONFIGS.tiktok.appUrl).toBe('tiktok://');
      expect(PLATFORM_CONFIGS.instagram.appUrl).toBe('instagram://camera');
      expect(PLATFORM_CONFIGS.twitter.appUrl).toBe('twitter://post');
      expect(PLATFORM_CONFIGS.facebook.appUrl).toBe('fb://publish');
    });

    it('should have valid web URLs', () => {
      expect(PLATFORM_CONFIGS.tiktok.webUrl).toContain('tiktok.com');
      expect(PLATFORM_CONFIGS.instagram.webUrl).toContain('instagram.com');
      expect(PLATFORM_CONFIGS.twitter.webUrl).toContain('twitter.com');
      expect(PLATFORM_CONFIGS.linkedin.webUrl).toContain('linkedin.com');
    });
  });

  describe('getAllPlatforms', () => {
    it('should return all platform IDs', () => {
      const platforms = getAllPlatforms();
      expect(platforms.length).toBe(10);
      expect(platforms).toContain('tiktok');
      expect(platforms).toContain('instagram');
    });
  });

  describe('getPlatformInfo', () => {
    it('should return correct platform info', () => {
      const tiktokInfo = getPlatformInfo('tiktok');
      expect(tiktokInfo.name).toBe('TikTok');
      expect(tiktokInfo.color).toBe('#000000');
      
      const instagramInfo = getPlatformInfo('instagram');
      expect(instagramInfo.name).toBe('Instagram');
      expect(instagramInfo.color).toBe('#E4405F');
    });
  });

  describe('formatContentForPlatform', () => {
    it('should add hashtags to content', () => {
      const content = 'Test post';
      const hashtags = ['test', 'hashtag'];
      const formatted = formatContentForPlatform(content, 'instagram', hashtags);
      
      expect(formatted).toContain('Test post');
      expect(formatted).toContain('#test');
      expect(formatted).toContain('#hashtag');
    });

    it('should handle hashtags with # prefix', () => {
      const content = 'Test post';
      const hashtags = ['#already', 'noprefix'];
      const formatted = formatContentForPlatform(content, 'instagram', hashtags);
      
      expect(formatted).toContain('#already');
      expect(formatted).toContain('#noprefix');
      // Should not double the # prefix
      expect(formatted).not.toContain('##already');
    });

    it('should truncate content exceeding character limit', () => {
      const longContent = 'A'.repeat(300); // Longer than Twitter's 280 limit
      const formatted = formatContentForPlatform(longContent, 'twitter');
      
      expect(formatted.length).toBeLessThanOrEqual(280);
      expect(formatted).toContain('...');
    });

    it('should not truncate content within limit', () => {
      const shortContent = 'Short tweet';
      const formatted = formatContentForPlatform(shortContent, 'twitter');
      
      expect(formatted).toBe('Short tweet');
      expect(formatted).not.toContain('...');
    });
  });

  describe('copyToClipboard', () => {
    it('should copy content to clipboard', async () => {
      const Clipboard = await import('expo-clipboard');
      const result = await copyToClipboard('Test content');
      
      expect(result).toBe(true);
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('Test content');
    });
  });

  describe('Platform-specific configurations', () => {
    it('TikTok should be video-focused', () => {
      const tiktok = PLATFORM_CONFIGS.tiktok;
      expect(tiktok.instructions).toContain('create');
      expect(tiktok.instructions).toContain('caption');
    });

    it('LinkedIn should be professional', () => {
      const linkedin = PLATFORM_CONFIGS.linkedin;
      expect(linkedin.instructions).toContain('post');
    });

    it('Reddit should mention subreddits', () => {
      const reddit = PLATFORM_CONFIGS.reddit;
      expect(reddit.instructions.toLowerCase()).toContain('subreddit');
    });
  });
});
