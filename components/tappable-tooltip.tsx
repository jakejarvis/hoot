"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Popover as PopoverPrimitive, Slot as SlotPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

function setRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.MutableRefObject<T | null>).current = value;
}

// Consistent delay used when scheduling hover-based open/close
const OPEN_DELAY_MS = 200;
const CLOSE_DELAY_MS = 400;
// Radius around the trigger that doesn't close the tooltip
const TOUCH_CLOSE_RADIUS = 64;

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -------------------------------------------------------------------------------------------------*/

type ProviderCtx = {
  delayDuration: number;
  touchCloseRadius: number; // px
};

const Ctx = React.createContext<ProviderCtx | null>(null);

function TooltipProvider({
  children,
  delayDuration = OPEN_DELAY_MS,
  touchCloseRadius = TOUCH_CLOSE_RADIUS,
}: React.PropsWithChildren<Partial<ProviderCtx>>) {
  const value = React.useMemo(
    () => ({ delayDuration, touchCloseRadius }),
    [delayDuration, touchCloseRadius],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
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
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState<boolean>(
    !!defaultOpen,
  );
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? !!controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: SetOpenArg) => {
      const value =
        typeof next === "function"
          ? (next as (p: boolean) => boolean)(open)
          : next;
      if (!isControlled) setUncontrolledOpen(value);
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange, open],
  );

  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const hoverCloseTimerRef = React.useRef<number | null>(null);
  const describedById = React.useId();

  const ctx = React.useMemo<RootCtx>(
    () => ({
      open,
      setOpen,
      triggerRef,
      contentRef,
      hoverCloseTimerRef,
      describedById,
      disableHoverableContent,
    }),
    [open, setOpen, disableHoverableContent, describedById],
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
  TriggerEventOverrides & {
    asChild?: boolean;
  };

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
      contentRef,
      hoverCloseTimerRef,
      disableHoverableContent,
    } = useTooltipCtx();

    // while cursor is in the small gap, watch for it entering the content
    const moveListenerRef = React.useRef<((e: PointerEvent) => void) | null>(
      null,
    );
    const removeMoveListener = React.useCallback(() => {
      if (moveListenerRef.current) {
        document.removeEventListener(
          "pointermove",
          moveListenerRef.current,
          true,
        );
        moveListenerRef.current = null;
      }
    }, []);

    const cancelClose = React.useCallback(() => {
      if (hoverCloseTimerRef.current) {
        window.clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
      }
      removeMoveListener();
    }, [hoverCloseTimerRef, removeMoveListener]);

    const scheduleClose = React.useCallback(() => {
      cancelClose();
      hoverCloseTimerRef.current = window.setTimeout(() => {
        removeMoveListener();
        setOpen(false);
      }, CLOSE_DELAY_MS);
    }, [cancelClose, hoverCloseTimerRef, removeMoveListener, setOpen]);

    const provider = React.useContext(Ctx) ?? {
      delayDuration: OPEN_DELAY_MS,
      touchCloseRadius: TOUCH_CLOSE_RADIUS,
    };

    const hoverTimer = React.useRef<number | null>(null);
    const clearHover = () => {
      if (hoverTimer.current) {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
    };

    // Ensure any listeners/timeouts are cleared on unmount
    // biome-ignore lint/correctness/useExhaustiveDependencies: unmount-only cleanup should not re-run on deps
    React.useEffect(() => {
      return () => {
        removeMoveListener();
        clearHover();
        if (hoverCloseTimerRef.current) {
          window.clearTimeout(hoverCloseTimerRef.current);
          hoverCloseTimerRef.current = null;
        }
      };
    }, []);

    const ref = (node: HTMLElement | null) => {
      triggerRef.current = node;
      setRef(forwardedRef, node);
    };

    const Comp: React.ElementType = asChild
      ? (SlotPrimitive.Slot as React.ElementType)
      : "button";

    return (
      <PopoverPrimitive.Trigger asChild>
        <Comp
          ref={ref}
          type={asChild ? type : (type ?? "button")}
          onPointerEnter={(e: React.PointerEvent<HTMLElement>) => {
            onPointerEnter?.(e);
            if (e.pointerType === "mouse") {
              clearHover();
              cancelClose();
              hoverTimer.current = window.setTimeout(
                () => setOpen(true),
                provider.delayDuration,
              );
            }
          }}
          onPointerLeave={(e: React.PointerEvent<HTMLElement>) => {
            onPointerLeave?.(e);
            if (e.pointerType === "mouse") {
              clearHover();
              if (disableHoverableContent) {
                setOpen(false);
                return;
              }
              // If moving into the tooltip, don't close; otherwise schedule a close.
              const rt = e.relatedTarget as Node | null;
              const intoContent = !!(
                rt &&
                contentRef.current &&
                contentRef.current.contains(rt)
              );
              if (!intoContent) {
                // gap case: start watching for the cursor to enter the content
                if (!moveListenerRef.current) {
                  moveListenerRef.current = (pe: PointerEvent) => {
                    const node = contentRef.current;
                    if (node?.contains(pe.target as Node)) {
                      cancelClose(); // reached the content/bridge → keep open
                      removeMoveListener();
                    }
                  };
                  document.addEventListener(
                    "pointermove",
                    moveListenerRef.current,
                    true,
                  );
                }
                scheduleClose();
              }
            }
          }}
          onFocus={(e: React.FocusEvent<HTMLElement, Element>) => {
            onFocus?.(e);
            setOpen(true);
          }}
          onBlur={(e: React.FocusEvent<HTMLElement, Element>) => {
            onBlur?.(e);
            setOpen(false);
          }}
          onPointerDown={(e: React.PointerEvent<HTMLElement>) => {
            onPointerDown?.(e);
            // Prevent any pending hover opens or scheduled closes from racing with press
            clearHover();
            cancelClose();
            if (e.pointerType === "touch" || e.pointerType === "pen") {
              setOpen((p) => !p);
            }
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
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
 * Content (Popover-backed, Framer Motion)
 * -------------------------------------------------------------------------------------------------*/

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

type TooltipContentProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  | "onAnimationStart" // Motion has different types; leave these to motion
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
  /** If side is left/right and horizontal space is tight, auto-switch to top/bottom. */
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
      alignOffset = 0, // API parity
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
      describedById,
      disableHoverableContent,
      hoverCloseTimerRef,
    } = useTooltipCtx();
    const [isTransitioning, setIsTransitioning] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);
    const provider = React.useContext(Ctx) ?? {
      delayDuration: OPEN_DELAY_MS,
      touchCloseRadius: TOUCH_CLOSE_RADIUS,
    };

    // Resolve side with optional left/right → top/bottom axis fallback
    const [resolvedSide, setResolvedSide] = React.useState<Side>(side);
    React.useEffect(() => {
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

    // aria-describedby wiring (tooltip pattern)
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

    // Close on scroll/resize
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

    const shouldReduce = useReducedMotion();

    // Direction-aware translation for the enter
    const delta =
      resolvedSide === "top"
        ? { y: 6 }
        : resolvedSide === "bottom"
          ? { y: -6 }
          : resolvedSide === "left"
            ? { x: 6 }
            : { x: -6 };

    const variants = {
      hidden: {
        opacity: 0,
        ...(shouldReduce ? {} : { ...delta, scale: 0.96 }),
      },
      visible: { opacity: 1, x: 0, y: 0, scale: 1 },
    } as const;

    // width/height of the invisible hover bridge that extends toward the trigger
    const bridgeSize = Math.max(
      24,
      (typeof sideOffset === "number" ? sideOffset : 0) + 12,
    );

    return (
      <PopoverPrimitive.Portal forceMount>
        <AnimatePresence initial={false}>
          {open && (
            <PopoverPrimitive.Content
              // do NOT asChild here; keep this node static for Floating UI to measure.
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
              onOpenAutoFocus={(e) => e.preventDefault()} // keep focus on trigger
              onPointerEnter={() => {
                // moving into the tooltip — keep it open
                if (!disableHoverableContent) {
                  setIsHovered(true);
                  // cancel any pending close from leaving the trigger
                  if (hoverCloseTimerRef.current) {
                    window.clearTimeout(hoverCloseTimerRef.current);
                    hoverCloseTimerRef.current = null;
                  }
                }
              }}
              onPointerLeave={(e) => {
                if (disableHoverableContent) return;
                setIsHovered(false);
                // leaving the tooltip: if not going back to the trigger, schedule a close
                const rt = e.relatedTarget as Node | null;
                const intoTrigger = !!(
                  rt &&
                  triggerRef.current &&
                  triggerRef.current.contains(rt)
                );
                if (!intoTrigger) {
                  if (hoverCloseTimerRef.current)
                    window.clearTimeout(hoverCloseTimerRef.current);
                  hoverCloseTimerRef.current = window.setTimeout(
                    () => setOpen(false),
                    CLOSE_DELAY_MS,
                  );
                }
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
                  provider.touchCloseRadius
                ) {
                  e.preventDefault();
                }
              }}
              // Content is just a positioned shell; styles live on the inner motion wrapper.
              className="pointer-events-auto relative z-50 m-0 border-0 bg-transparent p-0 shadow-none outline-none"
              role="tooltip"
              id={describedById}
              data-side={resolvedSide}
              data-slot="tooltip-content"
              {...rest}
            >
              <motion.div
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={variants}
                onAnimationStart={() => setIsTransitioning(true)}
                onAnimationComplete={() => setIsTransitioning(false)}
                transition={
                  shouldReduce
                    ? { duration: 0.12 }
                    : { duration: 0.16, ease: "easeOut" }
                }
                style={{
                  transformOrigin:
                    "var(--radix-popover-content-transform-origin)",
                  maxWidth: "min(90vw, 320px)",
                  ...style,
                }}
                className={cn(
                  "overflow-visible",
                  "z-50 rounded-md bg-foreground px-3 py-1.5 text-background text-xs shadow-md",
                  // Instead of a CSS border on the bubble + arrow combo, use stroke on the arrow and/or drop-shadow for the outline
                  "whitespace-normal text-pretty break-words",
                  className,
                )}
              >
                {children}
                <span
                  aria-hidden
                  className="absolute block"
                  style={{
                    pointerEvents:
                      isTransitioning || isHovered ? "auto" : "none",
                    // invisible hover bridge, fills the tiny gap toward the trigger
                    ...(resolvedSide === "top" && {
                      left: 0,
                      right: 0,
                      height: bridgeSize,
                      bottom: -bridgeSize,
                    }),
                    ...(resolvedSide === "bottom" && {
                      left: 0,
                      right: 0,
                      height: bridgeSize,
                      top: -bridgeSize,
                    }),
                    ...(resolvedSide === "left" && {
                      top: 0,
                      bottom: 0,
                      width: bridgeSize,
                      right: -bridgeSize,
                    }),
                    ...(resolvedSide === "right" && {
                      top: 0,
                      bottom: 0,
                      width: bridgeSize,
                      left: -bridgeSize,
                    }),
                  }}
                />
                {withArrow && (
                  <PopoverPrimitive.Arrow
                    width={12}
                    height={8}
                    className={cn(
                      "pointer-events-none text-foreground [paint-order:stroke]",
                      // tiny pixel snap to avoid half-pixel placement at some zooms
                      resolvedSide === "top" && "-mt-[2px] translate-y-[0.5px]",
                      resolvedSide === "bottom" &&
                        "-translate-y-[0.5px] -mb-[2px]",
                      resolvedSide === "left" &&
                        "-ml-[2px] translate-x-[0.5px]",
                      resolvedSide === "right" &&
                        "-translate-x-[0.5px] -mr-[2px]",
                    )}
                    fill="currentColor"
                    stroke="hsl(var(--border)/0.20)"
                    strokeWidth={1}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    shapeRendering="crispEdges"
                  />
                )}
              </motion.div>
            </PopoverPrimitive.Content>
          )}
        </AnimatePresence>
      </PopoverPrimitive.Portal>
    );
  },
);

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
