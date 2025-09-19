interface ExportData {
  whois: unknown;
  dns: unknown;
  hosting: unknown;
  certificates: unknown;
  headers: unknown;
}

export function exportDomainData(domain: string, data: ExportData) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          domain,
          ...data,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${domain}-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
