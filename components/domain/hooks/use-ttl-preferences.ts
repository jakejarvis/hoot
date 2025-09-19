import { useEffect, useState } from "react";

export function useTtlPreferences() {
  const [showTtls, setShowTtls] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hoot-show-dns-ttls");
      if (stored !== null) setShowTtls(stored === "1");
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("hoot-show-dns-ttls", showTtls ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }, [showTtls]);

  return {
    showTtls,
    setShowTtls,
  };
}
