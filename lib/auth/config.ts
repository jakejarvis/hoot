import { createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/client";
import { logger } from "@/lib/logger";

const log = logger({ module: "auth" });

/**
 * Redact email for logging by computing a stable hash
 * Returns a hash that can be used for debugging without exposing PII
 * Format: domain@hash (e.g., example.com@a3b2c1d4...)
 */
function redactEmail(email: string): string {
  const [, domain] = email.split("@");
  const hash = createHash("sha256").update(email).digest("hex").slice(0, 8);
  return `${domain || "unknown"}@${hash}`;
}

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

  // Plugins
  plugins: [
    magicLink({
      // Magic link expires in 5 minutes (default: 300 seconds)
      expiresIn: 300,
      // Disable sign up via magic link (optional, default: false)
      disableSignUp: false,
      // Send magic link email
      async sendMagicLink({ email, url }) {
        // Try to get user name from existing user
        const existingUser = await db.query.user.findFirst({
          where: (users, { eq }) => eq(users.email, email),
          columns: { name: true },
        });

        const result = await sendEmail({
          to: email,
          subject: "Sign In to DomainStack",
          template: "magic-link",
          data: {
            userName: existingUser?.name || undefined,
            magicLinkUrl: url,
          },
        });

        if ("error" in result) {
          log.error("Failed to send magic link email", {
            redactedEmail: redactEmail(email),
            error: result.error,
          });
          throw new Error("Failed to send magic link email");
        }

        log.info("Magic link email sent", {
          redactedEmail: redactEmail(email),
          emailId: result.id,
        });
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
