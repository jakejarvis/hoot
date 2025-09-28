"use client";

import * as React from "react";
import {
  DiscordIcon,
  FacebookIcon,
  LinkedinIcon,
  SlackIcon,
  TwitterIcon,
} from "@/components/brand-icons";
import { SocialPreview } from "@/components/social-preview";
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
  isLoading,
  isError,
  onRetryAction,
}: {
  data?: SeoResponse | null;
  isLoading: boolean;
  isError: boolean;
  onRetryAction: () => void;
}) {
  const Def = SECTION_DEFS.seo;

  const metaTagValues: { label: string; value?: string | null }[] = [
    { label: "Title", value: data?.preview?.title },
    { label: "Description", value: data?.preview?.description },
    { label: "Canonical", value: data?.preview?.canonicalUrl },
    { label: "Image", value: data?.preview?.image },
    { label: "Robots", value: data?.meta?.general.robots },
  ];

  return (
    <Section
      title={Def.title}
      description={Def.description}
      help={Def.help}
      icon={<Def.Icon className="h-4 w-4" />}
      accent={Def.accent}
      isLoading={isLoading}
      isError={isError}
    >
      {data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {metaTagValues
              .filter((tag) => tag.value != null)
              .map((tag) => (
                <KeyValue
                  key={tag.label}
                  label={tag.label}
                  value={String(tag.value)}
                />
              ))}
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
                        <TwitterIcon className="h-4 w-4" aria-hidden="true" />
                      </TabsTrigger>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="px-2 py-1 text-xs">
                    X (Twitter)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <TabsTrigger value="slack" className="py-3">
                        <SlackIcon className="h-4 w-4" aria-hidden="true" />
                      </TabsTrigger>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="px-2 py-1 text-xs">
                    Slack
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <TabsTrigger value="facebook" className="py-3">
                        <FacebookIcon className="h-4 w-4" aria-hidden="true" />
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
                        <LinkedinIcon className="h-4 w-4" aria-hidden="true" />
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
                      <TabsTrigger value="discord" className="py-3">
                        <DiscordIcon className="h-4 w-4" aria-hidden="true" />
                      </TabsTrigger>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="px-2 py-1 text-xs">
                    Discord
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TabsList>
            <div className="grow text-start">
              <TabsContent value="x">
                {data?.preview ? (
                  <div className="space-y-3">
                    <SocialPreview
                      provider="x"
                      title={data.preview.title ?? "No title"}
                      description={data.preview.description ?? "No description"}
                      image={data.preview.image}
                      url={data.preview.canonicalUrl}
                      variant="large"
                    />
                    <SocialPreview
                      provider="x"
                      title={data.preview.title ?? "No title"}
                      description={data.preview.description ?? "No description"}
                      image={data.preview.image}
                      url={data.preview.canonicalUrl}
                      variant="compact"
                    />
                  </div>
                ) : null}
              </TabsContent>
              <TabsContent value="slack">
                {data?.preview ? (
                  <SocialPreview
                    provider="slack"
                    title={data.preview.title ?? "No title"}
                    description={data.preview.description ?? "No description"}
                    image={data.preview.image}
                    url={data.preview.canonicalUrl}
                  />
                ) : null}
              </TabsContent>
              <TabsContent value="facebook">
                {data?.preview ? (
                  <SocialPreview
                    provider="facebook"
                    title={data.preview.title ?? "No title"}
                    description={data.preview.description ?? "No description"}
                    image={data.preview.image}
                    url={data.preview.canonicalUrl}
                  />
                ) : null}
              </TabsContent>
              <TabsContent value="linkedin">
                {data?.preview ? (
                  <SocialPreview
                    provider="linkedin"
                    title={data.preview.title ?? "No title"}
                    description={data.preview.description ?? "No description"}
                    image={data.preview.image}
                    url={data.preview.canonicalUrl}
                  />
                ) : null}
              </TabsContent>
              <TabsContent value="discord">
                {data?.preview ? (
                  <SocialPreview
                    provider="discord"
                    title={data.preview.title ?? "No title"}
                    description={data.preview.description ?? "No description"}
                    image={data.preview.image}
                    url={data.preview.canonicalUrl}
                  />
                ) : null}
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
