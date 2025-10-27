import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { domains, user, userDomains } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/client";
import { inngest } from "@/lib/inngest/client";
import {
  canSendNotification,
  getOrCreatePreferences,
  logNotification,
} from "@/lib/notifications/helpers";
import { getCertificates } from "@/server/services/certificates";
import { getRegistration } from "@/server/services/registration";

export const checkExpirations = inngest.createFunction(
  { id: "check-expirations" },
  { cron: "0 9 * * *" }, // Daily at 9am UTC
  async ({ step, logger }) => {
    // Step 1: Get all verified user domains
    const userDomainsList = await step.run("fetch-user-domains", async () => {
      const results = await db
        .select({
          userDomain: userDomains,
          domain: domains,
          user: user,
        })
        .from(userDomains)
        .innerJoin(domains, eq(domains.id, userDomains.domainId))
        .innerJoin(user, eq(user.id, userDomains.userId))
        .where(sql`${userDomains.verifiedAt} IS NOT NULL`);

      return results;
    });

    logger.info("Checking expirations", { count: userDomainsList.length });

    // Step 2: Check registration expirations
    const registrationResults = await step.run(
      "check-registration-expirations",
      async () => {
        let checked = 0;
        let sent = 0;

        for (const ud of userDomainsList) {
          try {
            const registration = await getRegistration(ud.domain.name);
            if (!registration?.expirationDate) continue;

            checked++;

            const expiresAt = new Date(registration.expirationDate);
            const daysUntilExpiry = Math.floor(
              (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            );

            const prefs = await getOrCreatePreferences(ud.userDomain.userId);
            if (!prefs.emailEnabled || !prefs.notifyRegistrationExpiring)
              continue;

            // Check if we should send notification for this threshold
            for (const threshold of prefs.registrationExpiryDays) {
              if (daysUntilExpiry === threshold) {
                const canSend = await canSendNotification(
                  ud.userDomain.userId,
                  ud.userDomain.domainId,
                  `registration_expiring_${threshold}`,
                );

                if (canSend) {
                  // Send email
                  const result = await sendEmail({
                    to: ud.user.email,
                    subject: `Domain ${ud.domain.name} Expiring in ${threshold} ${threshold === 1 ? "Day" : "Days"}`,
                    template: "registration-expiring",
                    data: {
                      domain: ud.domain.name,
                      expiresAt,
                      verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/domains/${ud.domain.id}`,
                    },
                  });

                  // Log notification
                  if ("id" in result) {
                    await logNotification(
                      ud.userDomain.userId,
                      ud.userDomain.domainId,
                      `registration_expiring_${threshold}`,
                      result.id,
                      { daysUntilExpiry, threshold },
                    );
                    sent++;
                  }
                }
              }
            }
          } catch (err) {
            logger.error("Failed to check registration expiration", {
              domain: ud.domain.name,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        return { checked, sent };
      },
    );

    // Step 3: Check certificate expirations
    const certificateResults = await step.run(
      "check-certificate-expirations",
      async () => {
        let checked = 0;
        let sent = 0;

        for (const ud of userDomainsList) {
          try {
            const certs = await getCertificates(ud.domain.name);
            if (!certs?.[0]?.validTo) continue;

            checked++;

            const validTo = new Date(certs[0].validTo);
            const daysUntilExpiry = Math.floor(
              (validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            );

            const prefs = await getOrCreatePreferences(ud.userDomain.userId);
            if (!prefs.emailEnabled || !prefs.notifyCertificateExpiring)
              continue;

            for (const threshold of prefs.certificateExpiryDays) {
              if (daysUntilExpiry === threshold) {
                const canSend = await canSendNotification(
                  ud.userDomain.userId,
                  ud.userDomain.domainId,
                  `certificate_expiring_${threshold}`,
                );

                if (canSend) {
                  // Send email
                  const result = await sendEmail({
                    to: ud.user.email,
                    subject: `SSL Certificate for ${ud.domain.name} Expiring in ${threshold} ${threshold === 1 ? "Day" : "Days"}`,
                    template: "certificate-expiring",
                    data: {
                      domain: ud.domain.name,
                      expiresAt: validTo,
                      daysRemaining: daysUntilExpiry,
                      renewUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/domains/${ud.domain.id}`,
                    },
                  });

                  // Log notification
                  if ("id" in result) {
                    await logNotification(
                      ud.userDomain.userId,
                      ud.userDomain.domainId,
                      `certificate_expiring_${threshold}`,
                      result.id,
                      { daysUntilExpiry, threshold },
                    );
                    sent++;
                  }
                }
              }
            }
          } catch (err) {
            logger.error("Failed to check certificate expiration", {
              domain: ud.domain.name,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        return { checked, sent };
      },
    );

    logger.info("Expiration check complete", {
      totalDomains: userDomainsList.length,
      registrations: registrationResults,
      certificates: certificateResults,
    });

    return {
      checked: userDomainsList.length,
      registrationNotifications: registrationResults.sent,
      certificateNotifications: certificateResults.sent,
      completedAt: Date.now(),
    };
  },
);
