import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DomainReportView } from "@/components/domain/domain-report-view";
import { normalizeDomainInput } from "@/lib/domain";
import { toRegistrableDomain } from "@/lib/domain-server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain: raw } = await params;
  const decoded = decodeURIComponent(raw);
  const normalized = normalizeDomainInput(decoded);
  const registrable = toRegistrableDomain(normalized);
  if (!registrable) notFound();
  return {
    title: `${normalized} | Domain report by hoot.sh`,
    description: `Investigate ${normalized} with WHOIS, DNS, SSL, headers, and more.`,
  };
}

export default async function DomainPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain: raw } = await params;
  const decoded = decodeURIComponent(raw);
  const normalized = normalizeDomainInput(decoded);
  const registrable = toRegistrableDomain(normalized);
  if (!registrable) notFound();
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
