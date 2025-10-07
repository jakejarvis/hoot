"use client";

import { ChevronRight } from "lucide-react";
import * as React from "react";
import {
  DiscordIcon,
  FacebookIcon,
  LinkedinIcon,
  SlackIcon,
  TwitterIcon,
} from "@/components/brand-icons";
import { CopyButton } from "@/components/domain/copy-button";
import { KeyValue } from "@/components/domain/key-value";
import { Section } from "@/components/domain/section";
import { SocialPreview } from "@/components/social-preview";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SeoResponse, SocialPreviewProvider } from "@/lib/schemas";
import { SECTION_DEFS } from "@/lib/sections-meta";
import { cn } from "@/lib/utils";

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
  const metaTagValues: { label: string; value?: string | null }[] = [
    { label: "Title", value: data?.preview?.title },
    { label: "Description", value: data?.preview?.description },
    { label: "Canonical", value: data?.preview?.canonicalUrl },
    { label: "Image", value: data?.preview?.image },
    { label: "Robots", value: data?.meta?.general.robots },
  ];

  // Decide which X (Twitter) card variant to display based on meta tags.
  const twitterCard = data?.meta?.twitter?.card?.toLowerCase();
  const xVariant: "compact" | "large" =
    twitterCard === "summary_large_image"
      ? "large"
      : twitterCard === "summary"
        ? "compact"
        : data?.preview?.image
          ? "large"
          : "compact";

  // Single SocialPreview approach: control the active tab and render one preview.
  const [selectedTab, setSelectedTab] =
    React.useState<SocialPreviewProvider>("twitter");

  return (
    <Section {...SECTION_DEFS.seo} isError={isError} isLoading={isLoading}>
      {data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {metaTagValues
              .filter((t) => t.value != null)
              .map((t) => (
                <KeyValue
                  key={t.label}
                  label={t.label}
                  value={String(t.value)}
                />
              ))}
          </div>

          <Separator />

          <Tabs
            value={selectedTab}
            onValueChange={(v) => setSelectedTab(v as typeof selectedTab)}
          >
            <TabsList className="h-auto w-full gap-1 border border-muted-foreground/15 md:justify-start">
              <TabsTrigger value="twitter" className="h-9 flex-1 px-2 py-1.5">
                <TwitterIcon
                  className="md:!h-3.5 md:!w-3.5 h-4 w-4"
                  aria-hidden="true"
                />
                <span className="hidden text-[13px] md:inline">Twitter</span>
              </TabsTrigger>
              <TabsTrigger value="facebook" className="h-9 flex-1 px-2 py-1.5">
                <FacebookIcon
                  className="md:!h-3.5 md:!w-3.5 h-4 w-4"
                  aria-hidden="true"
                />
                <span className="hidden text-[13px] md:inline">Facebook</span>
              </TabsTrigger>
              <TabsTrigger value="linkedin" className="h-9 flex-1 px-2 py-1.5">
                <LinkedinIcon
                  className="md:!h-3.5 md:!w-3.5 h-4 w-4"
                  aria-hidden="true"
                />
                <span className="hidden text-[13px] md:inline">LinkedIn</span>
              </TabsTrigger>
              <TabsTrigger value="discord" className="h-9 flex-1 px-2 py-1.5">
                <DiscordIcon
                  className="md:!h-3.5 md:!w-3.5 h-4 w-4"
                  aria-hidden="true"
                />
                <span className="hidden text-[13px] md:inline">Discord</span>
              </TabsTrigger>
              <TabsTrigger value="slack" className="h-9 flex-1 px-2 py-1.5">
                <SlackIcon
                  className="md:!h-3.5 md:!w-3.5 h-4 w-4"
                  aria-hidden="true"
                />
                <span className="hidden text-[13px] md:inline">Slack</span>
              </TabsTrigger>
            </TabsList>
            <div className="mx-auto w-full max-w-[480px] md:max-w-[640px]">
              <TabsContent
                value={selectedTab}
                className="grid place-items-center"
              >
                {data?.preview ? (
                  <SocialPreview
                    provider={selectedTab}
                    title={data.preview.title}
                    description={data.preview.description}
                    image={data.preview.image}
                    url={data.preview.canonicalUrl}
                    variant={selectedTab === "twitter" ? xVariant : undefined}
                  />
                ) : null}
              </TabsContent>
            </div>
          </Tabs>

          <Separator />

          <RobotsSummary
            robots={data.robots}
            finalUrl={data.source.finalUrl}
            onRetryAction={onRetryAction}
          />
        </div>
      ) : isError ? (
        <div className="text-muted-foreground text-sm">
          Failed to load SEO analysis.
          <button
            onClick={onRetryAction}
            className="ml-2 underline underline-offset-2"
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}
    </Section>
  );
}

function RobotsSummary({
  robots,
  finalUrl,
  onRetryAction,
}: {
  robots: SeoResponse["robots"];
  finalUrl: string | null;
  onRetryAction: () => void;
}) {
  const has = !!robots && robots.fetched && robots.groups.length > 0;

  const counts = React.useMemo(() => {
    const disallows =
      robots?.groups.reduce(
        (acc, g) => acc + g.rules.filter((r) => r.type === "disallow").length,
        0,
      ) ?? 0;
    const allows =
      robots?.groups.reduce(
        (acc, g) => acc + g.rules.filter((r) => r.type === "allow").length,
        0,
      ) ?? 0;
    return { allows, disallows };
  }, [robots]);

  const link = finalUrl ? new URL("/robots.txt", finalUrl).toString() : null;
  const [query, setQuery] = React.useState("");
  const [only, setOnly] = React.useState<"all" | "allow" | "disallow">("all");

  const rankAgents = React.useCallback((agents: string[]): number => {
    const joined = agents.join(",").toLowerCase();
    if (agents.includes("*")) return 0;
    if (/googlebot/.test(joined)) return 1;
    return 2;
  }, []);

  function highlight(text: string, q: string) {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (
      <>
        {before}
        <span className="bg-yellow-500/30 dark:bg-yellow-400/30">{match}</span>
        {after}
      </>
    );
  }

  const filteredGroups = React.useMemo(() => {
    const base = robots?.groups?.slice() ?? [];
    const sorted = base.sort(
      (a, b) => rankAgents(a.userAgents) - rankAgents(b.userAgents),
    );
    return sorted.map((g) => ({
      ...g,
      rules: g.rules
        .filter((r) => (only === "all" ? true : r.type === only))
        .filter((r) =>
          query ? r.value.toLowerCase().includes(query.toLowerCase()) : true,
        ),
    }));
  }, [robots, only, query, rankAgents]);

  const hasFilteredRules = filteredGroups.some((g) => g.rules.length > 0);

  return (
    <div className="space-y-3 rounded-xl border bg-background/40 p-3">
      <div className="mb-0.5 flex items-center gap-2">
        {link ? (
          <a
            className="font-medium text-sm underline-offset-4 hover:underline"
            href={link}
            target="_blank"
            rel="noreferrer"
          >
            robots.txt
          </a>
        ) : (
          <div className="font-medium text-sm">robots.txt</div>
        )}
        <Badge variant={has ? "default" : "secondary"}>
          {has ? "Found" : "Missing"}
        </Badge>
      </div>

      {has ? (
        <>
          {/* counts removed per design feedback */}

          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Filter rules or sitemaps…"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              className="h-8 w-56"
              aria-label="Filter robots rules"
            />
            {query ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => setQuery("")}
              >
                Clear
              </Button>
            ) : null}
            <ButtonGroup className="text-xs">
              <Button
                type="button"
                variant={only === "all" ? "outline" : "ghost"}
                size="sm"
                aria-pressed={only === "all"}
                onClick={() => setOnly("all")}
              >
                All
              </Button>
              <Button
                type="button"
                variant={only === "allow" ? "outline" : "ghost"}
                size="sm"
                aria-pressed={only === "allow"}
                onClick={() => setOnly("allow")}
              >
                Allow ({counts.allows})
              </Button>
              <Button
                type="button"
                variant={only === "disallow" ? "outline" : "ghost"}
                size="sm"
                aria-pressed={only === "disallow"}
                onClick={() => setOnly("disallow")}
              >
                Disallow ({counts.disallows})
              </Button>
            </ButtonGroup>
          </div>

          {!hasFilteredRules ? (
            <div className="text-muted-foreground text-xs">
              No matching rules.
              <Button
                type="button"
                variant="link"
                className="px-1"
                onClick={() => {
                  setQuery("");
                  setOnly("all");
                }}
              >
                Reset filters
              </Button>
            </div>
          ) : null}

          <GroupsAccordion
            groups={filteredGroups}
            query={query}
            highlight={highlight}
          />

          {robots?.sitemaps?.length ? (
            <SitemapsList items={robots.sitemaps} query={query} />
          ) : null}
        </>
      ) : (
        <div className="text-muted-foreground text-xs">
          No robots.txt discovered.
          <button
            className="ml-2 underline underline-offset-2"
            type="button"
            onClick={onRetryAction}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

function GroupsAccordion({
  groups,
  query,
  highlight,
}: {
  groups: {
    userAgents: string[];
    rules: { type: "allow" | "disallow" | "crawlDelay"; value: string }[];
  }[];
  query: string;
  highlight: (text: string, q: string) => React.ReactNode;
}) {
  const defaultIdx = React.useMemo(
    () => groups.findIndex((g) => g.userAgents.includes("*")),
    [groups],
  );
  const defaultValue = defaultIdx >= 0 ? `g-${defaultIdx}` : undefined;
  return (
    <Accordion type="single" collapsible defaultValue={defaultValue}>
      {groups.map((g, idx) => {
        const allowN = g.rules.filter((r) => r.type === "allow").length;
        const disallowN = g.rules.filter((r) => r.type === "disallow").length;
        // neutral group styling, no left accent color
        return (
          <AccordionItem
            key={`g-${g.userAgents.join(",")}-${allowN}-${disallowN}`}
            value={`g-${idx}`}
            className={cn(
              "my-1 rounded-md border border-input bg-background/30",
            )}
          >
            <AccordionTrigger className="group/acc px-2 py-2 hover:no-underline [&>svg]:hidden">
              <div className="flex w-full items-center justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                  <ChevronRight className="size-3 text-muted-foreground transition-transform group-data-[state=open]/acc:rotate-90" />
                  {g.userAgents.map((ua) => (
                    <span
                      key={ua}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px]"
                    >
                      {ua}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {allowN} allow · {disallowN} disallow
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-0">
              <GroupContent
                rules={g.rules}
                query={query}
                highlight={highlight}
              />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function GroupContent({
  rules,
  query,
  highlight,
}: {
  rules: { type: "allow" | "disallow" | "crawlDelay"; value: string }[];
  query: string;
  highlight: (text: string, q: string) => React.ReactNode;
}) {
  const [visible, setVisible] = React.useState(6);
  const total = rules.length;
  const show = rules.slice(0, visible);
  const more = total - visible;
  return (
    <div className="flex flex-col gap-1 p-2">
      {show.map((r, i) => (
        <RuleRow
          key={`r-${r.type}-${r.value}-${i}`}
          rule={r}
          query={query}
          highlight={highlight}
        />
      ))}
      {more > 0 ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="self-start text-xs"
          onClick={() => setVisible((v) => v + 6)}
        >
          Show {more > 6 ? 6 : more} more
        </Button>
      ) : null}
    </div>
  );
}

function RuleRow({
  rule,
  query,
  highlight,
}: {
  rule: { type: "allow" | "disallow" | "crawlDelay"; value: string };
  query: string;
  highlight: (text: string, q: string) => React.ReactNode;
}) {
  const dot =
    rule.type === "allow"
      ? "bg-emerald-500"
      : rule.type === "disallow"
        ? "bg-rose-500"
        : "bg-amber-500";
  return (
    <div className="group flex items-center gap-3 rounded-md border border-input px-2 py-1 font-mono text-xs">
      <span
        className={cn("inline-block size-1.5 rounded-full", dot)}
        aria-hidden="true"
      />
      <span className="truncate">{highlight(rule.value, query)}</span>
    </div>
  );
}

function SitemapsList({ items, query }: { items: string[]; query: string }) {
  const [visible, setVisible] = React.useState(2);
  const filtered = React.useMemo(
    () =>
      items.filter((u) =>
        query ? u.toLowerCase().includes(query.toLowerCase()) : true,
      ),
    [items, query],
  );
  const total = filtered.length;
  const show = filtered.slice(0, visible);
  const more = total - visible;
  return (
    <div className="space-y-1 pt-1">
      <div className="text-muted-foreground text-xs">Sitemaps</div>
      <div className="flex flex-col gap-1">
        {show.map((u) => (
          <div
            key={`sm-${u}`}
            className="flex items-center justify-between gap-2 rounded border bg-background/40 px-2 py-1"
          >
            <a
              className="truncate text-xs underline"
              href={u}
              target="_blank"
              rel="noreferrer"
            >
              {u}
            </a>
            <CopyButton value={u} />
          </div>
        ))}
        {more > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="self-start text-xs"
            onClick={() => setVisible((v) => v + 4)}
          >
            Show {more > 4 ? 4 : more} more
          </Button>
        ) : null}
      </div>
    </div>
  );
}
