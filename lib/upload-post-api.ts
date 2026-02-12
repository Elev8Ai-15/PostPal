/**
 * Upload-Post API Service
 * 
 * Integrates with https://api.upload-post.com/api for real social media posting.
 * Supports text, photo, and video uploads to 10+ platforms.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = "https://api.upload-post.com/api";
const API_KEY_STORAGE = "@postpal_upload_post_api_key";
const USER_PROFILE_STORAGE = "@postpal_upload_post_user";

// Platform mapping from PostPal platform IDs to Upload-Post platform names
export const UPLOAD_POST_PLATFORMS: Record<string, string> = {
  instagram: "instagram",
  twitter: "x",
  linkedin: "linkedin",
  facebook: "facebook",
  youtube: "youtube",
  tiktok: "tiktok",
  reddit: "reddit",
  threads: "threads",
  bluesky: "bluesky",
  pinterest: "pinterest",
};

// Which platforms support text-only posts
const TEXT_PLATFORMS = ["x", "linkedin", "facebook", "threads", "reddit", "bluesky"];

// Which platforms support photo posts
const PHOTO_PLATFORMS = ["tiktok", "instagram", "linkedin", "facebook", "x", "threads", "pinterest", "bluesky", "reddit"];

export interface UploadPostConfig {
  apiKey: string;
  userProfile: string; // Upload-Post user profile identifier
}

export interface PostResult {
  success: boolean;
  platform: string;
  postUrl?: string;
  error?: string;
  requestId?: string;
}

export interface MultiPostResult {
  overallSuccess: boolean;
  results: PostResult[];
  failedPlatforms: string[];
  successPlatforms: string[];
}

// ---- API Key Management ----

export async function saveApiConfig(config: UploadPostConfig): Promise<void> {
  await AsyncStorage.setItem(API_KEY_STORAGE, config.apiKey);
  await AsyncStorage.setItem(USER_PROFILE_STORAGE, config.userProfile);
}

export async function getApiConfig(): Promise<UploadPostConfig | null> {
  const apiKey = await AsyncStorage.getItem(API_KEY_STORAGE);
  const userProfile = await AsyncStorage.getItem(USER_PROFILE_STORAGE);
  if (!apiKey || !userProfile) return null;
  return { apiKey, userProfile };
}

export async function clearApiConfig(): Promise<void> {
  await AsyncStorage.removeItem(API_KEY_STORAGE);
  await AsyncStorage.removeItem(USER_PROFILE_STORAGE);
}

export async function isApiConfigured(): Promise<boolean> {
  const config = await getApiConfig();
  return config !== null && config.apiKey.length > 0 && config.userProfile.length > 0;
}

// ---- API Calls ----

async function apiCall(
  endpoint: string,
  method: "GET" | "POST" | "DELETE" | "PATCH",
  body?: FormData | Record<string, any>,
  apiKey?: string,
): Promise<any> {
  const config = apiKey ? { apiKey, userProfile: "" } : await getApiConfig();
  if (!config?.apiKey) {
    throw new Error("Upload-Post API key not configured. Go to Settings > Upload-Post API to set it up.");
  }

  const headers: Record<string, string> = {
    Authorization: `Apikey ${config.apiKey}`,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorText;
    } catch {
      errorMessage = errorText;
    }
    throw new Error(`Upload-Post API error (${response.status}): ${errorMessage}`);
  }

  return response.json();
}

// ---- Text Post ----

export interface TextPostParams {
  platforms: string[]; // PostPal platform IDs
  content: string;
  platformContent?: Record<string, string>; // Platform-specific content overrides
  scheduledDate?: string; // ISO-8601
  timezone?: string;
  subreddit?: string; // Required for Reddit
  facebookPageId?: string;
  linkedinPageId?: string;
  pinterestBoardId?: string;
}

export async function postText(params: TextPostParams): Promise<MultiPostResult> {
  const config = await getApiConfig();
  if (!config) throw new Error("Upload-Post API not configured");

  const results: PostResult[] = [];
  const failedPlatforms: string[] = [];
  const successPlatforms: string[] = [];

  // Map PostPal platform IDs to Upload-Post platform names
  const uploadPostPlatforms = params.platforms
    .map(p => UPLOAD_POST_PLATFORMS[p])
    .filter(p => p && TEXT_PLATFORMS.includes(p));

  if (uploadPostPlatforms.length === 0) {
    // Some platforms (Instagram, TikTok, YouTube, Pinterest) don't support text-only posts
    // Return info about unsupported platforms
    for (const platform of params.platforms) {
      const upPlatform = UPLOAD_POST_PLATFORMS[platform];
      if (!upPlatform || !TEXT_PLATFORMS.includes(upPlatform)) {
        results.push({
          success: false,
          platform,
          error: `${platform} doesn't support text-only posts. Add an image or video.`,
        });
        failedPlatforms.push(platform);
      }
    }
    return { overallSuccess: false, results, failedPlatforms, successPlatforms };
  }

  const formData = new FormData();
  formData.append("user", config.userProfile);
  formData.append("title", params.content);

  // Add each platform
  for (const platform of uploadPostPlatforms) {
    formData.append("platform[]", platform);
  }

  // Platform-specific content overrides
  if (params.platformContent) {
    for (const [platform, content] of Object.entries(params.platformContent)) {
      const upPlatform = UPLOAD_POST_PLATFORMS[platform];
      if (upPlatform && content) {
        formData.append(`${upPlatform}_title`, content);
      }
    }
  }

  // Required fields for specific platforms
  if (params.subreddit && uploadPostPlatforms.includes("reddit")) {
    formData.append("subreddit", params.subreddit);
  }
  if (params.facebookPageId && uploadPostPlatforms.includes("facebook")) {
    formData.append("facebook_page_id", params.facebookPageId);
  }
  if (params.linkedinPageId && uploadPostPlatforms.includes("linkedin")) {
    formData.append("target_linkedin_page_id", params.linkedinPageId);
  }

  // Scheduling
  if (params.scheduledDate) {
    formData.append("scheduled_date", params.scheduledDate);
    if (params.timezone) {
      formData.append("timezone", params.timezone);
    }
  }

  // Use async upload for better UX
  formData.append("async_upload", "true");

  try {
    const response = await apiCall("/upload_text", "POST", formData);
    
    if (response.success) {
      // Parse platform-level results
      const platformResults = response.data?.platforms || [];
      for (const pr of platformResults) {
        successPlatforms.push(pr.name);
        results.push({
          success: true,
          platform: pr.name,
          postUrl: pr.url,
          requestId: response.id,
        });
      }

      // If no platform-level results, treat as overall success
      if (platformResults.length === 0) {
        for (const platform of uploadPostPlatforms) {
          successPlatforms.push(platform);
          results.push({
            success: true,
            platform,
            requestId: response.id || response.request_id,
          });
        }
      }
    } else {
      for (const platform of uploadPostPlatforms) {
        failedPlatforms.push(platform);
        results.push({
          success: false,
          platform,
          error: response.message || "Upload failed",
        });
      }
    }
  } catch (error: any) {
    for (const platform of uploadPostPlatforms) {
      failedPlatforms.push(platform);
      results.push({
        success: false,
        platform,
        error: error.message || "Network error",
      });
    }
  }

  // Add results for non-text platforms that were skipped
  for (const platform of params.platforms) {
    const upPlatform = UPLOAD_POST_PLATFORMS[platform];
    if (!upPlatform || !TEXT_PLATFORMS.includes(upPlatform)) {
      if (!results.find(r => r.platform === platform)) {
        results.push({
          success: false,
          platform,
          error: `${platform} requires an image or video for posting`,
        });
        failedPlatforms.push(platform);
      }
    }
  }

  return {
    overallSuccess: failedPlatforms.length === 0,
    results,
    failedPlatforms,
    successPlatforms,
  };
}

// ---- Validate API Key ----

export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; user?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/uploadposts/me`, {
      method: "GET",
      headers: {
        Authorization: `Apikey ${apiKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { valid: true, user: data };
    } else if (response.status === 401) {
      return { valid: false, error: "Invalid API key" };
    } else {
      return { valid: false, error: `API error: ${response.status}` };
    }
  } catch (error: any) {
    return { valid: false, error: error.message || "Network error" };
  }
}

// ---- Get Upload History ----

export async function getUploadHistory(): Promise<any[]> {
  try {
    const response = await apiCall("/uploadposts/history", "GET");
    return response.data || response || [];
  } catch {
    return [];
  }
}

// ---- Get Upload Status ----

export async function getUploadStatus(requestId: string): Promise<any> {
  try {
    const response = await apiCall(`/uploadposts/status?request_id=${requestId}`, "GET");
    return response;
  } catch {
    return null;
  }
}

// ---- Get Facebook Pages ----

export async function getFacebookPages(): Promise<any[]> {
  try {
    const response = await apiCall("/uploadposts/facebook/pages", "GET");
    return response.data || response || [];
  } catch {
    return [];
  }
}

// ---- Get LinkedIn Pages ----

export async function getLinkedInPages(): Promise<any[]> {
  try {
    const response = await apiCall("/uploadposts/linkedin/pages", "GET");
    return response.data || response || [];
  } catch {
    return [];
  }
}

// ---- Get Pinterest Boards ----

export async function getPinterestBoards(): Promise<any[]> {
  try {
    const response = await apiCall("/uploadposts/pinterest/boards", "GET");
    return response.data || response || [];
  } catch {
    return [];
  }
}

// ---- Scheduled Posts ----

export async function getScheduledPosts(): Promise<any[]> {
  try {
    const response = await apiCall("/uploadposts/schedule", "GET");
    return response.data || response || [];
  } catch {
    return [];
  }
}

export async function cancelScheduledPost(jobId: string): Promise<boolean> {
  try {
    await apiCall(`/uploadposts/schedule/${jobId}`, "DELETE");
    return true;
  } catch {
    return false;
  }
}
