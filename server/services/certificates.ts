import tls from "node:tls";
import { eq } from "drizzle-orm";
import { captureServer } from "@/lib/analytics/server";
import { detectCertificateAuthority } from "@/lib/providers/detection";
import type { Certificate } from "@/lib/schemas";
import { db } from "@/server/db/client";
import { certificates as certTable } from "@/server/db/schema";
import { ttlForCertificates } from "@/server/db/ttl";
import { replaceCertificates } from "@/server/repos/certificates";
import { upsertDomain } from "@/server/repos/domains";

export async function getCertificates(domain: string): Promise<Certificate[]> {
  const lower = domain.toLowerCase();

  console.debug("[certificates] start", { domain: lower });
  // Fast path: DB
  const d = await upsertDomain({
    name: lower,
    tld: lower.split(".").slice(1).join(".") as string,
    punycodeName: lower,
    unicodeName: domain,
    isIdn: /xn--/.test(lower),
  });
  const existing = await db
    .select({
      issuer: certTable.issuer,
      subject: certTable.subject,
      altNames: certTable.altNames,
      validFrom: certTable.validFrom,
      validTo: certTable.validTo,
      expiresAt: certTable.expiresAt,
    })
    .from(certTable)
    .where(eq(certTable.domainId, d.id));
  if (existing.length > 0) {
    const now = Date.now();
    const fresh = existing.some((c) => (c.expiresAt?.getTime?.() ?? 0) > now);
    if (fresh) {
      const out: Certificate[] = existing.map((c) => ({
        issuer: c.issuer,
        subject: c.subject,
        altNames: (c.altNames as unknown as string[]) ?? [],
        validFrom: new Date(c.validFrom).toISOString(),
        validTo: new Date(c.validTo).toISOString(),
        caProvider: detectCertificateAuthority(c.issuer),
      }));
      return out;
    }
  }

  // Client gating avoids calling this without A/AAAA; server does not pre-check DNS here.

  const startedAt = Date.now();
  let outcome: "ok" | "timeout" | "error" = "ok";
  try {
    const chain = await new Promise<tls.DetailedPeerCertificate[]>(
      (resolve, reject) => {
        const socket = tls.connect(
          {
            host: domain,
            port: 443,
            servername: domain,
            rejectUnauthorized: false,
          },
          () => {
            const peer = socket.getPeerCertificate(
              true,
            ) as tls.DetailedPeerCertificate;
            const chain: tls.DetailedPeerCertificate[] = [];
            let current: tls.DetailedPeerCertificate | null = peer;
            while (current) {
              chain.push(current);
              const next = (
                current as unknown as { issuerCertificate?: unknown }
              ).issuerCertificate as tls.DetailedPeerCertificate | undefined;
              current = next && next !== current ? next : null;
            }
            socket.end();
            resolve(chain);
          },
        );
        socket.setTimeout(6000, () => {
          outcome = "timeout";
          socket.destroy(new Error("TLS timeout"));
        });
        socket.on("error", (err) => {
          outcome = "error";
          reject(err);
        });
      },
    );

    const out: Certificate[] = chain.map((c) => {
      const issuerName = toName(c.issuer);
      return {
        issuer: issuerName,
        subject: toName(c.subject),
        altNames: parseAltNames(
          (c as Partial<{ subjectaltname: string }>).subjectaltname,
        ),
        validFrom: new Date(c.valid_from).toISOString(),
        validTo: new Date(c.valid_to).toISOString(),
        caProvider: detectCertificateAuthority(issuerName),
      };
    });

    await captureServer("tls_probe", {
      domain: lower,
      chain_length: out.length,
      duration_ms: Date.now() - startedAt,
      outcome,
    });

    const now = new Date();
    const earliestValidTo =
      out.length > 0
        ? new Date(Math.min(...out.map((c) => new Date(c.validTo).getTime())))
        : new Date(Date.now() + 3600_000);
    await replaceCertificates({
      domainId: d.id,
      chain: out.map((c) => ({
        issuer: c.issuer,
        subject: c.subject,
        altNames: c.altNames as unknown as string[],
        validFrom: new Date(c.validFrom),
        validTo: new Date(c.validTo),
        caProviderId: null,
      })),
      fetchedAt: now,
      expiresAt: ttlForCertificates(now, earliestValidTo),
    });

    console.info("[certificates] ok", {
      domain: lower,
      chain_length: out.length,
      duration_ms: Date.now() - startedAt,
    });
    return out;
  } catch (err) {
    console.warn("[certificates] error", {
      domain: lower,
      error: (err as Error)?.message,
    });
    await captureServer("tls_probe", {
      domain: lower,
      chain_length: 0,
      duration_ms: Date.now() - startedAt,
      outcome,
      error: String(err),
    });
    // Do not treat as fatal; return empty and avoid long-lived negative cache
    return [];
  }
}

export function toName(subject: tls.PeerCertificate["subject"] | undefined) {
  if (!subject) return "";
  const maybeRecord = subject as unknown as Record<string, unknown>;
  const cn =
    typeof maybeRecord?.CN === "string"
      ? (maybeRecord.CN as string)
      : undefined;
  const o =
    typeof maybeRecord?.O === "string" ? (maybeRecord.O as string) : undefined;
  return cn ? cn : o ? o : JSON.stringify(subject);
}

export function parseAltNames(subjectAltName: string | undefined): string[] {
  if (typeof subjectAltName !== "string" || subjectAltName.length === 0) {
    return [];
  }
  return subjectAltName
    .split(",")
    .map((segment) => segment.trim())
    .map((segment) => {
      const idx = segment.indexOf(":");
      if (idx === -1) return ["", segment] as const;
      const kind = segment.slice(0, idx).trim().toUpperCase();
      const value = segment.slice(idx + 1).trim();
      return [kind, value] as const;
    })
    .filter(
      ([kind, value]) => !!value && (kind === "DNS" || kind === "IP ADDRESS"),
    )
    .map(([_, value]) => value);
}
