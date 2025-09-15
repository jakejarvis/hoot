import { Globe } from "lucide-react";
import { Favicon } from "./favicon";

export function ProviderLogo({
  name,
  size = 14,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const domain = mapProviderToDomain(name);
  if (!domain) {
    return <Globe className={className} width={size} height={size} />;
  }
  return <Favicon domain={domain} size={size} className={className} />;
}

function mapProviderToDomain(name: string): string | undefined {
  const n = name.toLowerCase();
  // Hosting
  if (n.includes("vercel")) return "vercel.com";
  if (n.includes("netlify")) return "netlify.com";
  if (n.includes("cloudflare")) return "cloudflare.com";
  if (n.includes("digitalocean")) return "digitalocean.com";
  if (n === "aws" || n.includes("amazon web services") || n.includes("amazon"))
    return "aws.amazon.com";
  if (n.includes("github pages")) return "github.com";
  if (n.includes("fly.io")) return "fly.io";
  if (n.includes("akamai")) return "akamai.com";
  if (n.includes("heroku")) return "heroku.com";
  if (n.includes("nginx")) return "nginx.org";
  if (n.includes("wp engine")) return "wpengine.com";
  if (n.includes("wordpress")) return "wordpress.com";

  // Email
  if (n.includes("google workspace") || n.includes("gmail"))
    return "google.com";
  if (n.includes("microsoft 365") || n.includes("office")) return "office.com";
  if (n.includes("fastmail")) return "fastmail.com";
  if (n.includes("zoho")) return "zoho.com";
  if (n.includes("proton")) return "proton.me";

  // Registrars
  if (n.includes("namecheap")) return "namecheap.com";
  if (n.includes("godaddy")) return "godaddy.com";
  if (n.includes("google domains")) return "domains.google";
  if (n.includes("cloudflare registrar")) return "cloudflare.com";
  if (n.includes("markmonitor")) return "markmonitor.com";
  if (n.includes("porkbun")) return "porkbun.com";
  if (n.includes("name.com")) return "name.com";
  if (n.includes("enom")) return "enom.com";
  if (n.includes("hover")) return "hover.com";
  if (n.includes("dynadot")) return "dynadot.com";

  return undefined;
}
