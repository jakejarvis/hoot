import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/client";
import { logger } from "@/lib/logger";

const log = logger({ module: "auth" });

export const auth = betterAuth({
  appName: "DomainStack",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  // Custom cookie name
  advanced: {
    cookiePrefix: "domainstack",
  },

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true, // Set to true after configuring RESEND_API_KEY
    async sendResetPassword({ user, url }) {
      const result = await sendEmail({
        to: user.email,
        subject: "Reset Your Password - DomainStack",
        template: "reset-password",
        data: {
          userName: user.name || undefined,
          resetUrl: url,
        },
      });

      if ("error" in result) {
        log.error("Failed to send password reset email", {
          userId: user.id,
          email: user.email,
          error: result.error,
        });
      }
    },
  },

  // Email verification
  emailVerification: {
    async sendVerificationEmail({ user, url }) {
      const result = await sendEmail({
        to: user.email,
        subject: "Verify Your Email Address - DomainStack",
        template: "verify-email",
        data: {
          userName: user.name || undefined,
          verificationUrl: url,
        },
      });

      if ("error" in result) {
        log.error("Failed to send verification email", {
          userId: user.id,
          email: user.email,
          error: result.error,
        });
      }
    },
    sendOnSignUp: false, // Set to true after configuring RESEND_API_KEY
    autoSignInAfterVerification: true,
  },

  // Conditional OAuth providers (only enabled if env vars are present)
  socialProviders: {
    ...(process.env.GITHUB_CLIENT_ID &&
      process.env.GITHUB_CLIENT_SECRET && {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
      }),
    ...(process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET && {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          accessType: "offline",
        },
      }),
  },

  // Session configuration: 30 days expiry, refresh daily
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
