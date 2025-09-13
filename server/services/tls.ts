import tls from "node:tls";
import { TTLCache } from "./cache";

export type Certificate = {
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  signatureAlgorithm: string;
  keyType: string;
  chain: string[];
};

const cache = new TTLCache<string, Certificate[]>(12 * 60 * 60 * 1000, (k) =>
  k.toLowerCase(),
);

export async function getCertificates(domain: string): Promise<Certificate[]> {
  const cached = cache.get(domain);
  if (cached) return cached;

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
            const next = (current as unknown as { issuerCertificate?: unknown })
              .issuerCertificate as tls.DetailedPeerCertificate | undefined;
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
    signatureAlgorithm: (c as any).signatureAlgorithm || "",
    // Ensure we never return Buffers/typed arrays (which break superjson)
    keyType:
      typeof (c as any).publicKeyAlgorithm === "string"
        ? (c as any).publicKeyAlgorithm
        : "",
    chain: [],
  }));
  // Add simple subject chain for readability
  if (out.length > 0) out[0].chain = out.map((c) => c.issuer);

  cache.set(domain, out);
  return out;
}

function toName(subject: tls.PeerCertificate["subject"] | undefined) {
  if (!subject) return "";
  const cn = (subject as any).CN;
  const o = (subject as any).O;
  return cn ? `CN=${cn}` : o ? `O=${o}` : JSON.stringify(subject);
}
