import { waitUntil } from "@vercel/functions";
import { PostHog } from "posthog-node";

let sharedClient: PostHog | null = null;

export function getServerPosthog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  if (!key) return null;
  if (sharedClient) return sharedClient;
  sharedClient = new PostHog(key, {
    host,
    flushAt: 1,
    flushInterval: 0,
  });
  return sharedClient;
}

export async function captureServer(
  event: string,
  properties: Record<string, unknown>,
  distinctId: string = "server",
) {
  const client = getServerPosthog();
  if (!client) return;
  client.capture({ event, distinctId, properties });
  waitUntil(client.shutdown());
}
