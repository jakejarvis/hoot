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

interface CertificateChangedEmailProps {
  domain: string;
  changeDetails: {
    before: {
      validFrom: string | null;
      validTo: string | null;
      issuer: string | null;
    };
    after: {
      validFrom: string | null;
      validTo: string | null;
      issuer: string | null;
    };
  };
  verifyUrl: string;
}

export default function CertificateChangedEmail({
  domain,
  changeDetails,
  verifyUrl,
}: CertificateChangedEmailProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

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
              SSL Certificate Changed
            </Text>

            <Text
              style={{
                fontSize: "16px",
                color: "#4a5568",
                margin: "0 0 24px",
                lineHeight: "1.6",
              }}
            >
              We detected a change in the SSL certificate for{" "}
              <strong style={{ color: "#1a1a1a" }}>{domain}</strong>. This could
              be due to a renewal, provider change, or configuration update.
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
                fontWeight: "600",
                color: "#4a5568",
                margin: "0 0 16px",
                lineHeight: "1.6",
              }}
            >
              Certificate Changes:
            </Text>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <tbody>
                {changeDetails.before.issuer !== changeDetails.after.issuer && (
                  <tr>
                    <td
                      style={{
                        padding: "8px 0",
                        color: "#4a5568",
                        fontWeight: "600",
                      }}
                    >
                      Issuer:
                    </td>
                    <td
                      style={{
                        padding: "8px 0",
                        color: "#718096",
                      }}
                    >
                      {changeDetails.before.issuer || "N/A"} →{" "}
                      <span style={{ color: "#16a34a", fontWeight: "600" }}>
                        {changeDetails.after.issuer || "N/A"}
                      </span>
                    </td>
                  </tr>
                )}
                {changeDetails.before.validFrom !==
                  changeDetails.after.validFrom && (
                  <tr>
                    <td
                      style={{
                        padding: "8px 0",
                        color: "#4a5568",
                        fontWeight: "600",
                      }}
                    >
                      Valid From:
                    </td>
                    <td
                      style={{
                        padding: "8px 0",
                        color: "#718096",
                      }}
                    >
                      {formatDate(changeDetails.before.validFrom)} →{" "}
                      <span style={{ color: "#16a34a", fontWeight: "600" }}>
                        {formatDate(changeDetails.after.validFrom)}
                      </span>
                    </td>
                  </tr>
                )}
                {changeDetails.before.validTo !==
                  changeDetails.after.validTo && (
                  <tr>
                    <td
                      style={{
                        padding: "8px 0",
                        color: "#4a5568",
                        fontWeight: "600",
                      }}
                    >
                      Valid Until:
                    </td>
                    <td
                      style={{
                        padding: "8px 0",
                        color: "#718096",
                      }}
                    >
                      {formatDate(changeDetails.before.validTo)} →{" "}
                      <span style={{ color: "#16a34a", fontWeight: "600" }}>
                        {formatDate(changeDetails.after.validTo)}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
              <strong style={{ color: "#4a5568" }}>Common reasons:</strong>
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0 0 8px",
                lineHeight: "1.6",
              }}
            >
              • Certificate renewal (automatic or manual)
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0 0 8px",
                lineHeight: "1.6",
              }}
            >
              • Switching to a different SSL provider
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#718096",
                margin: "0",
                lineHeight: "1.6",
              }}
            >
              • Server or hosting configuration changes
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
