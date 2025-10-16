import tls from "node:tls";
import { captureServer } from "@/lib/analytics/server";
import { detectCertificateAuthority } from "@/lib/providers/detection";
import { ns, redis } from "@/lib/redis";
import type { Certificate } from "@/lib/schemas";
import { persistCertificatesToDb } from "@/server/services/certificates-db";

export async function getCertificates(domain: string): Promise<Certificate[]> {
  const lower = domain.toLowerCase();
  const key = ns("tls", lower);

  console.debug("[certificates] start", { domain: lower });
  const cached = await redis.get<Certificate[]>(key);
  if (cached) {
    console.info("[certificates] cache hit", {
      domain: lower,
      count: cached.length,
    });
    return cached;
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

    const ttl = out.length > 0 ? 12 * 60 * 60 : 10 * 60;
    await redis.set(key, out, { ex: ttl });
    try {
      await persistCertificatesToDb(domain, out);
    } catch {}
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
