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
  let distinctId: string | undefined;

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

export const captureServer = async (
  event: string,
  properties: Record<string, unknown>,
  distinctId?: string,
) => {
  const client = getServerPosthog();
  if (!client) {
    return;
  }

  client.capture({
    event,
    distinctId: distinctId || (await getDistinctId()) || "server",
    properties,
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

  client.captureException(
    error,
    distinctId || (await getDistinctId()) || "server",
    properties,
  );

  // flush events to posthog in background
  waitUntil(client.shutdown());
};
