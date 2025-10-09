import { captureClient } from "@/lib/analytics/client";
import { DomainExportSchema } from "@/lib/schemas";

export function exportDomainData(
  domain: string,
  data: Record<string, unknown>,
) {
  const payload = DomainExportSchema.parse({
    domain,
    ...data,
  });

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  // create a download "link" for a new imaginary json file
  const a = document.createElement("a");
  a.href = url;
  a.download = `${domain}-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  try {
    captureClient("export_result", {
      domain,
      format: "json",
      bytes: blob.size,
    });
  } catch {
    // no-op
  }
}
