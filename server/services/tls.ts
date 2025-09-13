import tls from "node:tls";
import { getOrSet, ns } from "@/lib/redis";

export type Certificate = {
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  signatureAlgorithm: string;
  keyType: string;
  chain: string[];
};

export async function getCertificates(domain: string): Promise<Certificate[]> {
  const key = ns("tls", domain.toLowerCase());
  return await getOrSet(key, 12 * 60 * 60, async () => {
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
          socket.destroy(new Error("TLS timeout"));
        });
        socket.on("error", reject);
      },
    );
    const out: Certificate[] = chain.map((c) => ({
      issuer: toName(c.issuer),
      subject: toName(c.subject),
      validFrom: new Date(c.valid_from).toISOString(),
      validTo: new Date(c.valid_to).toISOString(),
      signatureAlgorithm:
        (c as Partial<{ signatureAlgorithm: string }>).signatureAlgorithm || "",
      // Ensure we never return Buffers/typed arrays (which break superjson)
      keyType:
        typeof (c as Partial<{ publicKeyAlgorithm: string }>)
          .publicKeyAlgorithm === "string"
          ? (c as Partial<{ publicKeyAlgorithm: string }>).publicKeyAlgorithm ||
            ""
          : "",
      chain: [],
    }));
    // Add simple subject chain for readability
    if (out.length > 0) out[0].chain = out.map((c) => c.issuer);

    return out;
  });
}

function toName(subject: tls.PeerCertificate["subject"] | undefined) {
  if (!subject) return "";
  const maybeRecord = subject as unknown as Record<string, unknown>;
  const cn =
    typeof maybeRecord?.CN === "string"
      ? (maybeRecord.CN as string)
      : undefined;
  const o =
    typeof maybeRecord?.O === "string" ? (maybeRecord.O as string) : undefined;
  return cn ? `CN=${cn}` : o ? `O=${o}` : JSON.stringify(subject);
}
