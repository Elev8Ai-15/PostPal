import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import * as db from "./db";
import * as socialIntegration from "./social-integration";
import * as stripeService from "./stripe";

// Helper to calculate next scheduled date for recurring templates
function calculateNextScheduledDate(
  recurrenceType: "daily" | "weekly" | "biweekly" | "monthly",
  recurrenceDays: string | null,
  recurrenceTime: string | null,
  fromDate: Date = new Date()
): Date {
  const [hours, minutes] = (recurrenceTime || "09:00").split(":").map(Number);
  const next = new Date(fromDate);
  next.setHours(hours, minutes, 0, 0);

  switch (recurrenceType) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly": {
      const days = recurrenceDays?.split(",").map(Number) || [1]; // Default Monday
      const currentDay = next.getDay();
      const nextDay = days.find(d => d > currentDay) || days[0];
      const daysToAdd = nextDay > currentDay ? nextDay - currentDay : 7 - currentDay + nextDay;
      next.setDate(next.getDate() + daysToAdd);
      break;
    }
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
  }

  return next;
}

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Posts / Content Management
  posts: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getUserPosts(ctx.user.id);
    }),

    pending: protectedProcedure.query(({ ctx }) => {
      return db.getPendingPosts(ctx.user.id);
    }),

    scheduled: protectedProcedure.query(({ ctx }) => {
      return db.getScheduledPosts(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => {
        return db.getPostById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        contentType: z.enum(["social", "blog", "newsletter", "video"]),
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube", "tiktok", "reddit", "threads", "bluesky", "email", "blog"]).optional(),
        scheduledAt: z.date().optional(),
        imageUrl: z.string().optional(),
        aiGenerated: z.boolean().optional(),
        reminderEnabled: z.boolean().optional(),
        reminderMinutesBefore: z.number().optional(),
        templateId: z.number().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.createPost({
          userId: ctx.user.id,
          title: input.title,
          content: input.content,
          contentType: input.contentType,
          platform: input.platform,
          scheduledAt: input.scheduledAt,
          imageUrl: input.imageUrl,
          aiGenerated: input.aiGenerated ?? false,
          reminderEnabled: input.reminderEnabled ?? true,
          reminderMinutesBefore: input.reminderMinutesBefore ?? 30,
          templateId: input.templateId,
          status: input.scheduledAt ? "scheduled" : "draft",
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().optional(),
        status: z.enum(["draft", "pending", "approved", "scheduled", "published", "rejected"]).optional(),
        scheduledAt: z.date().optional(),
        imageUrl: z.string().optional(),
        reminderEnabled: z.boolean().optional(),
        reminderMinutesBefore: z.number().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updatePost(id, ctx.user.id, data);
      }),

    approve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.updatePost(input.id, ctx.user.id, { status: "approved" });
      }),

    reject: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.updatePost(input.id, ctx.user.id, { status: "rejected" });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.deletePost(input.id, ctx.user.id);
      }),

    schedule: protectedProcedure
      .input(z.object({
        id: z.number(),
        scheduledAt: z.date(),
        reminderEnabled: z.boolean().optional(),
        reminderMinutesBefore: z.number().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.updatePost(input.id, ctx.user.id, {
          scheduledAt: input.scheduledAt,
          status: "scheduled",
          reminderEnabled: input.reminderEnabled ?? true,
          reminderMinutesBefore: input.reminderMinutesBefore ?? 30,
          reminderSent: false,
        });
      }),

    // Reschedule via drag-and-drop
    reschedule: protectedProcedure
      .input(z.object({
        id: z.number(),
        scheduledAt: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updatePost(input.id, ctx.user.id, {
          scheduledAt: input.scheduledAt,
          reminderSent: false, // Reset reminder for new time
        });
        return { success: true };
      }),
  }),

  // Recurring Post Templates
  templates: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getUserTemplates(ctx.user.id);
    }),

    active: protectedProcedure.query(({ ctx }) => {
      return db.getActiveTemplates(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => {
        return db.getTemplateById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        contentType: z.enum(["social", "blog", "newsletter", "video"]),
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube", "tiktok", "reddit", "threads", "bluesky", "email", "blog"]).optional(),
        recurrenceType: z.enum(["daily", "weekly", "biweekly", "monthly"]),
        recurrenceDays: z.string().optional(), // "1,3,5" for Mon, Wed, Fri
        recurrenceTime: z.string().optional(), // "09:00"
      }))
      .mutation(async ({ ctx, input }) => {
        const nextScheduledAt = calculateNextScheduledDate(
          input.recurrenceType,
          input.recurrenceDays || null,
          input.recurrenceTime || null
        );

        return db.createTemplate({
          userId: ctx.user.id,
          title: input.title,
          content: input.content,
          contentType: input.contentType,
          platform: input.platform,
          recurrenceType: input.recurrenceType,
          recurrenceDays: input.recurrenceDays,
          recurrenceTime: input.recurrenceTime || "09:00",
          isActive: true,
          nextScheduledAt,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().optional(),
        recurrenceType: z.enum(["daily", "weekly", "biweekly", "monthly"]).optional(),
        recurrenceDays: z.string().optional(),
        recurrenceTime: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        
        // Recalculate next scheduled if recurrence changed
        if (input.recurrenceType || input.recurrenceDays || input.recurrenceTime) {
          const template = await db.getTemplateById(id, ctx.user.id);
          if (template) {
            const nextScheduledAt = calculateNextScheduledDate(
              input.recurrenceType || template.recurrenceType,
              input.recurrenceDays || template.recurrenceDays,
              input.recurrenceTime || template.recurrenceTime
            );
            await db.updateTemplate(id, ctx.user.id, { ...data, nextScheduledAt });
            return;
          }
        }
        
        return db.updateTemplate(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.deleteTemplate(input.id, ctx.user.id);
      }),

    // Generate post from template now
    generatePost: protectedProcedure
      .input(z.object({ 
        templateId: z.number(),
        scheduledAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const template = await db.getTemplateById(input.templateId, ctx.user.id);
        if (!template) throw new Error("Template not found");

        const scheduledAt = input.scheduledAt || new Date();
        
        const postId = await db.createPost({
          userId: ctx.user.id,
          title: template.title,
          content: template.content,
          contentType: template.contentType,
          platform: template.platform,
          scheduledAt,
          templateId: template.id,
          status: "scheduled",
          reminderEnabled: true,
        });

        return { postId, scheduledAt };
      }),
  }),

  // Notification Settings
  notifications: router({
    getSettings: protectedProcedure.query(({ ctx }) => {
      return db.getUserNotificationSettings(ctx.user.id);
    }),

    updateSettings: protectedProcedure
      .input(z.object({
        pushEnabled: z.boolean().optional(),
        emailEnabled: z.boolean().optional(),
        reminderMinutesBefore: z.number().min(5).max(1440).optional(),
        dailyDigestEnabled: z.boolean().optional(),
        dailyDigestTime: z.string().optional(),
        expoPushToken: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.upsertNotificationSettings(ctx.user.id, input);
      }),

    // Register push token from device
    registerPushToken: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(({ ctx, input }) => {
        return db.upsertNotificationSettings(ctx.user.id, { expoPushToken: input.token });
      }),

    // Send test notification
    sendTest: protectedProcedure.mutation(async ({ ctx }) => {
      const result = await notifyOwner({
        title: "PostPal Test Notification",
        content: `Test notification sent by user ${ctx.user.name || ctx.user.id} at ${new Date().toLocaleString()}`,
      });
      return { success: result };
    }),

    // Check for posts needing reminders (called by scheduled job)
    checkReminders: protectedProcedure.mutation(async ({ ctx }) => {
      const postsNeedingReminders = await db.getPostsNeedingReminders();
      const userPosts = postsNeedingReminders.filter(p => p.userId === ctx.user.id);
      
      for (const post of userPosts) {
        const settings = await db.getUserNotificationSettings(post.userId);
        if (settings?.pushEnabled) {
          // Send notification via owner notification (in production, use Expo Push)
          await notifyOwner({
            title: `Reminder: "${post.title}" scheduled soon`,
            content: `Your post "${post.title}" is scheduled for ${post.scheduledAt?.toLocaleString()}. Review it before it goes live!`,
          });
          await db.markReminderSent(post.id);
        }
      }
      
      return { processed: userPosts.length };
    }),
  }),

  // Social Accounts
  socialAccounts: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getUserSocialAccounts(ctx.user.id);
    }),

    connect: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube"]),
        accountName: z.string().optional(),
        accountId: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.connectSocialAccount({
          userId: ctx.user.id,
          platform: input.platform,
          accountName: input.accountName,
          accountId: input.accountId,
          isConnected: true,
        });
      }),

    disconnect: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.disconnectSocialAccount(input.id, ctx.user.id);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        followerCount: z.number().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateSocialAccount(id, ctx.user.id, data);
      }),
  }),

  // Analytics
  analytics: router({
    get: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(({ ctx, input }) => {
        return db.getUserAnalytics(ctx.user.id, input?.startDate, input?.endDate);
      }),

    record: protectedProcedure
      .input(z.object({
        date: z.date(),
        followers: z.number().optional(),
        impressions: z.number().optional(),
        engagement: z.number().optional(),
        clicks: z.number().optional(),
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube", "all"]).optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.recordAnalytics({
          userId: ctx.user.id,
          date: input.date,
          followers: input.followers ?? 0,
          impressions: input.impressions ?? 0,
          engagement: input.engagement ?? 0,
          clicks: input.clicks ?? 0,
          platform: input.platform ?? "all",
        });
      }),
  }),

  // Strategy
  strategy: router({
    get: protectedProcedure.query(({ ctx }) => {
      return db.getUserStrategy(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        summary: z.string().optional(),
        goals: z.string().optional(),
        contentPillars: z.string().optional(),
        targetAudience: z.string().optional(),
        recommendations: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.createStrategy({
          userId: ctx.user.id,
          title: input.title,
          summary: input.summary,
          goals: input.goals,
          contentPillars: input.contentPillars,
          targetAudience: input.targetAudience,
          recommendations: input.recommendations,
          isActive: true,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        summary: z.string().optional(),
        goals: z.string().optional(),
        contentPillars: z.string().optional(),
        targetAudience: z.string().optional(),
        recommendations: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateStrategy(id, ctx.user.id, data);
      }),
  }),

  // Campaigns - Multi-platform campaign management
  campaigns: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getUserCampaigns(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => {
        return db.getCampaignById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.createCampaign({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          startDate: input.startDate,
          endDate: input.endDate,
          status: "draft",
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "active", "completed", "paused"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateCampaign(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.deleteCampaign(input.id, ctx.user.id);
      }),

    // Campaign posts management
    getPosts: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify campaign ownership before returning posts
        const campaign = await db.getCampaignById(input.campaignId, ctx.user.id);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        return db.getCampaignPosts(input.campaignId);
      }),

    addPost: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        postId: z.number(),
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube", "tiktok", "reddit"]),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify campaign ownership before adding post
        const campaign = await db.getCampaignById(input.campaignId, ctx.user.id);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        return db.addPostToCampaign({
          campaignId: input.campaignId,
          postId: input.postId,
          platform: input.platform,
        });
      }),

    removePost: protectedProcedure
      .input(z.object({ campaignPostId: z.number(), campaignId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify campaign ownership before removing post
        const campaign = await db.getCampaignById(input.campaignId, ctx.user.id);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        return db.removePostFromCampaign(input.campaignPostId);
      }),

    updatePostMetrics: protectedProcedure
      .input(z.object({
        id: z.number(),
        campaignId: z.number(),
        impressions: z.number().optional(),
        engagement: z.number().optional(),
        clicks: z.number().optional(),
        likes: z.number().optional(),
        comments: z.number().optional(),
        shares: z.number().optional(),
        performanceScore: z.number().min(0).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify campaign ownership before updating metrics
        const campaign = await db.getCampaignById(input.campaignId, ctx.user.id);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        const { id, campaignId, ...data } = input;
        return db.updateCampaignPostMetrics(id, data);
      }),

    // Campaign analytics
    getAnalytics: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify campaign ownership before returning analytics
        const campaign = await db.getCampaignById(input.campaignId, ctx.user.id);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        return db.getCampaignAnalytics(input.campaignId);
      }),

    refreshAggregates: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.updateCampaignAggregates(input.campaignId, ctx.user.id);
      }),
  }),

  // Dashboard
  dashboard: router({
    stats: protectedProcedure.query(({ ctx }) => {
      return db.getDashboardStats(ctx.user.id);
    }),
  }),

  // Unified Social Inbox
  inbox: router({
    messages: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube", "all"]).optional(),
        messageType: z.enum(["dm", "comment", "mention", "reply", "all"]).optional(),
        isRead: z.boolean().optional(),
        isArchived: z.boolean().optional(),
        isStarred: z.boolean().optional(),
      }).optional())
      .query(({ ctx, input }) => {
        return db.getInboxMessages(ctx.user.id, input);
      }),

    getMessage: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => {
        return db.getInboxMessageById(input.id, ctx.user.id);
      }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.markMessageRead(input.id, ctx.user.id);
      }),

    toggleStar: protectedProcedure
      .input(z.object({ id: z.number(), isStarred: z.boolean() }))
      .mutation(({ ctx, input }) => {
        return db.markMessageStarred(input.id, ctx.user.id, input.isStarred);
      }),

    archive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.archiveMessage(input.id, ctx.user.id);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.deleteInboxMessage(input.id, ctx.user.id);
      }),

    unreadCount: protectedProcedure.query(({ ctx }) => {
      return db.getUnreadCount(ctx.user.id);
    }),

    // Saved Replies
    savedReplies: protectedProcedure.query(({ ctx }) => {
      return db.getSavedReplies(ctx.user.id);
    }),

    createSavedReply: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        category: z.string().optional(),
        shortcut: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.createSavedReply({
          userId: ctx.user.id,
          title: input.title,
          content: input.content,
          category: input.category,
          shortcut: input.shortcut,
        });
      }),

    updateSavedReply: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        category: z.string().optional(),
        shortcut: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateSavedReply(id, ctx.user.id, data);
      }),

    deleteSavedReply: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.deleteSavedReply(input.id, ctx.user.id);
      }),

    useSavedReply: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.incrementSavedReplyUseCount(input.id, ctx.user.id);
      }),

    // Auto Responders
    autoResponders: protectedProcedure.query(({ ctx }) => {
      return db.getAutoResponders(ctx.user.id);
    }),

    createAutoResponder: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        triggerType: z.enum(["keyword", "first_message", "mention", "all"]),
        triggerKeywords: z.string().optional(),
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube", "all"]).optional(),
        messageType: z.enum(["dm", "comment", "mention", "all"]).optional(),
        responseContent: z.string().min(1),
        delaySeconds: z.number().min(0).max(3600).optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.createAutoResponder({
          userId: ctx.user.id,
          name: input.name,
          triggerType: input.triggerType,
          triggerKeywords: input.triggerKeywords,
          platform: input.platform || "all",
          messageType: input.messageType || "all",
          responseContent: input.responseContent,
          delaySeconds: input.delaySeconds || 0,
          isActive: true,
        });
      }),

    updateAutoResponder: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        triggerType: z.enum(["keyword", "first_message", "mention", "all"]).optional(),
        triggerKeywords: z.string().optional(),
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube", "all"]).optional(),
        messageType: z.enum(["dm", "comment", "mention", "all"]).optional(),
        responseContent: z.string().optional(),
        delaySeconds: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateAutoResponder(id, ctx.user.id, data);
      }),

    deleteAutoResponder: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.deleteAutoResponder(input.id, ctx.user.id);
      }),

    // AI-powered reply suggestion
    suggestReply: protectedProcedure
      .input(z.object({
        messageContent: z.string().min(1),
        senderName: z.string().optional(),
        tone: z.enum(["professional", "friendly", "casual", "empathetic"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const toneInstructions = {
          professional: "Use a professional and courteous tone.",
          friendly: "Use a warm and friendly tone.",
          casual: "Use a casual and relaxed tone.",
          empathetic: "Use an empathetic and understanding tone.",
        };

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a helpful social media manager assistant. Generate a thoughtful reply to the message.
${input.tone ? toneInstructions[input.tone] : toneInstructions.friendly}
Keep the reply concise but helpful. Return JSON: { "reply": "your suggested reply", "alternatives": ["alt1", "alt2"] }`
            },
            {
              role: "user",
              content: `Generate a reply to this message${input.senderName ? ` from ${input.senderName}` : ""}:\n"${input.messageContent}"`
            },
          ],
          response_format: { type: "json_object" },
        });

        const content = response.choices[0].message.content;
        return JSON.parse(typeof content === "string" ? content : "{}");
      }),
  }),

  // AI Content Generation
  ai: router({
    // Generate content for a single platform
    generateContent: protectedProcedure
      .input(z.object({
        contentType: z.enum(["social", "blog", "newsletter", "video"]),
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube", "tiktok", "reddit", "threads", "bluesky", "email", "blog"]).optional(),
        topic: z.string().min(1),
        tone: z.enum(["professional", "casual", "friendly", "authoritative", "humorous"]).optional(),
        keywords: z.array(z.string()).optional(),
        brandContext: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const platformName = input.platform || "general";

        const systemPrompt = `You are an elite social media content strategist and copywriter with deep expertise in digital marketing. Your job is to create REAL, SUBSTANTIVE, READY-TO-POST content that provides genuine value to the audience.

CRITICAL RULES:
1. DO NOT just rephrase or rewrite the topic. You must CREATE original, valuable content.
2. Include REAL insights, actionable tips, specific strategies, or thought-provoking perspectives.
3. Write as if you are a subject matter expert who has researched this topic thoroughly.
4. Include specific numbers, frameworks, or data points where relevant (use realistic estimates if exact data isn't available).
5. Every piece of content must provide VALUE — teach something, inspire action, or share a unique perspective.
6. Match the exact tone and format that performs best on ${platformName}.

PLATFORM-SPECIFIC REQUIREMENTS:
${input.platform === "instagram" ? "- Write a compelling caption with line breaks for readability\n- Start with a strong hook (first line must stop the scroll)\n- Include 2-3 actionable takeaways or tips\n- End with a clear call-to-action (save, share, comment)\n- Use strategic emoji placement (not excessive)\n- Suggest 15-20 relevant hashtags mixing popular and niche" : ""}
${input.platform === "twitter" ? "- MUST be under 280 characters for the main tweet\n- Start with a bold, attention-grabbing statement\n- Be punchy, direct, and quotable\n- If the topic needs more depth, structure as a thread (Tweet 1, Tweet 2, etc.)\n- Include 1-2 relevant hashtags max\n- End with engagement driver (question, hot take, or CTA)" : ""}
${input.platform === "linkedin" ? "- Write a professional thought-leadership post\n- Start with a hook line that creates curiosity\n- Share a personal insight, industry trend, or contrarian take\n- Include specific data, examples, or case studies\n- Use short paragraphs (1-2 sentences each) for readability\n- End with a question to drive comments\n- Include 3-5 professional hashtags" : ""}
${input.platform === "facebook" ? "- Write conversational, community-focused content\n- Start with a relatable statement or question\n- Tell a mini-story or share a personal experience angle\n- Include specific tips or takeaways\n- Encourage sharing and tagging friends\n- Keep it warm and approachable" : ""}
${input.platform === "youtube" ? "- Write an SEO-optimized video description\n- Include a compelling title suggestion\n- Write a detailed description with timestamps\n- Include key talking points and takeaways\n- Add relevant tags and keywords\n- Include subscribe CTA" : ""}
${input.platform === "tiktok" ? "- Write a video script with a strong hook in the first 2 seconds\n- Keep it under 60 seconds of speaking time\n- Use casual, Gen-Z friendly language\n- Include trending format suggestions (e.g., 'Things nobody tells you about...')\n- Add 3-5 trending and relevant hashtags\n- Include a CTA (follow, comment, stitch)" : ""}
${input.platform === "reddit" ? "- Write authentic, community-first content\n- NO promotional language or marketing speak\n- Provide genuine value, detailed analysis, or personal experience\n- Be conversational and honest\n- Include discussion questions\n- NO hashtags (Reddit doesn't use them)\n- Suggest relevant subreddits" : ""}
${input.platform === "threads" ? "- Keep it concise (under 500 chars)\n- Conversational and casual tone\n- Share a quick insight or hot take\n- Drive replies with a question" : ""}
${!input.platform ? "- Create versatile content optimized for social media engagement" : ""}

${input.brandContext ? `BRAND CONTEXT — Personalize content for this brand:\n${input.brandContext}\nReflect the brand's identity and speak to their target audience naturally.` : ""}

Return your response as JSON:
{
  "title": "A compelling, specific title (not generic)",
  "content": "The full, ready-to-post content body",
  "hashtags": ["relevant", "specific", "hashtags"],
  "callToAction": "A specific call to action"
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Create expert-level ${platformName} content about: ${input.topic}\n\nRemember: Do NOT just rephrase the topic. Research it, provide real insights, specific tips, data points, and create content that would genuinely perform well on ${platformName}. The content should be so good that a professional social media manager would be proud to post it.` },
          ],
          response_format: { type: "json_object" },
        });

        const messageContent = response.choices[0].message.content;
        const content = JSON.parse(typeof messageContent === 'string' ? messageContent : "{}");
        return content;
      }),

    // Generate content for ALL platforms in one call (faster)
    generateAllPlatforms: protectedProcedure
      .input(z.object({
        topic: z.string().min(1),
        brandContext: z.string().optional(),
        platforms: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const targetPlatforms = input.platforms || ["instagram", "twitter", "linkedin", "facebook", "tiktok", "youtube", "reddit", "threads", "bluesky"];

        const systemPrompt = `You are an elite social media content strategist and copywriter. You create REAL, SUBSTANTIVE, READY-TO-POST content that provides genuine value.

Your task: Given a topic, create UNIQUE, platform-optimized content for each of these platforms: ${targetPlatforms.join(", ")}.

CRITICAL RULES:
1. DO NOT just rephrase the topic differently for each platform. Each platform version must have UNIQUE content, angles, and approaches.
2. Include REAL insights — specific tips, strategies, data points, frameworks, or expert perspectives.
3. Write as a subject matter expert who has deeply researched this topic.
4. Each platform's content must match that platform's native style, format, and best practices.
5. Content must be READY TO POST — no placeholders, no "[insert here]" markers.

PLATFORM STYLE GUIDE:
- instagram: Visual caption with hook line, 2-3 actionable tips, emojis, 15-20 hashtags, CTA to save/share
- twitter: Under 280 chars, bold statement, punchy and quotable, 1-2 hashtags
- linkedin: Professional thought-leadership, data/examples, short paragraphs, question at end, 3-5 hashtags
- facebook: Conversational, relatable story angle, community-focused, encourage sharing
- tiktok: Video script with 2-second hook, casual Gen-Z language, under 60s, trending hashtags
- youtube: SEO title + detailed description with timestamps, tags, subscribe CTA
- reddit: Authentic discussion post, no marketing speak, genuine value, NO hashtags, suggest subreddits
- threads: Short hot take under 500 chars, conversational, drive replies
- bluesky: Concise insight under 300 chars, community-oriented

${input.brandContext ? `BRAND CONTEXT:\n${input.brandContext}\nPersonalize all content to reflect this brand naturally.` : ""}

Return JSON with this EXACT structure:
{
  "platforms": {
    "instagram": { "content": "full post text", "hashtags": ["tag1", "tag2"] },
    "twitter": { "content": "full tweet text", "hashtags": ["tag1"] },
    "linkedin": { "content": "full post text", "hashtags": ["tag1", "tag2"] },
    "facebook": { "content": "full post text", "hashtags": [] },
    "tiktok": { "content": "video script text", "hashtags": ["tag1", "tag2"] },
    "youtube": { "content": "title + description", "hashtags": ["tag1"] },
    "reddit": { "content": "discussion post text", "hashtags": [] },
    "threads": { "content": "short post text", "hashtags": [] },
    "bluesky": { "content": "short post text", "hashtags": [] }
  }
}

Only include platforms that were requested. Each platform MUST have unique content — not the same text reformatted.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Create expert-level social media content about: ${input.topic}\n\nGenerate unique, substantive, ready-to-post content for each platform. Each version should take a different angle or approach to the topic. Include real insights, specific tips, data points, and actionable advice. The content should be so good that a professional social media manager would post it immediately.` },
          ],
          response_format: { type: "json_object" },
        });

        const messageContent = response.choices[0].message.content;
        const parsed = JSON.parse(typeof messageContent === 'string' ? messageContent : "{}");
        return parsed;
      }),

    improveContent: protectedProcedure
      .input(z.object({
        content: z.string().min(1),
        instruction: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            { 
              role: "system", 
              content: `You are an expert content editor. Improve the given content based on the user's instructions.
Return your response as JSON:
{
  "improvedContent": "The improved content",
  "changes": ["List of changes made"]
}` 
            },
            { 
              role: "user", 
              content: `Original content:\n${input.content}\n\nInstruction: ${input.instruction}` 
            },
          ],
          response_format: { type: "json_object" },
        });

        const resultContent = response.choices[0].message.content;
        const result = JSON.parse(typeof resultContent === 'string' ? resultContent : "{}");
        return result;
      }),

    suggestHashtags: protectedProcedure
      .input(z.object({
        content: z.string().min(1),
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube", "tiktok", "reddit"]).optional(),
        count: z.number().min(1).max(30).optional(),
      }))
      .mutation(async ({ input }) => {
        const platformContext: Record<string, string> = {
          instagram: "Instagram hashtags should be popular and discoverable. Include a mix of broad and niche tags. Maximum 30 hashtags.",
          twitter: "Twitter hashtags should be trending and concise. Use 2-5 hashtags max for best engagement.",
          linkedin: "LinkedIn hashtags should be professional and industry-specific. Use 3-5 hashtags.",
          facebook: "Facebook hashtags should be minimal and highly relevant. Use 1-3 hashtags.",
          youtube: "YouTube tags should be searchable keywords and phrases. Include variations.",
          tiktok: "TikTok hashtags should be trending and discoverable. Use 3-5 hashtags including trending challenges.",
          reddit: "Reddit does not use hashtags. Focus on relevant keywords for post titles and subreddit selection instead.",
        };

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a social media hashtag expert. Analyze the content and suggest the most effective hashtags.
${input.platform ? platformContext[input.platform] : "Suggest versatile hashtags that work across platforms."}

Return your response as JSON:
{
  "hashtags": ["hashtag1", "hashtag2", ...],
  "trending": ["trending1", "trending2"],
  "niche": ["niche1", "niche2"],
  "tips": "Brief tips for using these hashtags"
}`
            },
            {
              role: "user",
              content: `Suggest ${input.count || 10} hashtags for this content:\n${input.content}`
            },
          ],
          response_format: { type: "json_object" },
        });

        const resultContent = response.choices[0].message.content;
        return JSON.parse(typeof resultContent === 'string' ? resultContent : "{}");
      }),

    suggestSubreddits: protectedProcedure
      .input(z.object({
        topic: z.string().min(1),
        content: z.string().optional(),
        targetAudience: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a Reddit expert who knows all the popular and niche subreddits. Based on the topic and content provided, suggest relevant subreddits where this content would be well-received.

Consider:
- Subreddit rules and culture
- Audience alignment
- Content type appropriateness
- Subreddit activity level
- Avoid overly promotional subreddits

Return your response as JSON:
{
  "subreddits": [
    {
      "name": "subredditname",
      "subscribers": "estimated subscriber count",
      "relevance": "high/medium/low",
      "reason": "Why this subreddit is a good fit",
      "tips": "Specific posting tips for this subreddit"
    }
  ],
  "generalTips": "General Reddit posting advice for this content"
}`
            },
            {
              role: "user",
              content: `Topic: ${input.topic}\n${input.content ? `Content: ${input.content}` : ""}\n${input.targetAudience ? `Target Audience: ${input.targetAudience}` : ""}`
            },
          ],
          response_format: { type: "json_object" },
        });

        const resultContent = response.choices[0].message.content;
        return JSON.parse(typeof resultContent === 'string' ? resultContent : "{}");
      }),

    generatePlatformPreview: protectedProcedure
      .input(z.object({
        content: z.string().min(1),
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube"]),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const platformLimits = {
          instagram: { charLimit: 2200, hashtagLimit: 30, hasImage: true },
          twitter: { charLimit: 280, hashtagLimit: 5, hasImage: true },
          linkedin: { charLimit: 3000, hashtagLimit: 5, hasImage: true },
          facebook: { charLimit: 63206, hashtagLimit: 3, hasImage: true },
          youtube: { charLimit: 5000, hashtagLimit: 15, hasImage: false },
        };

        const limits = platformLimits[input.platform];
        const contentLength = input.content.length;
        const hashtagMatches = input.content.match(/#\w+/g) || [];
        const hashtagCount = hashtagMatches.length;

        // Truncate content if needed
        let truncatedContent = input.content;
        let isTruncated = false;
        if (contentLength > limits.charLimit) {
          truncatedContent = input.content.substring(0, limits.charLimit - 3) + "...";
          isTruncated = true;
        }

        return {
          platform: input.platform,
          preview: {
            content: truncatedContent,
            imageUrl: input.imageUrl || null,
            characterCount: contentLength,
            characterLimit: limits.charLimit,
            hashtagCount,
            hashtagLimit: limits.hashtagLimit,
            isTruncated,
            isOverHashtagLimit: hashtagCount > limits.hashtagLimit,
            warnings: [
              ...(isTruncated ? [`Content exceeds ${limits.charLimit} character limit`] : []),
              ...(hashtagCount > limits.hashtagLimit ? [`Too many hashtags (${hashtagCount}/${limits.hashtagLimit})`] : []),
            ],
          },
          platformTips: {
            instagram: "Square images (1:1) perform best. Use all 30 hashtags in first comment for cleaner look.",
            twitter: "Keep it concise. Add an image to increase engagement by 150%.",
            linkedin: "Professional tone works best. Tag relevant people and companies.",
            facebook: "Questions and polls drive engagement. Native video gets 10x more reach.",
            youtube: "First 100 characters of description are most important for SEO.",
          }[input.platform],
        };
      }),

    // Generate image for social media post using Gemini API (primary) or built-in generator (fallback)
    // Using publicProcedure so guest users can also generate images
    generatePostImage: publicProcedure
      .input(z.object({
        topic: z.string().min(1),
        platform: z.string().optional(),
        style: z.enum(["photorealistic", "illustration", "minimal", "bold", "artistic", "infographic"]).optional(),
        brandColors: z.array(z.string()).optional(),
        brandName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Build a detailed image prompt based on the topic and platform
        const styleGuide: Record<string, string> = {
          photorealistic: "photorealistic, high-quality photography style, natural lighting, professional composition",
          illustration: "modern digital illustration, clean lines, vibrant colors, flat design",
          minimal: "minimalist design, clean whitespace, simple shapes, elegant typography",
          bold: "bold graphic design, strong contrast, eye-catching colors, impactful visual",
          artistic: "artistic and creative, painterly style, unique textures, expressive composition",
          infographic: "clean infographic style, data visualization, organized layout, professional",
        };

        const platformGuide: Record<string, string> = {
          instagram: "square format (1:1), visually stunning, Instagram-worthy, scroll-stopping",
          twitter: "landscape format (16:9), clean and shareable, works as a tweet image",
          linkedin: "professional and polished, landscape format, corporate-appropriate",
          facebook: "engaging and shareable, landscape format, community-friendly",
          tiktok: "vertical format (9:16), trendy and eye-catching, Gen-Z aesthetic",
          youtube: "landscape thumbnail format (16:9), high contrast, readable text overlay",
        };

        const style = styleGuide[input.style || "photorealistic"];
        const platformHint = input.platform ? platformGuide[input.platform] || "" : "";
        const brandHint = input.brandName ? `Subtly incorporate the brand identity of "${input.brandName}".` : "";
        const colorHint = input.brandColors?.length ? `Use these brand colors as accents: ${input.brandColors.join(", ")}.` : "";

        const imagePrompt = `Create a professional social media image about: ${input.topic}. Style: ${style}. ${platformHint} ${brandHint} ${colorHint} The image should be visually compelling, professional, and ready to post on social media. No text overlays unless specifically relevant. High quality, well-composed.`;

        // Try Gemini API first (nano banana / imagen)
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
          try {
            const geminiResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{
                    parts: [{ text: imagePrompt }],
                  }],
                  generationConfig: {
                    responseModalities: ["TEXT", "IMAGE"],
                  },
                }),
              }
            );

            if (geminiResponse.ok) {
              const geminiData = await geminiResponse.json();
              const candidates = geminiData?.candidates || [];
              for (const candidate of candidates) {
                const parts = candidate?.content?.parts || [];
                for (const part of parts) {
                  if (part.inlineData?.mimeType?.startsWith("image/")) {
                    // Upload the base64 image to S3
                    const buffer = Buffer.from(part.inlineData.data, "base64");
                    const ext = part.inlineData.mimeType === "image/png" ? "png" : "jpg";
                    const randomSuffix = Math.random().toString(36).substring(2, 10);
                    const { url } = await storagePut(
                      `post-images/gemini-${Date.now()}-${randomSuffix}.${ext}`,
                      buffer,
                      part.inlineData.mimeType
                    );
                    return { url, source: "gemini" };
                  }
                }
              }
              // Gemini returned but no image in response, fall through to built-in
              console.log("Gemini returned no image, falling back to built-in generator");
            } else {
              console.log(`Gemini API error: ${geminiResponse.status}, falling back to built-in generator`);
            }
          } catch (geminiError) {
            console.log("Gemini API failed, falling back to built-in generator:", geminiError);
          }
        }

        // Fallback to built-in image generator
        try {
          const result = await generateImage({ prompt: imagePrompt });
          return { url: result.url, source: "built-in" };
        } catch (builtInError) {
          throw new Error("Image generation failed. Please try again.");
        }
      }),

    generateStrategy: protectedProcedure
      .input(z.object({
        businessType: z.string().min(1),
        targetAudience: z.string().min(1),
        goals: z.string().min(1),
        currentChallenges: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            { 
              role: "system", 
              content: `You are an expert marketing strategist. Create a comprehensive marketing strategy.
Return your response as JSON:
{
  "title": "Strategy title",
  "summary": "Executive summary",
  "goals": "Specific, measurable goals",
  "contentPillars": "3-4 content pillars/themes",
  "targetAudience": "Detailed audience description",
  "recommendations": "Actionable recommendations",
  "timeline": "12-month implementation timeline"
}` 
            },
            { 
              role: "user", 
              content: `Create a marketing strategy for:
Business Type: ${input.businessType}
Target Audience: ${input.targetAudience}
Goals: ${input.goals}
${input.currentChallenges ? `Current Challenges: ${input.currentChallenges}` : ""}` 
            },
          ],
          response_format: { type: "json_object" },
        });

        const strategyContent = response.choices[0].message.content;
        const strategy = JSON.parse(typeof strategyContent === 'string' ? strategyContent : "{}");
        return strategy;
      }),
  }),

  // Social Media Integration
  social: router({
    // Get OAuth authorization URL
    getAuthUrl: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube"]),
        redirectUri: z.string(),
      }))
      .query(({ input }) => {
        // In production, use real client IDs from environment variables
        const clientId = process.env[`${input.platform.toUpperCase()}_CLIENT_ID`] || "demo_client_id";
        const state = `${input.platform}_${Date.now()}`;
        const authUrl = socialIntegration.getAuthorizationUrl(
          input.platform,
          clientId,
          input.redirectUri,
          state
        );
        return { authUrl, state };
      }),

    // Exchange auth code for tokens
    exchangeToken: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube"]),
        code: z.string(),
        redirectUri: z.string(),
      }))
      .mutation(async ({ input }) => {
        const clientId = process.env[`${input.platform.toUpperCase()}_CLIENT_ID`] || "demo_client_id";
        const clientSecret = process.env[`${input.platform.toUpperCase()}_CLIENT_SECRET`] || "demo_client_secret";
        
        const credentials = await socialIntegration.exchangeCodeForToken(
          input.platform,
          input.code,
          clientId,
          clientSecret,
          input.redirectUri
        );
        return credentials;
      }),

    // Publish post to platform
    publishPost: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube"]),
        accessToken: z.string(),
        content: z.string(),
        imageUrl: z.string().optional(),
        hashtags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await socialIntegration.publishPost(
          input.platform,
          { accessToken: input.accessToken },
          {
            content: input.content,
            imageUrl: input.imageUrl,
            hashtags: input.hashtags,
          }
        );
        return result;
      }),

    // Fetch analytics from platform
    fetchAnalytics: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube"]),
        accessToken: z.string(),
        accountId: z.string(),
      }))
      .query(async ({ input }) => {
        const analytics = await socialIntegration.fetchAnalytics(
          input.platform,
          { accessToken: input.accessToken },
          input.accountId
        );
        return analytics;
      }),

    // Fetch messages from platform
    fetchMessages: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube"]),
        accessToken: z.string(),
        accountId: z.string(),
      }))
      .query(async ({ input }) => {
        const messages = await socialIntegration.fetchMessages(
          input.platform,
          { accessToken: input.accessToken },
          input.accountId
        );
        return messages;
      }),

    // Validate platform credentials
    validateCredentials: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube"]),
        accessToken: z.string(),
      }))
      .query(async ({ input }) => {
        const result = await socialIntegration.validateCredentials(
          input.platform,
          { accessToken: input.accessToken }
        );
        return result;
      }),

    // Get platform guidelines
    getGuidelines: publicProcedure
      .input(z.object({
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube"]),
      }))
      .query(({ input }) => {
        return socialIntegration.getPlatformGuidelines(input.platform);
      }),
  }),

  // Subscription Management
  subscription: router({
    // Get all available plans
    plans: publicProcedure.query(async () => {
      const plans = await db.getAllPlans();
      if (plans.length === 0) {
        // Initialize plans if not exists
        await db.initializeSubscriptionPlans();
        return db.getAllPlans();
      }
      return plans;
    }),

    // Get current user's subscription
    current: protectedProcedure.query(async ({ ctx }) => {
      const subData = await db.getUserSubscriptionWithPlan(ctx.user.id);
      return subData;
    }),

    // Check if user can post (based on limits)
    canPost: protectedProcedure.query(async ({ ctx }) => {
      return db.canUserPost(ctx.user.id);
    }),

    // Check if user can use platforms
    canUsePlatforms: protectedProcedure
      .input(z.object({ platformCount: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.canUserUsePlatform(ctx.user.id, input.platformCount);
      }),

    // Check if user has a specific feature
    hasFeature: protectedProcedure
      .input(z.object({ feature: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.hasFeature(ctx.user.id, input.feature);
      }),

    // Create checkout session for subscription
    createCheckout: protectedProcedure
      .input(z.object({
        planName: z.enum(["basic", "pro", "vibe"]),
        billingCycle: z.enum(["monthly", "yearly"]),
        successUrl: z.string(),
        cancelUrl: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!stripeService.stripe) {
          throw new Error("Stripe not configured");
        }

        const plan = await db.getPlanByName(input.planName);
        if (!plan) {
          throw new Error("Plan not found");
        }

        const priceId = input.billingCycle === "monthly" 
          ? plan.stripePriceIdMonthly 
          : plan.stripePriceIdYearly;

        if (!priceId) {
          throw new Error("Price not configured for this plan");
        }

        // Get or create Stripe customer
        const customer = await stripeService.getOrCreateCustomer({
          email: ctx.user.email || `user-${ctx.user.id}@postpal.app`,
          name: ctx.user.name || undefined,
          userId: ctx.user.id,
        });

        // Create checkout session
        const session = await stripeService.createCheckoutSession({
          customerId: customer.id,
          priceId,
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          metadata: {
            userId: ctx.user.id.toString(),
            planName: input.planName,
            billingCycle: input.billingCycle,
          },
        });

        return { checkoutUrl: session.url };
      }),

    // Create customer portal session
    createPortal: protectedProcedure
      .input(z.object({ returnUrl: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!stripeService.stripe) {
          throw new Error("Stripe not configured");
        }

        const subscription = await db.getUserSubscription(ctx.user.id);
        if (!subscription?.stripeCustomerId) {
          throw new Error("No active subscription found");
        }

        const session = await stripeService.createPortalSession(
          subscription.stripeCustomerId,
          input.returnUrl
        );

        return { portalUrl: session.url };
      }),

    // Cancel subscription
    cancel: protectedProcedure
      .input(z.object({ immediately: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        const subscription = await db.getUserSubscription(ctx.user.id);
        if (!subscription?.stripeSubscriptionId) {
          throw new Error("No active subscription found");
        }

        await stripeService.cancelSubscription(
          subscription.stripeSubscriptionId,
          input.immediately
        );

        await db.updateUserSubscription(ctx.user.id, {
          cancelAtPeriodEnd: !input.immediately,
          canceledAt: input.immediately ? new Date() : undefined,
          status: input.immediately ? "canceled" : "active",
        });

        return { success: true };
      }),

    // Resume canceled subscription
    resume: protectedProcedure.mutation(async ({ ctx }) => {
      const subscription = await db.getUserSubscription(ctx.user.id);
      if (!subscription?.stripeSubscriptionId) {
        throw new Error("No subscription found");
      }

      await stripeService.resumeSubscription(subscription.stripeSubscriptionId);

      await db.updateUserSubscription(ctx.user.id, {
        cancelAtPeriodEnd: false,
        canceledAt: null,
      });

      return { success: true };
    }),

    // Get payment history
    paymentHistory: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserPaymentHistory(ctx.user.id);
    }),

    // Initialize Stripe products (admin only)
    initializeStripeProducts: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Admin access required");
      }

      const products = await stripeService.createStripeProducts();
      
      // Update plans with Stripe IDs
      for (const [tierName, data] of Object.entries(products)) {
        if (tierName === "free") continue;
        
        await db.updatePlan(
          (await db.getPlanByName(tierName))!.id,
          {
            stripeProductId: data.productId,
            stripePriceIdMonthly: data.monthlyPriceId,
            stripePriceIdYearly: data.yearlyPriceId,
          }
        );
      }

      return { success: true, products };
    }),
  }),
});

export type AppRouter = typeof appRouter;
