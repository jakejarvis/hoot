import "server-only";

import { captureServer } from "@/lib/analytics/server";

export async function DomainSsrAnalytics(props: {
  domain: string;
  canonicalized: boolean;
}) {
  await captureServer("server_render_domain_page", {
    domain: props.domain,
    canonicalized: props.canonicalized,
  });

  return null;
}
