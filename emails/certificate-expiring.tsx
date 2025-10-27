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

interface CertificateExpiringEmailProps {
  domain: string;
  expiresAt: Date;
  daysRemaining: number;
  renewUrl: string;
}

export default function CertificateExpiringEmail({
  domain,
  expiresAt,
  daysRemaining,
  renewUrl,
}: CertificateExpiringEmailProps) {
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
              SSL Certificate Expiring Soon
            </Text>

            <Text
              style={{
                fontSize: "16px",
                color: "#4a5568",
                margin: "0 0 24px",
                lineHeight: "1.6",
              }}
            >
              The SSL certificate for{" "}
              <strong style={{ color: "#1a1a1a" }}>{domain}</strong> will expire
              in{" "}
              <strong style={{ color: "#1a1a1a" }}>
                {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
              </strong>{" "}
              on <strong style={{ color: "#1a1a1a" }}>{formattedDate}</strong>.
            </Text>

            <Text
              style={{
                fontSize: "16px",
                color: "#4a5568",
                margin: "0 0 32px",
                lineHeight: "1.6",
              }}
            >
              To avoid service disruptions and security warnings for your
              visitors, please renew your SSL certificate before it expires.
            </Text>

            <Button
              href={renewUrl}
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
              View Certificate Details
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
              <strong style={{ color: "#4a5568" }}>Why this matters:</strong>
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0 0 8px",
                lineHeight: "1.6",
              }}
            >
              • Browsers will show security warnings to visitors
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0 0 8px",
                lineHeight: "1.6",
              }}
            >
              • HTTPS connections will fail, affecting site availability
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0",
                lineHeight: "1.6",
              }}
            >
              • Search engines may penalize sites without valid certificates
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
              hesitate to contact our support team.
            </Text>

            <Text
              style={{
                fontSize: "13px",
                color: "#a0aec0",
                margin: "16px 0 0",
                lineHeight: "1.6",
              }}
            >
              This is an automated notification from DomainStack. You're
              receiving this because you're monitoring {domain}.
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
