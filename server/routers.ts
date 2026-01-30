import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";

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
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube", "email", "blog"]).optional(),
        scheduledAt: z.date().optional(),
        imageUrl: z.string().optional(),
        aiGenerated: z.boolean().optional(),
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
          status: "draft",
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
      }))
      .mutation(({ ctx, input }) => {
        return db.updatePost(input.id, ctx.user.id, {
          scheduledAt: input.scheduledAt,
          status: "scheduled",
        });
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

  // Dashboard
  dashboard: router({
    stats: protectedProcedure.query(({ ctx }) => {
      return db.getDashboardStats(ctx.user.id);
    }),
  }),

  // AI Content Generation
  ai: router({
    generateContent: protectedProcedure
      .input(z.object({
        contentType: z.enum(["social", "blog", "newsletter", "video"]),
        platform: z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube", "email", "blog"]).optional(),
        topic: z.string().min(1),
        tone: z.enum(["professional", "casual", "friendly", "authoritative", "humorous"]).optional(),
        keywords: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const platformInstructions = {
          instagram: "Create engaging Instagram content with relevant hashtags. Keep it visual and concise.",
          twitter: "Create a Twitter/X post or thread. Keep tweets under 280 characters. Use relevant hashtags.",
          linkedin: "Create professional LinkedIn content. Focus on industry insights and professional value.",
          facebook: "Create engaging Facebook content that encourages interaction and sharing.",
          youtube: "Create a video script with intro, main content, and call-to-action.",
          email: "Create an email newsletter with a compelling subject line and engaging body content.",
          blog: "Create a well-structured blog post with introduction, main points, and conclusion.",
        };

        const toneInstructions = {
          professional: "Use a professional and polished tone.",
          casual: "Use a casual and relaxed tone.",
          friendly: "Use a warm and friendly tone.",
          authoritative: "Use an authoritative and expert tone.",
          humorous: "Use a light-hearted and humorous tone where appropriate.",
        };

        const systemPrompt = `You are an expert marketing content creator. Generate high-quality ${input.contentType} content.
${input.platform ? platformInstructions[input.platform] : ""}
${input.tone ? toneInstructions[input.tone] : "Use a professional tone."}
${input.keywords?.length ? `Include these keywords naturally: ${input.keywords.join(", ")}` : ""}

Return your response as JSON with the following structure:
{
  "title": "A catchy title for the content",
  "content": "The main content body",
  "hashtags": ["relevant", "hashtags"],
  "callToAction": "A compelling call to action"
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Create ${input.contentType} content about: ${input.topic}` },
          ],
          response_format: { type: "json_object" },
        });

        const messageContent = response.choices[0].message.content;
        const content = JSON.parse(typeof messageContent === 'string' ? messageContent : "{}");
        return content;
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
});

export type AppRouter = typeof appRouter;
