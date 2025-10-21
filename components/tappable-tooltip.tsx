"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Popover as PopoverPrimitive, Slot as SlotPrimitive } from "radix-ui";
import * as React from "react";
import { useTimeout } from "@/hooks/use-timeout";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------------------------------
 * Constants
 * -------------------------------------------------------------------------------------------------*/

const OPEN_DELAY_MS = 0;
const CLOSE_DELAY_MS = 150;
const TOUCH_CLOSE_RADIUS = 12;

/* -------------------------------------------------------------------------------------------------
 * Small helpers
 * -------------------------------------------------------------------------------------------------*/

function setRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.MutableRefObject<T | null>).current = value;
}

/* -------------------------------------------------------------------------------------------------
 * Provider (single-open coordination + shared config)
 * -------------------------------------------------------------------------------------------------*/

type ProviderCtx = {
  delayDuration: number;
  touchCloseRadius: number;
  currentOpenId: string | null;
  setCurrentOpenId: (id: string | null) => void;
};

const ProviderContext = React.createContext<ProviderCtx | null>(null);

function TooltipProvider({
  delayDuration = OPEN_DELAY_MS,
  touchCloseRadius = TOUCH_CLOSE_RADIUS,
  children,
}: React.PropsWithChildren<
  Partial<Pick<ProviderCtx, "delayDuration" | "touchCloseRadius">>
>) {
  const [currentOpenId, setCurrentOpenId] = React.useState<string | null>(null);
  const value = React.useMemo(
    () => ({
      delayDuration,
      touchCloseRadius,
      currentOpenId,
      setCurrentOpenId,
    }),
    [delayDuration, touchCloseRadius, currentOpenId],
  );
  return (
    <ProviderContext.Provider value={value}>
      {children}
    </ProviderContext.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Root
 * -------------------------------------------------------------------------------------------------*/

type SetOpenArg = boolean | ((p: boolean) => boolean);

type TooltipRootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disableHoverableContent?: boolean;
  children: React.ReactNode;
};

type RootCtx = {
  open: boolean;
  setOpen: (o: SetOpenArg) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  hoverCloseTimerRef: React.MutableRefObject<number | null>;
  describedById: string;
  disableHoverableContent: boolean;
  instanceId: string;
};

const TooltipCtx = React.createContext<RootCtx | null>(null);
function useTooltipCtx() {
  const ctx = React.useContext(TooltipCtx);
  if (!ctx)
    throw new Error("Tooltip components must be used within <Tooltip/>");
  return ctx;
}

function Tooltip({
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  disableHoverableContent = false,
  children,
}: TooltipRootProps) {
  const [open, setOpenBase] = useControllableState<boolean>({
    prop: controlledOpen,
    defaultProp: !!defaultOpen,
    onChange: onOpenChange,
  });

  const instanceId = React.useId();
  const describedById = React.useId();

  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const hoverCloseTimerRef = React.useRef<number | null>(null);

  // single-open coordination
  const provider = React.useContext(ProviderContext);
  const setOpen = React.useCallback(
    (next: SetOpenArg) => {
      const value =
        typeof next === "function"
          ? (next as (p: boolean) => boolean)(open)
          : next;
      if (value) provider?.setCurrentOpenId(instanceId);
      setOpenBase(value);
    },
    [open, provider, instanceId, setOpenBase],
  );

  // Close if some other tooltip becomes active
  React.useEffect(() => {
    const activeId = provider?.currentOpenId;
    if (!activeId) return; // no provider or none marked active → do nothing
    if (activeId !== instanceId && open) setOpen(false);
  }, [provider?.currentOpenId, instanceId, open, setOpen]);

  const ctx = React.useMemo<RootCtx>(
    () => ({
      open,
      setOpen,
      triggerRef,
      contentRef,
      hoverCloseTimerRef,
      describedById,
      disableHoverableContent,
      instanceId,
    }),
    [open, setOpen, disableHoverableContent, describedById, instanceId],
  );

  return (
    <TooltipCtx.Provider value={ctx} data-slot="tooltip-provider">
      <PopoverPrimitive.Root
        open={open}
        onOpenChange={setOpen}
        data-slot="tooltip"
      >
        {children}
      </PopoverPrimitive.Root>
    </TooltipCtx.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -------------------------------------------------------------------------------------------------*/

type TriggerEventOverrides = {
  onPointerEnter?: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLElement, Element>) => void;
  onBlur?: (e: React.FocusEvent<HTMLElement, Element>) => void;
};

type TooltipTriggerProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  keyof TriggerEventOverrides
> &
  TriggerEventOverrides & { asChild?: boolean };

const TooltipTrigger = React.forwardRef<HTMLElement, TooltipTriggerProps>(
  function TooltipTrigger(
    {
      asChild,
      onFocus,
      onBlur,
      onPointerEnter,
      onPointerLeave,
      onPointerDown,
      onKeyDown,
      type,
      ...rest
    },
    forwardedRef,
  ) {
    const {
      setOpen,
      triggerRef,
      disableHoverableContent,
      contentRef,
      hoverCloseTimerRef,
    } = useTooltipCtx();
    const provider = React.useContext(ProviderContext);

    const openTimer = useTimeout();

    const cancelClose = React.useCallback(() => {
      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
      }
    }, [hoverCloseTimerRef]);

    const scheduleClose = React.useCallback(() => {
      cancelClose();
      hoverCloseTimerRef.current = window.setTimeout(() => {
        setOpen(false);
      }, CLOSE_DELAY_MS);
    }, [cancelClose, hoverCloseTimerRef, setOpen]);

    const ref = (node: HTMLElement | null) => {
      triggerRef.current = node;
      setRef(forwardedRef, node);
    };

    const Comp = asChild ? SlotPrimitive.Slot : "button";

    return (
      <PopoverPrimitive.Trigger asChild>
        <Comp
          ref={ref}
          {...(!asChild ? ({ type: type ?? "button" } as const) : {})}
          onPointerEnter={(e) => {
            onPointerEnter?.(e);
            if (e.pointerType === "mouse") {
              cancelClose();
              openTimer.set(
                () => setOpen(true),
                provider?.delayDuration ?? OPEN_DELAY_MS,
              );
            }
          }}
          onPointerLeave={(e) => {
            onPointerLeave?.(e);
            if (e.pointerType !== "mouse") return;

            openTimer.clear();

            // If moving into tooltip content (or its invisible bridge), do NOT schedule close
            const rt = e.relatedTarget as EventTarget | null;
            const intoContent = !!(
              rt instanceof Node && contentRef.current?.contains(rt)
            );
            if (intoContent) return;

            if (disableHoverableContent) setOpen(false);
            else scheduleClose();
          }}
          onFocus={(e) => {
            onFocus?.(e);
            if (e.currentTarget.matches(":focus-visible")) setOpen(true);
          }}
          onBlur={(e) => {
            onBlur?.(e);
            setOpen(false);
          }}
          onPointerDown={(e) => {
            onPointerDown?.(e);
            openTimer.clear();
            cancelClose();
            if (e.pointerType === "touch" || e.pointerType === "pen") {
              setOpen((p) => !p);
            }
          }}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            if (e.key === "Escape") setOpen(false);
          }}
          data-slot="tooltip-trigger"
          {...rest}
        />
      </PopoverPrimitive.Trigger>
    );
  },
);

/* -------------------------------------------------------------------------------------------------
 * Content
 * -------------------------------------------------------------------------------------------------*/

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

type TooltipContentProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onDrag"
  | "onDragEnd"
  | "onDragStart"
> & {
  side?: Side;
  align?: Align;
  alignOffset?: number;
  sideOffset?: number;
  withArrow?: boolean;
  smartAxisFallback?: boolean;
};

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  function TooltipContent(
    {
      className,
      style,
      children,
      side = "top",
      align = "center",
      alignOffset = 0,
      sideOffset = 8,
      withArrow = true,
      smartAxisFallback = true,
      ...rest
    },
    forwardedRef,
  ) {
    const {
      open,
      setOpen,
      triggerRef,
      contentRef,
      hoverCloseTimerRef,
      describedById,
      disableHoverableContent,
      instanceId,
    } = useTooltipCtx();
    const provider = React.useContext(ProviderContext);

    // ---- axis fallback (unchanged) ----
    const [resolvedSide, setResolvedSide] = React.useState<Side>(side);
    React.useLayoutEffect(() => {
      if (!open || !smartAxisFallback) return;
      const t = triggerRef.current;
      if (!t) return;
      const rect = t.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const leftSpace = rect.left;
      const rightSpace = vw - rect.right;
      const topSpace = rect.top;
      const bottomSpace = vh - rect.bottom;

      if (side === "left" || side === "right") {
        const horiz = Math.max(leftSpace, rightSpace);
        const vert = Math.max(topSpace, bottomSpace);
        if (vert > horiz) {
          setResolvedSide(topSpace > bottomSpace ? "top" : "bottom");
          return;
        }
      }
      setResolvedSide(side);
    }, [open, side, smartAxisFallback, triggerRef]);

    // ---- aria-describedby, scroll/resize, provider mark (unchanged) ----
    React.useEffect(() => {
      const t = triggerRef.current;
      if (!t || !open) return;
      const prev = t.getAttribute("aria-describedby") || "";
      const ids = new Set(prev.split(/\s+/).filter(Boolean));
      ids.add(describedById);
      t.setAttribute("aria-describedby", Array.from(ids).join(" "));
      return () => {
        const now = new Set(
          (t.getAttribute("aria-describedby") || "")
            .split(/\s+/)
            .filter(Boolean),
        );
        now.delete(describedById);
        if (now.size)
          t.setAttribute("aria-describedby", Array.from(now).join(" "));
        else t.removeAttribute("aria-describedby");
      };
    }, [open, describedById, triggerRef]);

    React.useEffect(() => {
      if (!open) return;
      const close = () => setOpen(false);
      window.addEventListener("scroll", close, true);
      window.addEventListener("resize", close);
      return () => {
        window.removeEventListener("scroll", close, true);
        window.removeEventListener("resize", close);
      };
    }, [open, setOpen]);

    React.useEffect(() => {
      if (open) provider?.setCurrentOpenId(instanceId);
    }, [open, provider, instanceId]);

    const cancelClose = React.useCallback(() => {
      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
      }
    }, [hoverCloseTimerRef]);

    const gapPad = Math.max(
      0,
      (typeof sideOffset === "number" ? sideOffset : 0) - 1, // stop 1px short of trigger
    );

    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={(node) => {
            setRef(forwardedRef, node);
            contentRef.current = node;
          }}
          forceMount
          side={resolvedSide}
          align={align}
          alignOffset={alignOffset}
          sideOffset={sideOffset}
          avoidCollisions
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerEnter={() => {
            if (!disableHoverableContent) cancelClose();
          }}
          onPointerLeave={() => {
            if (!disableHoverableContent) setOpen(false);
          }}
          onInteractOutside={(e) => {
            const t = triggerRef.current;
            const pe = e.detail?.originalEvent as PointerEvent | undefined;
            if (!t || !pe) return;
            const r = t.getBoundingClientRect();
            const cx = Math.max(r.left, Math.min(pe.clientX, r.right));
            const cy = Math.max(r.top, Math.min(pe.clientY, r.bottom));
            if (
              Math.hypot(pe.clientX - cx, pe.clientY - cy) <=
              (provider?.touchCloseRadius ?? TOUCH_CLOSE_RADIUS)
            ) {
              e.preventDefault();
            }
          }}
          style={{
            transformOrigin: "var(--radix-popover-content-transform-origin)",
            maxWidth: "min(90vw, var(--radix-popover-content-available-width))",
            ...style,
          }}
          className={cn(
            "group",
            "relative z-50 m-0 border-0 bg-foreground p-0 text-xs shadow-md outline-none",
            "whitespace-normal text-pretty break-words rounded-md px-3 py-1.5 text-background",
            "overflow-visible", // <— allow the pad to live outside without clipping
            "will-change-[transform,opacity]",
            "data-[state=closed]:animate-out data-[state=open]:animate-in",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            "data-[side=top]:slide-in-from-bottom-1",
            "data-[side=bottom]:slide-in-from-top-1",
            "data-[side=left]:slide-in-from-right-1",
            "data-[side=right]:slide-in-from-left-1",
            "motion-reduce:animate-none",
            className,
          )}
          role="tooltip"
          id={describedById}
          data-slot="tooltip-content"
          {...rest}
        >
          {/* content stays visually centered because we didn't mess with padding */}
          {children}

          {/* 3) invisible hover pad toward the trigger; doesn't affect layout */}
          {gapPad > 0 && (
            <span
              aria-hidden
              onPointerEnter={cancelClose}
              className="absolute block"
              style={{
                pointerEvents: "auto",
                // put it *outside* the bubble on the side facing the trigger:
                ...(resolvedSide === "top" && {
                  left: 0,
                  right: 0,
                  height: gapPad,
                  bottom: -gapPad,
                }),
                ...(resolvedSide === "bottom" && {
                  left: 0,
                  right: 0,
                  height: gapPad,
                  top: -gapPad,
                }),
                ...(resolvedSide === "left" && {
                  top: 0,
                  bottom: 0,
                  width: gapPad,
                  right: -gapPad,
                }),
                ...(resolvedSide === "right" && {
                  top: 0,
                  bottom: 0,
                  width: gapPad,
                  left: -gapPad,
                }),
              }}
            />
          )}

          {withArrow && (
            <PopoverPrimitive.Arrow
              width={12}
              height={8}
              className={cn(
                "pointer-events-none text-foreground [paint-order:stroke]",
                "group-data-[side=top]:-mt-[2px] group-data-[side=top]:translate-y-[0.5px]",
                "group-data-[side=bottom]:-translate-y-[0.5px] group-data-[side=bottom]:-mb-[2px]",
                "group-data-[side=left]:-ml-[2px] group-data-[side=left]:translate-x-[0.5px]",
                "group-data-[side=right]:-translate-x-[0.5px] group-data-[side=right]:-mr-[2px]",
              )}
              fill="currentColor"
              stroke="hsl(var(--border)/0.20)"
              strokeWidth={1}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              shapeRendering="crispEdges"
            />
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    );
  },
);

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -------------------------------------------------------------------------------------------------*/

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
