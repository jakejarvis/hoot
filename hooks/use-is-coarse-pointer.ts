import { useEffect, useState } from "react";

/**
 * Detects whether the primary input is coarse (touch) or hover is unavailable.
 * Returns:
 * - true for coarse/touch inputs
 * - false for fine/hover-capable inputs
 * - null before mount or when detection is unavailable
 */
export function useIsCoarsePointer(): boolean | null {
  const [isCoarse, setIsCoarse] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setIsCoarse(null);
      return;
    }

    const mqlCoarse = window.matchMedia("(pointer: coarse)");
    const mqlHoverNone = window.matchMedia("(hover: none)");

    const update = () => {
      setIsCoarse(mqlCoarse.matches || mqlHoverNone.matches);
    };

    update();

    try {
      mqlCoarse.addEventListener("change", update);
      mqlHoverNone.addEventListener("change", update);
      return () => {
        mqlCoarse.removeEventListener("change", update);
        mqlHoverNone.removeEventListener("change", update);
      };
    } catch {
      // Safari <14 fallback
      // @ts-expect-error older API
      mqlCoarse.addListener?.(update);
      // @ts-expect-error older API
      mqlHoverNone.addListener?.(update);
      return () => {
        // @ts-expect-error older API
        mqlCoarse.removeListener?.(update);
        // @ts-expect-error older API
        mqlHoverNone.removeListener?.(update);
      };
    }
  }, []);

  return isCoarse;
}
