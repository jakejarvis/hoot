import { notFound } from "next/navigation"
import { DomainReportView } from "@/components/domain/domain-report-view"

export default async function DomainPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain: raw } = await params
  const domain = decodeURIComponent(raw)
  if (!isValidDomain(domain)) return notFound()

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <DomainReportView domain={domain} />
    </div>
  )
}

function isValidDomain(v: string) {
  return /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$/.test(v)
}


