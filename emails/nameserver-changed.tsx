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

interface NameserverChangedEmailProps {
  domain: string;
  previousNs: string[];
  currentNs: string[];
  verifyUrl: string;
}

export default function NameserverChangedEmail({
  domain,
  previousNs,
  currentNs,
  verifyUrl,
}: NameserverChangedEmailProps) {
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
              Nameservers Changed
            </Text>

            <Text
              style={{
                fontSize: "16px",
                color: "#4a5568",
                margin: "0 0 24px",
                lineHeight: "1.6",
              }}
            >
              We detected a change in the nameservers for{" "}
              <strong style={{ color: "#1a1a1a" }}>{domain}</strong>. This
              change may affect your domain's DNS resolution and email delivery.
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
              View Domain Details
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
                fontWeight: "600",
                color: "#4a5568",
                margin: "0 0 12px",
                lineHeight: "1.6",
              }}
            >
              Previous Nameservers:
            </Text>

            {previousNs.map((ns) => (
              <Text
                key={ns}
                style={{
                  fontSize: "14px",
                  color: "#718096",
                  margin: "0 0 4px",
                  lineHeight: "1.6",
                  fontFamily: "monospace",
                }}
              >
                • {ns}
              </Text>
            ))}
          </Section>

          <Section style={{ marginTop: "24px" }}>
            <Text
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "#4a5568",
                margin: "0 0 12px",
                lineHeight: "1.6",
              }}
            >
              Current Nameservers:
            </Text>

            {currentNs.map((ns) => (
              <Text
                key={ns}
                style={{
                  fontSize: "14px",
                  color: "#16a34a",
                  margin: "0 0 4px",
                  lineHeight: "1.6",
                  fontFamily: "monospace",
                }}
              >
                • {ns}
              </Text>
            ))}
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
              <strong style={{ color: "#4a5568" }}>
                Didn't make this change?
              </strong>
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0",
                lineHeight: "1.6",
              }}
            >
              If you didn't authorize this nameserver change, it could indicate
              unauthorized access to your domain registrar account. Please
              verify the change immediately and contact your registrar if
              needed.
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
              This is an automated change detection notification from
              DomainStack. You're receiving this because you're monitoring{" "}
              {domain}.
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
