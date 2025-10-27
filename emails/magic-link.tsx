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

interface MagicLinkEmailProps {
  userName?: string;
  magicLinkUrl: string;
}

export default function MagicLinkEmail({
  userName,
  magicLinkUrl,
}: MagicLinkEmailProps) {
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
              Sign In to DomainStack
            </Text>

            <Text
              style={{
                fontSize: "16px",
                color: "#4a5568",
                margin: "0 0 24px",
                lineHeight: "1.6",
              }}
            >
              {userName ? `Hi ${userName}, ` : "Hi, "}
              click the button below to sign in to your DomainStack account.
              This link will expire in 5 minutes for security reasons.
            </Text>

            <Button
              href={magicLinkUrl}
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
              Sign In to DomainStack
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
              <strong style={{ color: "#4a5568" }}>Security Tips:</strong>
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0 0 8px",
                lineHeight: "1.6",
              }}
            >
              • This link will only work once
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0 0 8px",
                lineHeight: "1.6",
              }}
            >
              • It expires in 5 minutes
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0",
                lineHeight: "1.6",
              }}
            >
              • If you didn't request this, you can safely ignore this email
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
              If you're having trouble clicking the button, copy and paste this
              URL into your browser: {magicLinkUrl}
            </Text>

            <Text
              style={{
                fontSize: "13px",
                color: "#a0aec0",
                margin: "16px 0 0",
                lineHeight: "1.6",
              }}
            >
              This is an automated message from DomainStack. Please do not reply
              to this email.
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
