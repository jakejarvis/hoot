"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type HomeHeroProps = {
  words?: string[];
  intervalMs?: number;
  className?: string;
};

export function HomeHero({ intervalMs = 2400, className }: HomeHeroProps) {
  const rotatingWords = [
    "registration",
    "DNS records",
    "hosting",
    "email",
    "certificates",
    "headers",
    "servers",
    "IP addresses",
    "geolocation",
  ];

  const [index, setIndex] = useState(0);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % rotatingWords.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  useLayoutEffect(() => {
    if (!measureRef.current) return;
    const el = measureRef.current;
    const update = () => {
      setMeasuredWidth(el.offsetWidth);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Width updates are driven by ResizeObserver measuring the hidden mirror node

  return (
    <div className={className}>
      <h1 className="w-full flex flex-col items-center sm:flex-row sm:items-baseline justify-center gap-y-2 sm:gap-y-0 text-center text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-none">
        <span className="text-foreground/90 whitespace-nowrap">
          Inspect any domain's
        </span>
        <motion.span
          className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 ml-2.5 rounded-lg sm:rounded-xl bg-muted/70 text-foreground ring-1 ring-border/60 shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur-md"
          aria-live="polite"
          aria-atomic="true"
          initial={false}
          animate={{ width: measuredWidth ?? undefined }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{ willChange: "width", width: measuredWidth ?? undefined }}
        >
          <span className="relative h-[1.15em] overflow-hidden flex w-full items-center whitespace-nowrap">
            <span className="absolute left-1/2 -translate-x-1/2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={rotatingWords[index]}
                  initial={{ y: "100%", opacity: 0, x: 0 }}
                  animate={{ y: 0, opacity: 1, x: 0 }}
                  exit={{ y: "-100%", opacity: 0, x: 0 }}
                  transition={{
                    type: "tween",
                    ease: [0.22, 1, 0.36, 1],
                    duration: 0.5,
                  }}
                  className="will-change-transform inline-block"
                >
                  {rotatingWords[index]}
                </motion.span>
              </AnimatePresence>
            </span>
            {/* in-flow baseline shim so the pill aligns with surrounding text baseline */}
            <span className="invisible select-none">
              {rotatingWords[index]}
            </span>
          </span>
        </motion.span>
        {/* measurement element for smooth width animation (inherits h1 font sizing) */}
        <span
          ref={measureRef}
          className="invisible absolute pointer-events-none inline-flex items-center align-baseline px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl bg-muted/70 text-foreground ring-1 ring-border/60 shadow-sm"
          aria-hidden="true"
        >
          <span className="inline-flex items-center whitespace-nowrap">
            {rotatingWords[index]}
          </span>
        </span>
        .
      </h1>
    </div>
  );
}
