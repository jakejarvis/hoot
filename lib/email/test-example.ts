/**
 * Example usage of the email service
 * This file can be deleted after testing
 *
 * To test locally:
 * 1. Set RESEND_API_KEY and RESEND_FROM_EMAIL in .env.local
 * 2. Run: tsx lib/email/test-example.ts
 */

import { sendEmail } from "./client";

async function testEmail() {
  console.log("Testing email service...\n");

  const result = await sendEmail({
    to: "test@example.com",
    subject: "Domain Registration Expiring Soon",
    template: "registration-expiring",
    data: {
      domain: "example.com",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      verifyUrl: "https://domainstack.io/domains/verify?id=example",
    },
  });

  if ("error" in result) {
    console.error("❌ Email failed:", result.error);
    process.exit(1);
  }

  console.log("✅ Email sent successfully!");
  console.log("📧 Email ID:", result.id);
}

testEmail().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
