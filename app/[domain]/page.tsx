import { notFound } from "next/navigation"
import { generateMockReport } from "@/lib/mock"
import { DomainReportView } from "@/components/domain/domain-report-view"

export default function DomainPage({ params }: { params: { domain: string } }) {
  const domain = decodeURIComponent(params.domain)
  if (!isValidDomain(domain)) return notFound()
  const report = generateMockReport(domain)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <DomainReportView report={report} />
    </div>
  )
}

function isValidDomain(v: string) {
  return /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$/.test(v)
}


