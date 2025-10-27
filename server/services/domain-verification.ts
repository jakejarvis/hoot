import { randomBytes } from "node:crypto";
import * as cheerio from "cheerio";
import { USER_AGENT } from "@/lib/constants";
import { fetchWithTimeout } from "@/lib/fetch";
import { logger } from "@/lib/logger";
import { resolveAll } from "@/server/services/dns";

const log = logger({ module: "domain-verification" });

export type VerificationMethod = "dns" | "meta" | "file";

export type VerificationResult = {
  verified: boolean;
  method: VerificationMethod;
};

/**
 * Generate a secure random verification token (32 character hex string)
 */
export function generateVerificationToken(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Verify domain ownership via DNS TXT record
 * Checks for TXT record containing: domainstack-verify=<token>
 */
export async function verifyDnsTxt(
  domain: string,
  expectedToken: string,
): Promise<VerificationResult> {
  log.debug("verifyDnsTxt", { domain });

  try {
    const dnsResult = await resolveAll(domain);

    // Filter for TXT records
    const txtRecords = dnsResult.records.filter(
      (record) => record.type === "TXT",
    );

    // Check if any TXT record contains the verification string
    const verificationString = `domainstack-verify=${expectedToken}`;
    const isVerified = txtRecords.some((record) =>
      record.value.includes(verificationString),
    );

    if (isVerified) {
      log.info("DNS verification successful", { domain });
    } else {
      log.debug("DNS verification failed", {
        domain,
        txtRecordsFound: txtRecords.length,
      });
    }

    return {
      verified: isVerified,
      method: "dns",
    };
  } catch (error) {
    log.error("DNS verification error", {
      domain,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      verified: false,
      method: "dns",
    };
  }
}

/**
 * Verify domain ownership via HTML meta tag
 * Checks for: <meta name="domainstack-verify" content="<token>">
 */
export async function verifyMetaTag(
  domain: string,
  expectedToken: string,
): Promise<VerificationResult> {
  log.debug("verifyMetaTag", { domain });

  try {
    const url = `https://${domain}/`;
    const response = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
        },
        redirect: "manual",
      },
      { timeoutMs: 10000 },
    );

    if (!response.ok) {
      log.debug("Meta tag verification failed - HTTP error", {
        domain,
        status: response.status,
      });
      return {
        verified: false,
        method: "meta",
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Check for <meta name="domainstack-verify" content="<token>">
    const verificationMeta = $('meta[name="domainstack-verify"]').attr(
      "content",
    );

    const isVerified =
      typeof verificationMeta === "string" &&
      verificationMeta.trim() === expectedToken;

    if (isVerified) {
      log.info("Meta tag verification successful", { domain });
    } else {
      log.debug("Meta tag verification failed", {
        domain,
        found: verificationMeta,
      });
    }

    return {
      verified: isVerified,
      method: "meta",
    };
  } catch (error) {
    log.error("Meta tag verification error", {
      domain,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      verified: false,
      method: "meta",
    };
  }
}

/**
 * Verify domain ownership via .well-known file
 * Checks: https://<domain>/.well-known/domainstack-verify.txt
 * File content should equal the token (trimmed)
 */
export async function verifyFile(
  domain: string,
  expectedToken: string,
): Promise<VerificationResult> {
  log.debug("verifyFile", { domain });

  try {
    const url = `https://${domain}/.well-known/domainstack-verify.txt`;
    const response = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
        },
      },
      { timeoutMs: 10000 }, // 10 second timeout
    );

    if (!response.ok) {
      log.debug("File verification failed - HTTP error", {
        domain,
        status: response.status,
      });
      return {
        verified: false,
        method: "file",
      };
    }

    const fileContent = (await response.text()).trim();
    const isVerified = fileContent === expectedToken;

    if (isVerified) {
      log.info("File verification successful", { domain });
    } else {
      log.debug("File verification failed - token mismatch", {
        domain,
        contentLength: fileContent.length,
      });
    }

    return {
      verified: isVerified,
      method: "file",
    };
  } catch (error) {
    log.error("File verification error", {
      domain,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      verified: false,
      method: "file",
    };
  }
}
