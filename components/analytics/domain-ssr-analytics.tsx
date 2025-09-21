import "server-only";

import { cookies } from "next/headers";
import { captureServer } from "@/server/analytics/posthog";

export async function DomainSsrAnalytics(props: {
  domain: string;
  canonicalized: boolean;
}) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  let distinctId: string | undefined;
  if (key) {
    const cookieStore = await cookies();
    const phCookie = cookieStore.get(`ph_${key}_posthog`);
    if (phCookie?.value) {
      try {
        const parsed = JSON.parse(decodeURIComponent(phCookie.value));
        if (parsed && typeof parsed.distinct_id === "string") {
          distinctId = parsed.distinct_id;
        }
      } catch {}
    }
  }

  await captureServer(
    "server_render_domain_page",
    {
      domain: props.domain,
      canonicalized: props.canonicalized,
    },
    distinctId,
  );

  return null;
}
