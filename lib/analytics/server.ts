import "server-only";

import { waitUntil } from "@vercel/functions";
import { cookies } from "next/headers";
import { PostHog } from "posthog-node";
import { cache } from "react";
import { v4 as uuidv4 } from "uuid";

let sharedClient: PostHog | null = null;

export const getServerPosthog = (): PostHog | null => {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null;
  }

  if (!sharedClient) {
    sharedClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return sharedClient;
};

export const getDistinctId = cache(async (): Promise<string> => {
  let distinctId: string | undefined | null = null;

  const cookieStore = await cookies();
  const phCookie = cookieStore.get(
    `ph_${process.env.NEXT_PUBLIC_POSTHOG_KEY}_posthog`,
  );
  if (phCookie?.value) {
    try {
      const parsed = JSON.parse(decodeURIComponent(phCookie.value));
      if (parsed && typeof parsed.distinct_id === "string") {
        distinctId = parsed.distinct_id;
      }
    } catch {}
  }

  // fallback to distinct uuid
  if (!distinctId) {
    distinctId = uuidv4();
  }

  return distinctId;
});

export const getTraceId = cache(async (): Promise<string> => {
  return uuidv4();
});

export const captureServer = async (
  event: string,
  properties: Record<string, unknown>,
  distinctId?: string,
) => {
  const client = getServerPosthog();
  if (!client) {
    return;
  }

  const envProps = {
    trace_id: await getTraceId(),
    env: process.env.NODE_ENV,
    next_runtime: process.env.NEXT_RUNTIME,
    vercel_region: process.env.VERCEL_REGION,
  } as const;

  const propsToSend = { ...properties };

  const resolvedDistinctId = distinctId || (await getDistinctId());

  client.capture({
    event,
    distinctId: resolvedDistinctId,
    properties: { ...envProps, ...propsToSend },
  });

  // flush events to posthog in background
  waitUntil(client.shutdown());
};

export const captureServerException = async (
  error: Error,
  properties: Record<string, unknown>,
  distinctId?: string,
) => {
  const client = getServerPosthog();
  if (!client) {
    return;
  }

  const envProps = {
    trace_id: await getTraceId(),
    env: process.env.NODE_ENV,
    next_runtime: process.env.NEXT_RUNTIME,
    vercel_region: process.env.VERCEL_REGION,
  } as const;

  const resolvedDistinctId = distinctId || (await getDistinctId());

  client.captureException(error, resolvedDistinctId, {
    ...envProps,
    ...properties,
  });

  // flush events to posthog in background
  waitUntil(client.shutdown());
};
