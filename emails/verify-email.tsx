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

interface VerifyEmailProps {
  userName?: string;
  verificationUrl: string;
}

export default function VerifyEmailEmail({
  userName,
  verificationUrl,
}: VerifyEmailProps) {
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
              Verify Your Email Address
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
              thanks for signing up for DomainStack! We're excited to have you
              on board.
            </Text>

            <Text
              style={{
                fontSize: "16px",
                color: "#4a5568",
                margin: "0 0 32px",
                lineHeight: "1.6",
              }}
            >
              To complete your registration and start managing your domains,
              please verify your email address by clicking the button below.
            </Text>

            <Button
              href={verificationUrl}
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
              Verify Email Address
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
              <strong style={{ color: "#4a5568" }}>What's next?</strong>
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0 0 8px",
                lineHeight: "1.6",
              }}
            >
              • Monitor domain registrations and expirations
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0 0 8px",
                lineHeight: "1.6",
              }}
            >
              • Get detailed DNS, WHOIS, and TLS information
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0",
                lineHeight: "1.6",
              }}
            >
              • Receive alerts about important domain changes
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
              If you didn't create a DomainStack account, you can safely ignore
              this email.
            </Text>

            <Text
              style={{
                fontSize: "13px",
                color: "#a0aec0",
                margin: "16px 0 0",
                lineHeight: "1.6",
              }}
            >
              If you're having trouble clicking the button, copy and paste this
              URL into your browser: {verificationUrl}
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
