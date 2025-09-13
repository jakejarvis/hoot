import { notFound, redirect } from "next/navigation";
import { DomainReportView } from "@/components/domain/domain-report-view";
import { isValidDomain, normalizeDomainInput } from "@/lib/domain";

export default async function DomainPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain: raw } = await params;
  const decoded = decodeURIComponent(raw);
  const normalized = normalizeDomainInput(decoded);
  if (!isValidDomain(normalized)) return notFound();
  // Canonicalize URL to the normalized domain
  if (normalized !== decoded) {
    redirect(`/${encodeURIComponent(normalized)}`);
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <DomainReportView domain={normalized} />
    </div>
  );
}
