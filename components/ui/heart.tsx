"use client";

import { motion, type SVGMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

interface HeartIconProps extends SVGMotionProps<SVGSVGElement> {
  size?: number;
}

export const HeartAnimated = ({
  className,
  size = 28,
  ...props
}: HeartIconProps) => {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ scale: [1, 1.08, 1] }}
      transition={{
        duration: 0.45,
        repeat: 2,
      }}
      className={cn(className)}
      {...props}
    >
      <title>Heart</title>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </motion.svg>
  );
};
