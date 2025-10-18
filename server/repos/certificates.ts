import "server-only";
import type { InferInsertModel } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { certificates } from "@/server/db/schema";

type CertificateInsert = InferInsertModel<typeof certificates>;

export type UpsertCertificatesParams = {
  domainId: string;
  chain: Array<
    Omit<CertificateInsert, "id" | "domainId" | "fetchedAt" | "expiresAt">
  >;
  fetchedAt: Date;
  expiresAt: Date; // policy window for revalidation (not cert validity)
};

export async function replaceCertificates(params: UpsertCertificatesParams) {
  const { domainId } = params;
  // Atomic delete and bulk insert in a single transaction
  await db.transaction(async (tx) => {
    await tx.delete(certificates).where(eq(certificates.domainId, domainId));
    if (params.chain.length > 0) {
      await tx.insert(certificates).values(
        params.chain.map((c) => ({
          domainId,
          issuer: c.issuer,
          subject: c.subject,
          altNames: c.altNames,
          validFrom: c.validFrom,
          validTo: c.validTo,
          caProviderId: c.caProviderId ?? null,
          fetchedAt: params.fetchedAt,
          expiresAt: params.expiresAt,
        })),
      );
    }
  });
}
