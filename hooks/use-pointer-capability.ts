import { useEffect, useState } from "react";

export type PointerCapability = {
  supportsHover: boolean;
  isCoarsePointer: boolean;
};

/**
 * React hook that reports the current pointer/hover capability of the device.
 *
 * - supportsHover: true when the primary input can meaningfully hover (e.g., mouse)
 * - isCoarsePointer: true when the primary pointer is coarse (e.g., touch)
 *
 * Notes:
 * - Defaults to {supportsHover: false, isCoarsePointer: false} before mount to avoid SSR mismatches.
 * - Listens to `(hover: hover)` and `(pointer: coarse)` media queries and updates on change.
 */
export function usePointerCapability(): PointerCapability {
  const [capability, setCapability] = useState<PointerCapability>({
    supportsHover: false,
    isCoarsePointer: false,
  });

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      // In SSR or test environments without matchMedia, keep defaults.
      return;
    }

    const hoverMql = window.matchMedia("(hover: hover)");
    const coarseMql = window.matchMedia("(pointer: coarse)");

    const update = () =>
      setCapability({
        supportsHover: hoverMql.matches,
        isCoarsePointer: coarseMql.matches,
      });

    update();
    hoverMql.addEventListener("change", update);
    coarseMql.addEventListener("change", update);

    return () => {
      hoverMql.removeEventListener("change", update);
      coarseMql.removeEventListener("change", update);
    };
  }, []);

  return capability;
}
