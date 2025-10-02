"use client";

import * as React from "react";
import { useIsCoarsePointer } from "@/hooks/use-is-coarse-pointer";
import {
  Tooltip,
  TooltipContent as BaseTooltipContent,
  TooltipTrigger as BaseTooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent as BasePopoverContent,
  PopoverTrigger as BasePopoverTrigger,
} from "@/components/ui/popover";

type CommonContentProps = {
  children?: React.ReactNode;
  className?: string;
};

type HybridRootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  /**
   * Force a specific mode, overriding detection. Useful for tests.
   * - "tooltip": always render Tooltip
   * - "popover": always render Popover
   */
  forceMode?: "tooltip" | "popover";
};

const HybridModeContext = React.createContext<
  { mode: "tooltip" | "popover" } | undefined
>(undefined);

function Hybrid({
  open,
  defaultOpen,
  onOpenChange,
  children,
  forceMode,
}: HybridRootProps) {
  const isCoarse = useIsCoarsePointer();
  const shouldUsePopover = React.useMemo(() => {
    if (forceMode === "popover") return true;
    if (forceMode === "tooltip") return false;
    // Until we can detect, prefer popover disabled (closed) state to avoid hover-only UI on touch
    return isCoarse === true;
  }, [forceMode, isCoarse]);

  const mode: "tooltip" | "popover" = shouldUsePopover ? "popover" : "tooltip";

  return (
    <HybridModeContext.Provider value={{ mode }}>
      {mode === "popover" ? (
        <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
          {children}
        </Popover>
      ) : (
        <Tooltip open={open} onOpenChange={onOpenChange}>
          {children}
        </Tooltip>
      )}
    </HybridModeContext.Provider>
  );
}

type TriggerProps = React.ComponentProps<typeof BaseTooltipTrigger> &
  React.ComponentProps<typeof BasePopoverTrigger> & {
    forceMode?: "tooltip" | "popover";
  };

function HybridTrigger({ forceMode: _ignored, ...props }: TriggerProps) {
  const ctx = React.useContext(HybridModeContext);
  if (ctx?.mode === "popover") {
    return <BasePopoverTrigger {...props} />;
  }
  if (ctx?.mode === "tooltip") {
    return <BaseTooltipTrigger {...props} />;
  }
  // Fallback if used outside root
  const isCoarse = useIsCoarsePointer();
  return isCoarse === true ? (
    <BasePopoverTrigger {...props} />
  ) : (
    <BaseTooltipTrigger {...props} />
  );
}

type ContentProps = (CommonContentProps &
  React.ComponentProps<typeof BaseTooltipContent>) & {
  forceMode?: "tooltip" | "popover";
  /** Hide the tooltip arrow (tooltip only) */
  hideArrow?: boolean;
};

function HybridContent({ forceMode: _ignored, hideArrow, ...props }: ContentProps) {
  const ctx = React.useContext(HybridModeContext);
  if (ctx?.mode === "popover") {
    return <BasePopoverContent {...props} />;
  }
  if (ctx?.mode === "tooltip") {
    return <BaseTooltipContent hideArrow={hideArrow} {...props} />;
  }
  // Fallback if used outside root
  const isCoarse = useIsCoarsePointer();
  return isCoarse === true ? (
    <BasePopoverContent {...props} />
  ) : (
    <BaseTooltipContent hideArrow={hideArrow} {...props} />
  );
}

export {
  Hybrid as HybridTooltipPopover,
  HybridTrigger as HybridTooltipPopoverTrigger,
  HybridContent as HybridTooltipPopoverContent,
};
