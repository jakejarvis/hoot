import "server-only";
import { render } from "@react-email/components";
import { Resend } from "resend";
import { logger } from "@/lib/logger";

const log = logger({ module: "email" });

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email templates mapping
type EmailTemplate =
  | "registration-expiring"
  | "reset-password"
  | "verify-email"
  | "magic-link";

interface EmailTemplateData {
  "registration-expiring": {
    domain: string;
    expiresAt: Date;
    verifyUrl: string;
  };
  "reset-password": {
    userName?: string;
    resetUrl: string;
  };
  "verify-email": {
    userName?: string;
    verificationUrl: string;
  };
  "magic-link": {
    userName?: string;
    magicLinkUrl: string;
  };
}

/**
 * Dynamically import and render an email template
 */
async function renderEmailTemplate<T extends EmailTemplate>(
  template: T,
  data: EmailTemplateData[T],
): Promise<string> {
  try {
    // Dynamic import of the template component
    const templateModule = await import(`@/emails/${template}.tsx`);
    const TemplateComponent = templateModule.default;

    // Render the React component to HTML
    const html = await render(TemplateComponent(data));
    return html;
  } catch (error) {
    log.error("Failed to render email template", {
      template,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(`Failed to render email template: ${template}`);
  }
}

interface SendEmailOptions<T extends EmailTemplate> {
  to: string | string[];
  subject: string;
  template: T;
  data: EmailTemplateData[T];
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

/**
 * Send an email using Resend with a React Email template
 */
export async function sendEmail<T extends EmailTemplate>({
  to,
  subject,
  template,
  data,
  replyTo,
  cc,
  bcc,
}: SendEmailOptions<T>): Promise<{ id: string } | { error: string }> {
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    log.error("RESEND_FROM_EMAIL environment variable not set");
    return { error: "Email configuration missing" };
  }

  if (!process.env.RESEND_API_KEY) {
    log.error("RESEND_API_KEY environment variable not set");
    return { error: "Email configuration missing" };
  }

  try {
    // Render the email template
    const html = await renderEmailTemplate(template, data);

    log.debug("Sending email", {
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      template,
    });

    // Send email via Resend
    const { data: resendData, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      replyTo,
      cc,
      bcc,
    });

    if (error) {
      log.error("Failed to send email", {
        error: error.message,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
      });
      return { error: error.message };
    }

    log.info("Email sent successfully", {
      id: resendData?.id,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
    });

    return { id: resendData?.id || "unknown" };
  } catch (error) {
    log.error("Unexpected error sending email", {
      error: error instanceof Error ? error.message : String(error),
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
    });
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Export resend client for advanced usage
export { resend };
