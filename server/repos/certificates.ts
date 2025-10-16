import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { certificates } from "@/server/db/schema";

export type UpsertCertificatesParams = {
  domainId: string;
  chain: Array<{
    issuer: string;
    subject: string;
    altNames: string[];
    validFrom: Date;
    validTo: Date;
    caProviderId?: string | null;
  }>;
  fetchedAt: Date;
  expiresAt: Date; // policy window for revalidation (not cert validity)
};

export async function replaceCertificates(params: UpsertCertificatesParams) {
  const { domainId } = params;
  // Remove previous rows for this domain
  await db.delete(certificates).where(eq(certificates.domainId, domainId));
  for (const c of params.chain) {
    await db.insert(certificates).values({
      domainId,
      issuer: c.issuer,
      subject: c.subject,
      altNames: c.altNames as unknown as Record<string, unknown>[],
      validFrom: c.validFrom,
      validTo: c.validTo,
      caProviderId: c.caProviderId ?? null,
      fetchedAt: params.fetchedAt,
      expiresAt: params.expiresAt,
    });
  }
}
