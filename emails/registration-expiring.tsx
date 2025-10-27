import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Section,
  Text,
} from "@react-email/components";

interface RegistrationExpiringEmailProps {
  domain: string;
  expiresAt: Date;
  verifyUrl: string;
}

export default function RegistrationExpiringEmail({
  domain,
  expiresAt,
  verifyUrl,
}: RegistrationExpiringEmailProps) {
  const formattedDate = expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Html lang="en">
      <Head />
      <Body
        style={{
          backgroundColor: "#f6f9fc",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            margin: "40px auto",
            padding: "40px",
            maxWidth: "600px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Section>
            <Text
              style={{
                fontSize: "24px",
                fontWeight: "600",
                color: "#1a1a1a",
                margin: "0 0 16px",
                lineHeight: "1.4",
              }}
            >
              Domain Registration Expiring Soon
            </Text>

            <Text
              style={{
                fontSize: "16px",
                color: "#4a5568",
                margin: "0 0 24px",
                lineHeight: "1.6",
              }}
            >
              Your domain <strong style={{ color: "#1a1a1a" }}>{domain}</strong>{" "}
              registration is set to expire on{" "}
              <strong style={{ color: "#1a1a1a" }}>{formattedDate}</strong>.
            </Text>

            <Text
              style={{
                fontSize: "16px",
                color: "#4a5568",
                margin: "0 0 32px",
                lineHeight: "1.6",
              }}
            >
              To ensure uninterrupted service and maintain ownership of your
              domain, please verify and renew your registration before the
              expiration date.
            </Text>

            <Button
              href={verifyUrl}
              style={{
                backgroundColor: "#5469d4",
                color: "#ffffff",
                padding: "14px 28px",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "16px",
                display: "inline-block",
                textAlign: "center",
              }}
            >
              Verify &amp; Manage Domain
            </Button>
          </Section>

          <Hr
            style={{
              borderColor: "#e2e8f0",
              margin: "32px 0",
            }}
          />

          <Section>
            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0 0 12px",
                lineHeight: "1.6",
              }}
            >
              <strong style={{ color: "#4a5568" }}>What happens next?</strong>
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0 0 8px",
                lineHeight: "1.6",
              }}
            >
              • If you verify and renew, your domain will remain active
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0 0 8px",
                lineHeight: "1.6",
              }}
            >
              • If you take no action, your domain will expire on{" "}
              {formattedDate}
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0",
                lineHeight: "1.6",
              }}
            >
              • After expiration, the domain may become available for others to
              register
            </Text>
          </Section>

          <Hr
            style={{
              borderColor: "#e2e8f0",
              margin: "32px 0",
            }}
          />

          <Section>
            <Text
              style={{
                fontSize: "13px",
                color: "#a0aec0",
                margin: "0",
                lineHeight: "1.6",
              }}
            >
              If you have any questions or need assistance, please don't
              hesitate to contact our support team. We're here to help!
            </Text>

            <Text
              style={{
                fontSize: "13px",
                color: "#a0aec0",
                margin: "16px 0 0",
                lineHeight: "1.6",
              }}
            >
              This is an automated notification from DomainStack. If you believe
              you received this email in error, please contact support.
            </Text>
          </Section>
        </Container>

        <Container style={{ maxWidth: "600px", margin: "0 auto" }}>
          <Text
            style={{
              fontSize: "12px",
              color: "#a0aec0",
              textAlign: "center",
              margin: "24px 0",
              lineHeight: "1.6",
            }}
          >
            © {new Date().getFullYear()} DomainStack. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
