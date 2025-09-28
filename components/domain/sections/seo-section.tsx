"use client";

import Image from "next/image";
import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CopyButton } from "../copy-button";
import { KeyValue } from "../key-value";
import { Section } from "../section";
import { SECTION_DEFS } from "./sections-meta";

type RobotsGroup = {
  userAgents: string[];
  rules: { type: "allow" | "disallow" | "crawlDelay"; value: string }[];
};

type RobotsTxt = {
  fetched: boolean;
  groups: RobotsGroup[];
  sitemaps: string[];
};

type SeoMeta = {
  openGraph: {
    title?: string;
    description?: string;
    type?: string;
    url?: string;
    siteName?: string;
    images: string[];
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
  };
  general: {
    title?: string;
    description?: string;
    canonical?: string;
    robots?: string;
  };
};

type SeoResponse = {
  meta: SeoMeta | null;
  robots: RobotsTxt | null;
  preview: {
    title: string | null;
    description: string | null;
    image: string | null;
    canonicalUrl: string;
  } | null;
  timestamps: { fetchedAt: string };
  source: { finalUrl: string | null; status: number | null };
  errors?: { html?: string; robots?: string };
};

export function SeoSection({
  data,
  isLoading: _isLoading,
  isError,
  onRetryAction,
}: {
  data?: SeoResponse | null;
  isLoading: boolean;
  isError: boolean;
  onRetryAction: () => void;
}) {
  const Def = SECTION_DEFS.seo;
  const status = isError ? "error" : data ? "ready" : "loading";

  return (
    <Section
      title={Def.title}
      description={Def.description}
      help={Def.help}
      icon={<Def.Icon className="h-4 w-4" />}
      accent={Def.accent}
      status={status}
    >
      {data ? (
        <div className="space-y-4">
          <div className="rounded-xl border bg-background/40 p-3 space-y-2">
            <div className="text-xs mb-1 text-muted-foreground">
              Meta overview
            </div>
            <RawMeta data={data} />
          </div>

          <Separator />

          <Tabs
            defaultValue="x"
            orientation="vertical"
            className="w-full flex-row"
          >
            <TabsList className="flex-col h-auto">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <TabsTrigger value="x" className="py-3">
                        <XLogo width={16} height={16} aria-hidden="true" />
                      </TabsTrigger>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="px-2 py-1 text-xs">
                    X
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <TabsTrigger value="facebook" className="py-3">
                        <FacebookLogo
                          width={16}
                          height={16}
                          aria-hidden="true"
                        />
                      </TabsTrigger>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="px-2 py-1 text-xs">
                    Facebook
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <TabsTrigger value="linkedin" className="py-3">
                        <LinkedinLogo
                          width={16}
                          height={16}
                          aria-hidden="true"
                        />
                      </TabsTrigger>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="px-2 py-1 text-xs">
                    LinkedIn
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <TabsTrigger value="pinterest" className="py-3">
                        <PinterestLogo
                          width={16}
                          height={16}
                          aria-hidden="true"
                        />
                      </TabsTrigger>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="px-2 py-1 text-xs">
                    Pinterest
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TabsList>
            <div className="grow rounded-md border text-start">
              <TabsContent value="x">
                <SocialPreview platform="x" data={data} />
              </TabsContent>
              <TabsContent value="facebook">
                <SocialPreview platform="facebook" data={data} />
              </TabsContent>
              <TabsContent value="linkedin">
                <SocialPreview platform="linkedin" data={data} />
              </TabsContent>
              <TabsContent value="pinterest">
                <SocialPreview platform="pinterest" data={data} />
              </TabsContent>
            </div>
          </Tabs>

          <Separator />

          <RobotsSummary
            robots={data.robots}
            fetchedAt={data.timestamps.fetchedAt}
            finalUrl={data.source.finalUrl}
          />
        </div>
      ) : isError ? (
        <div className="text-sm text-muted-foreground">
          Failed to load SEO analysis.
          <button
            onClick={onRetryAction}
            className="ml-2 underline underline-offset-2"
            type="button"
          >
            Retry
          </button>
        </div>
      ) : (
        <Skeleton className="h-40 w-full" />
      )}
    </Section>
  );
}

function SocialPreview({
  platform,
  data,
}: {
  platform: "x" | "facebook" | "linkedin" | "pinterest";
  data: SeoResponse;
}) {
  const p = data.preview;
  const title = p?.title || "No title";
  const desc = p?.description || "No description";
  const img = p?.image || null;
  const url = p?.canonicalUrl || data.source.finalUrl || "";

  return (
    <div className="rounded-xl border bg-background/40 p-3">
      <div className="text-xs mb-2 text-muted-foreground">
        Preview – {platform.toUpperCase()} (approximate)
      </div>
      <div className="flex gap-3">
        <div className="w-40 h-24 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
          {img ? (
            <Image
              src={img}
              alt="preview"
              width={320}
              height={192}
              className="w-full h-full object-cover rounded"
              unoptimized
            />
          ) : (
            <span>No image</span>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-sm font-medium truncate">{title}</div>
          <div className="text-xs text-muted-foreground line-clamp-2">
            {desc}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {url}
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal Pinterest logo to match icon-only tab triggers
function PinterestLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M10.5 17.5l1-4.5m0 0c2.5 1 5.5-.5 5.5-3s-2-4-4.5-4H11c-1.5 0-2.5 1-2.5 2.5" />
    </svg>
  );
}

// Minimal X (Twitter) glyph
function XLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 4l16 16" />
      <path d="M20 4L4 20" />
    </svg>
  );
}

// Minimal Facebook glyph
function FacebookLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M13 8h2" />
      <path d="M13 8v4h2" />
      <path d="M13 12v8" />
    </svg>
  );
}

// Minimal LinkedIn glyph
function LinkedinLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 11v6" />
      <circle cx="8" cy="8" r="1" />
      <path d="M12 17v-5" />
      <path d="M12 12c1-.8 2.5-.8 3.5 0" />
      <path d="M15.5 12v5" />
    </svg>
  );
}

function RawMeta({ data }: { data: SeoResponse }) {
  const items: { label: string; value?: string | null }[] = [
    { label: "Title", value: data.preview?.title },
    { label: "Description", value: data.preview?.description },
    { label: "Image", value: data.preview?.image },
    { label: "Canonical", value: data.preview?.canonicalUrl },
    { label: "OG Title", value: data.meta?.openGraph.title },
    { label: "OG Description", value: data.meta?.openGraph.description },
    { label: "OG URL", value: data.meta?.openGraph.url },
    { label: "OG Site Name", value: data.meta?.openGraph.siteName },
    { label: "Twitter Title", value: data.meta?.twitter.title },
    { label: "Twitter Description", value: data.meta?.twitter.description },
    { label: "Twitter Image", value: data.meta?.twitter.image },
    { label: "Robots", value: data.meta?.general.robots },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {items.map((it) => (
        <KeyValue
          key={it.label}
          label={it.label}
          value={String(it.value ?? "—")}
        />
      ))}
    </div>
  );
}

function RobotsSummary({
  robots,
  fetchedAt,
  finalUrl,
}: {
  robots: RobotsTxt | null;
  fetchedAt: string;
  finalUrl: string | null;
}) {
  const has = !!robots && robots.fetched && robots.groups.length > 0;
  const disallowCount =
    robots?.groups.reduce(
      (acc, g) => acc + g.rules.filter((r) => r.type === "disallow").length,
      0,
    ) ?? 0;
  const allowCount =
    robots?.groups.reduce(
      (acc, g) => acc + g.rules.filter((r) => r.type === "allow").length,
      0,
    ) ?? 0;

  const link = finalUrl ? new URL("/robots.txt", finalUrl).toString() : null;
  const [query, setQuery] = React.useState("");
  const [only, setOnly] = React.useState<"all" | "allow" | "disallow">("all");

  function rankAgents(agents: string[]): number {
    const joined = agents.join(",").toLowerCase();
    if (agents.includes("*")) return 0;
    if (/googlebot/.test(joined)) return 1;
    return 2;
  }

  return (
    <div className="rounded-xl border bg-background/40 p-3 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-sm font-medium">robots.txt</div>
        <Badge variant={has ? "default" : "secondary"}>
          {has ? "Found" : "Missing"}
        </Badge>
        {link && (
          <a
            className="text-xs underline text-muted-foreground"
            href={link}
            target="_blank"
            rel="noreferrer"
          >
            Open robots.txt
          </a>
        )}
        <div className="ml-auto text-[10px] text-muted-foreground">
          Fetched {new Date(fetchedAt).toLocaleString()}
        </div>
      </div>
      {has ? (
        <>
          <div className="text-xs text-muted-foreground">
            {allowCount} allows, {disallowCount} disallows,{" "}
            {robots?.sitemaps.length ?? 0} sitemaps
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filter rules…"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              className="h-8 w-48"
            />
            <div className="text-xs flex items-center gap-1">
              <button
                type="button"
                className={cn(
                  "px-2 py-1 rounded border",
                  only === "all" ? "bg-muted" : "bg-background",
                )}
                onClick={() => setOnly("all")}
              >
                All
              </button>
              <button
                type="button"
                className={cn(
                  "px-2 py-1 rounded border",
                  only === "allow" ? "bg-muted" : "bg-background",
                )}
                onClick={() => setOnly("allow")}
              >
                Allow
              </button>
              <button
                type="button"
                className={cn(
                  "px-2 py-1 rounded border",
                  only === "disallow" ? "bg-muted" : "bg-background",
                )}
                onClick={() => setOnly("disallow")}
              >
                Disallow
              </button>
            </div>
          </div>
          <Accordion type="multiple" className="space-y-2">
            {(robots?.groups ?? [])
              .slice()
              .sort(
                (a, b) => rankAgents(a.userAgents) - rankAgents(b.userAgents),
              )
              .map((g, idx) => (
                <AccordionItem
                  value={`ua-${idx}`}
                  key={`ua-${g.userAgents.join(",")}-${idx}`}
                >
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {g.userAgents.join(", ")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {g.rules.filter((r) => r.type === "allow").length} allow
                        · {g.rules.filter((r) => r.type === "disallow").length}{" "}
                        disallow
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-1">
                      {g.rules
                        .filter((r) =>
                          only === "all" ? true : r.type === only,
                        )
                        .filter((r) =>
                          query
                            ? r.value
                                .toLowerCase()
                                .includes(query.toLowerCase())
                            : true,
                        )
                        .map((r, i) => (
                          <div
                            key={`r-${r.type}-${r.value}-${i}`}
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs font-mono",
                              r.type === "allow"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                : r.type === "disallow"
                                  ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                                  : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
                            )}
                          >
                            <span className="truncate">
                              <strong className="uppercase">
                                {r.type === "crawlDelay"
                                  ? "crawl-delay"
                                  : r.type}
                              </strong>
                              : {r.value}
                            </span>
                            <CopyButton value={r.value} />
                          </div>
                        ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
          </Accordion>
          {robots?.sitemaps?.length ? (
            <div className="pt-1 space-y-1">
              <div className="text-xs text-muted-foreground">Sitemaps</div>
              <div className="flex flex-col gap-1">
                {robots?.sitemaps.map((u) => (
                  <div
                    key={`sm-${u}`}
                    className="flex items-center justify-between gap-2 rounded border bg-background/40 px-2 py-1"
                  >
                    <a
                      className="text-xs underline truncate"
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {u}
                    </a>
                    <CopyButton value={u} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="text-xs text-muted-foreground">
          No robots.txt discovered.
        </div>
      )}
    </div>
  );
}
