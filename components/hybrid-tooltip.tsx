"use client";

import { createContext, useContext, useMemo } from "react";
import {
  Popover as UiPopover,
  PopoverContent as UiPopoverContent,
  PopoverTrigger as UiPopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip as UiTooltip,
  TooltipContent as UiTooltipContent,
  TooltipProvider as UiTooltipProvider,
  TooltipTrigger as UiTooltipTrigger,
} from "@/components/ui/tooltip";
import { usePreferPopoverForTooltip } from "@/hooks/use-pointer-capability";

type Variant = "tooltip" | "popover";

const VariantContext = createContext<Variant>("tooltip");

export type HybridTooltipProps =
  | ({ forceVariant?: Variant } & React.ComponentProps<typeof UiTooltip>)
  | ({ forceVariant?: Variant } & React.ComponentProps<typeof UiPopover>);

/**
 * HybridTooltip switches between Tooltip (desktop/hover) and Popover (touch/coarse) at runtime.
 * It preserves the familiar Tooltip API while providing tap-to-open behavior on touch devices.
 *
 * Props mirror the shadcn Tooltip/Popover roots. Prefer controlled props when needed.
 */
export function HybridTooltip({ forceVariant, ...props }: HybridTooltipProps) {
  const preferPopover = usePreferPopoverForTooltip();
  // Default to tooltip for SSR/hydration safety; only switch after mount via hook.
  const variant: Variant = useMemo(() => {
    return forceVariant ?? (preferPopover ? "popover" : "tooltip");
  }, [forceVariant, preferPopover]);

  if (variant === "popover") {
    return (
      <VariantContext.Provider value="popover">
        <UiPopover {...(props as React.ComponentProps<typeof UiPopover>)} />
      </VariantContext.Provider>
    );
  }

  return (
    <VariantContext.Provider value="tooltip">
      <UiTooltipProvider>
        <UiTooltip {...(props as React.ComponentProps<typeof UiTooltip>)} />
      </UiTooltipProvider>
    </VariantContext.Provider>
  );
}

export type HybridTooltipTriggerProps =
  | React.ComponentProps<typeof UiTooltipTrigger>
  | React.ComponentProps<typeof UiPopoverTrigger>;

export function HybridTooltipTrigger(props: HybridTooltipTriggerProps) {
  const variant = useContext(VariantContext);
  return variant === "popover" ? (
    <UiPopoverTrigger
      {...(props as React.ComponentProps<typeof UiPopoverTrigger>)}
    />
  ) : (
    <UiTooltipTrigger
      {...(props as React.ComponentProps<typeof UiTooltipTrigger>)}
    />
  );
}

export type HybridTooltipContentProps =
  | (React.ComponentProps<typeof UiTooltipContent> & { hideArrow?: boolean })
  | React.ComponentProps<typeof UiPopoverContent>;

export function HybridTooltipContent({
  hideArrow,
  ...props
}: HybridTooltipContentProps & { hideArrow?: boolean }) {
  const variant = useContext(VariantContext);
  return variant === "popover" ? (
    <UiPopoverContent
      {...(props as React.ComponentProps<typeof UiPopoverContent>)}
    />
  ) : (
    <UiTooltipContent
      {...(props as React.ComponentProps<typeof UiTooltipContent>)}
      hideArrow={hideArrow}
    />
  );
}
