import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import {
  domains,
  notificationLog,
  notificationPreferences,
} from "@/lib/db/schema";
import { NotificationPreferencesUpdate } from "@/lib/db/zod";
import { getOrCreatePreferences } from "@/lib/notifications/helpers";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const notificationsRouter = createTRPCRouter({
  /**
   * Get the current user's notification preferences
   * Creates with defaults if not exists
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await getOrCreatePreferences(ctx.user.id);
    return prefs;
  }),

  /**
   * Update the current user's notification preferences
   */
  updatePreferences: protectedProcedure
    .input(NotificationPreferencesUpdate.partial())
    .mutation(async ({ ctx, input }) => {
      // Update the preferences
      const updated = await db
        .update(notificationPreferences)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, ctx.user.id))
        .returning();

      if (!updated[0]) {
        // If update failed (preferences don't exist), create them
        const created = await db
          .insert(notificationPreferences)
          .values({
            userId: ctx.user.id,
            ...input,
          })
          .onConflictDoUpdate({
            target: [notificationPreferences.userId],
            set: {
              ...input,
              updatedAt: new Date(),
            },
          })
          .returning();

        return created[0];
      }

      return updated[0];
    }),

  /**
   * Get notification history for the current user
   * Optionally filtered by domain
   */
  getNotificationHistory: protectedProcedure
    .input(
      z.object({
        domainId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { domainId, limit, offset } = input;

      // Build the query
      const whereConditions = [eq(notificationLog.userId, ctx.user.id)];

      if (domainId) {
        whereConditions.push(eq(notificationLog.domainId, domainId));
      }

      // Get notification logs with domain information
      const logs = await db
        .select({
          id: notificationLog.id,
          domainId: notificationLog.domainId,
          domainName: domains.name,
          notificationType: notificationLog.notificationType,
          sentAt: notificationLog.sentAt,
          emailId: notificationLog.emailId,
          metadata: notificationLog.metadata,
        })
        .from(notificationLog)
        .innerJoin(domains, eq(domains.id, notificationLog.domainId))
        .where(and(...whereConditions))
        .orderBy(desc(notificationLog.sentAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notificationLog)
        .where(and(...whereConditions));

      const total = countResult[0]?.count || 0;

      return {
        logs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    }),
});
