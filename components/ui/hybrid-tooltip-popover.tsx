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

  if (shouldUsePopover) {
    return (
      <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        {children}
      </Popover>
    );
  }
  return (
    <Tooltip open={open} onOpenChange={onOpenChange}>
      {children}
    </Tooltip>
  );
}

type TriggerProps = React.ComponentProps<typeof BaseTooltipTrigger> &
  React.ComponentProps<typeof BasePopoverTrigger> & {
    forceMode?: "tooltip" | "popover";
  };

function HybridTrigger({ forceMode, ...props }: TriggerProps) {
  const isCoarse = useIsCoarsePointer();
  const shouldUsePopover = forceMode
    ? forceMode === "popover"
    : isCoarse === true;
  if (shouldUsePopover) {
    return <BasePopoverTrigger {...props} />;
  }
  return <BaseTooltipTrigger {...props} />;
}

type ContentProps = (CommonContentProps &
  React.ComponentProps<typeof BaseTooltipContent>) & {
  forceMode?: "tooltip" | "popover";
  /** Hide the tooltip arrow (tooltip only) */
  hideArrow?: boolean;
};

function HybridContent({ forceMode, hideArrow, ...props }: ContentProps) {
  const isCoarse = useIsCoarsePointer();
  const shouldUsePopover = forceMode
    ? forceMode === "popover"
    : isCoarse === true;
  if (shouldUsePopover) {
    return <BasePopoverContent {...props} />;
  }
  return <BaseTooltipContent hideArrow={hideArrow} {...props} />;
}

export {
  Hybrid as HybridTooltipPopover,
  HybridTrigger as HybridTooltipPopoverTrigger,
  HybridContent as HybridTooltipPopoverContent,
};
