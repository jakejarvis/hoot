import "server-only";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notificationLog, notificationPreferences } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

const log = logger({ module: "notifications" });

export type NotificationPreferences =
  typeof notificationPreferences.$inferSelect;

/**
 * Get or create notification preferences for a user
 * Creates with defaults if not found
 */
export async function getOrCreatePreferences(
  userId: string,
): Promise<NotificationPreferences> {
  try {
    // Try to get existing preferences
    const existing = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });

    if (existing) {
      return existing;
    }

    // Create with defaults using INSERT ... ON CONFLICT DO NOTHING
    const inserted = await db
      .insert(notificationPreferences)
      .values({ userId })
      .onConflictDoNothing({ target: [notificationPreferences.userId] })
      .returning();

    if (inserted[0]) {
      log.info("Created notification preferences", { userId });
      return inserted[0];
    }

    // Race condition: another process created it, fetch again
    const created = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });

    if (!created) {
      throw new Error("Failed to create notification preferences");
    }

    return created;
  } catch (error) {
    log.error("Failed to get/create notification preferences", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Check if we can send a notification based on idempotency rules
 *
 * For expiration notifications: check if we've sent this specific threshold
 * For change notifications: check if we've sent within last 24 hours
 */
export async function canSendNotification(
  userId: string,
  domainId: string,
  notificationType: string,
): Promise<boolean> {
  try {
    const isExpirationNotification =
      notificationType.includes("_expiring_") ||
      notificationType.startsWith("registration_expiring") ||
      notificationType.startsWith("certificate_expiring");

    if (isExpirationNotification) {
      // For expiration notifications, check if we've sent this exact threshold
      // e.g., "registration_expiring_30" should only be sent once
      const existing = await db.query.notificationLog.findFirst({
        where: and(
          eq(notificationLog.userId, userId),
          eq(notificationLog.domainId, domainId),
          eq(notificationLog.notificationType, notificationType),
        ),
        orderBy: [desc(notificationLog.sentAt)],
      });

      // If we've already sent this threshold, don't send again
      return !existing;
    }

    // For change notifications, check if we've sent within last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentNotification = await db.query.notificationLog.findFirst({
      where: and(
        eq(notificationLog.userId, userId),
        eq(notificationLog.domainId, domainId),
        eq(notificationLog.notificationType, notificationType),
        gte(notificationLog.sentAt, oneDayAgo),
      ),
      orderBy: [desc(notificationLog.sentAt)],
    });

    // Can send if no recent notification found
    return !recentNotification;
  } catch (error) {
    log.error("Failed to check notification idempotency", {
      userId,
      domainId,
      notificationType,
      error: error instanceof Error ? error.message : String(error),
    });
    // On error, be conservative and don't send
    return false;
  }
}

/**
 * Log a sent notification
 */
export async function logNotification(
  userId: string,
  domainId: string,
  notificationType: string,
  emailId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.insert(notificationLog).values({
      userId,
      domainId,
      notificationType,
      emailId,
      metadata,
    });

    log.info("Logged notification", {
      userId,
      domainId,
      notificationType,
      emailId,
    });
  } catch (error) {
    log.error("Failed to log notification", {
      userId,
      domainId,
      notificationType,
      emailId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - logging failures shouldn't break the notification flow
  }
}
