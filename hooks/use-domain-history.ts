import { useEffect } from "react";

export function useDomainHistory(
  domain: string,
  isSuccess: boolean,
  isRegistered: boolean,
) {
  useEffect(() => {
    if (isSuccess && isRegistered) {
      try {
        const stored = localStorage.getItem("hoot-history");
        const list = stored ? (JSON.parse(stored) as string[]) : [];
        const next = [domain, ...list.filter((d) => d !== domain)].slice(0, 5);
        localStorage.setItem("hoot-history", JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
    }
  }, [isSuccess, isRegistered, domain]);
}
