"use client";

import posthog from "posthog-js";

export const captureClient = (
  event: string,
  properties?: Record<string, unknown>,
) => {
  try {
    posthog.capture(event, properties);
  } catch {
    // no-op
  }
};
