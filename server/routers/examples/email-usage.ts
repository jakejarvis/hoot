/**
 * Example tRPC procedures showing email service usage
 *
 * This file demonstrates various patterns for sending emails
 * in tRPC procedures, Inngest functions, and API routes.
 */

import { z } from "zod";
import { sendEmail } from "@/lib/email/client";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const emailExamplesRouter = createTRPCRouter({
  /**
   * Example 1: Send domain expiration notification
   * Use case: Triggered by Inngest cron job or user action
   */
  sendExpirationNotification: protectedProcedure
    .input(
      z.object({
        domain: z.string(),
        expiresAt: z.coerce.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await sendEmail({
        to: ctx.user.email,
        subject: `Domain ${input.domain} Expiring Soon`,
        template: "registration-expiring",
        data: {
          domain: input.domain,
          expiresAt: input.expiresAt,
          verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/domains/verify?domain=${encodeURIComponent(input.domain)}`,
        },
      });

      if ("error" in result) {
        throw new Error(`Failed to send email: ${result.error}`);
      }

      return {
        success: true,
        emailId: result.id,
      };
    }),

  /**
   * Example 2: Send welcome email with custom verification
   * Use case: Custom onboarding flow
   */
  sendWelcomeEmail: protectedProcedure.mutation(async ({ ctx }) => {
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=...`;

    const result = await sendEmail({
      to: ctx.user.email,
      subject: "Welcome to DomainStack!",
      template: "verify-email",
      data: {
        userName: ctx.user.name || undefined,
        verificationUrl,
      },
    });

    if ("error" in result) {
      // Log but don't fail - email is nice-to-have
      ctx.log.error("Failed to send welcome email", {
        userId: ctx.user.id,
        error: result.error,
      });
      return { success: false, error: result.error };
    }

    return { success: true, emailId: result.id };
  }),

  /**
   * Example 3: Batch email notification
   * Use case: Send emails to multiple domains/users
   */
  sendBatchNotifications: protectedProcedure
    .input(
      z.object({
        domains: z.array(
          z.object({
            name: z.string(),
            expiresAt: z.coerce.date(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.allSettled(
        input.domains.map((domain) =>
          sendEmail({
            to: ctx.user.email,
            subject: `Domain ${domain.name} Expiring Soon`,
            template: "registration-expiring",
            data: {
              domain: domain.name,
              expiresAt: domain.expiresAt,
              verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/domains/verify?domain=${encodeURIComponent(domain.name)}`,
            },
          }),
        ),
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return {
        total: input.domains.length,
        successful,
        failed,
      };
    }),
});

/**
 * INNGEST FUNCTION EXAMPLE
 *
 * Use this pattern in server/inngest/functions/send-expiration-emails.ts:
 *
 * import { inngest } from "@/server/inngest/client";
 * import { sendEmail } from "@/lib/email/client";
 *
 * export const sendExpirationEmails = inngest.createFunction(
 *   { id: "send-expiration-emails" },
 *   { cron: "0 9 * * *" }, // Daily at 9am
 *   async ({ step }) => {
 *     const domains = await step.run("fetch-expiring-domains", async () => {
 *       // Query database for domains expiring in 30 days
 *       return [];
 *     });
 *
 *     await step.run("send-emails", async () => {
 *       const results = await Promise.allSettled(
 *         domains.map((domain) =>
 *           sendEmail({
 *             to: domain.userEmail,
 *             subject: `Domain ${domain.name} Expiring Soon`,
 *             template: "registration-expiring",
 *             data: {
 *               domain: domain.name,
 *               expiresAt: domain.expiresAt,
 *               verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/domains/verify`,
 *             },
 *           })
 *         )
 *       );
 *
 *       return {
 *         total: domains.length,
 *         successful: results.filter((r) => r.status === "fulfilled").length,
 *       };
 *     });
 *   }
 * );
 */

/**
 * API ROUTE EXAMPLE
 *
 * Use this pattern in app/api/webhooks/domain-alert/route.ts:
 *
 * import { NextResponse } from "next/server";
 * import { sendEmail } from "@/lib/email/client";
 *
 * export async function POST(request: Request) {
 *   const { domain, expiresAt, userEmail } = await request.json();
 *
 *   const result = await sendEmail({
 *     to: userEmail,
 *     subject: `Domain ${domain} Expiring Soon`,
 *     template: "registration-expiring",
 *     data: {
 *       domain,
 *       expiresAt: new Date(expiresAt),
 *       verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/domains/verify`,
 *     },
 *   });
 *
 *   if ("error" in result) {
 *     return NextResponse.json(
 *       { error: result.error },
 *       { status: 500 }
 *     );
 *   }
 *
 *   return NextResponse.json({ success: true, emailId: result.id });
 * }
 */
