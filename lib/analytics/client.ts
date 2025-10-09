"use client";

import posthog from "posthog-js";

export const captureClient = (
  event: string,
  properties?: Record<string, unknown>,
) => {
  try {
    posthog.capture(event, { ...(properties || {}) });
  } catch {
    // no-op
  }
};

export const captureClientError = (
  error: Error,
  properties?: Record<string, unknown>,
) => {
  try {
    posthog.captureException(error, {
      ...(properties || {}),
    });
  } catch {
    // no-op
  }
};
