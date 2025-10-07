"use client";

import { ChevronRight, ExternalLink, Filter, Plus, X } from "lucide-react";
import { motion } from "motion/react";
import * as React from "react";
import {
  DiscordIcon,
  FacebookIcon,
  LinkedinIcon,
  SlackIcon,
  TwitterIcon,
} from "@/components/brand-icons";
import { KeyValue } from "@/components/domain/key-value";
import { Section } from "@/components/domain/section";
import { SocialPreview } from "@/components/social-preview";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@/components/ui/button-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
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
          <div className="space-y-3">
            <div className="text-[11px] text-foreground/70 uppercase tracking-[0.08em] dark:text-foreground/80">
              Meta Tags
            </div>
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
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="text-[11px] text-foreground/70 uppercase tracking-[0.08em] dark:text-foreground/80">
              Social Previews
            </div>
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
                <TabsTrigger
                  value="facebook"
                  className="h-9 flex-1 px-2 py-1.5"
                >
                  <FacebookIcon
                    className="md:!h-3.5 md:!w-3.5 h-4 w-4"
                    aria-hidden="true"
                  />
                  <span className="hidden text-[13px] md:inline">Facebook</span>
                </TabsTrigger>
                <TabsTrigger
                  value="linkedin"
                  className="h-9 flex-1 px-2 py-1.5"
                >
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
          </div>

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
  const displayGroups = React.useMemo(
    () =>
      query ? filteredGroups.filter((g) => g.rules.length > 0) : filteredGroups,
    [filteredGroups, query],
  );

  return (
    <div className="space-y-4 rounded-xl">
      <div className="mt-5 text-[11px] text-foreground/70 uppercase tracking-[0.08em] dark:text-foreground/80">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 leading-none"
          >
            robots.txt
            <ExternalLink className="size-3" />
          </a>
        ) : (
          <span>robots.txt</span>
        )}
      </div>

      {has ? (
        <div className="space-y-4">
          <div className="flex flex-row items-center gap-2">
            <InputGroup>
              <InputGroupInput
                placeholder="Filter rules or sitemaps…"
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                aria-label="Filter robots rules"
              />
              <InputGroupAddon>
                <Filter />
              </InputGroupAddon>
              {query ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setQuery("")}
                  >
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
            <ButtonGroup>
              <Button
                type="button"
                variant={only === "all" ? "outline" : "ghost"}
                size="sm"
                aria-pressed={only === "all"}
                onClick={() => setOnly("all")}
                className="text-[13px]"
              >
                All
              </Button>
              <ButtonGroupSeparator />
              <Button
                type="button"
                variant={only === "allow" ? "outline" : "ghost"}
                size="sm"
                aria-pressed={only === "allow"}
                onClick={() => setOnly("allow")}
                className="text-[13px]"
              >
                Allow ({counts.allows})
              </Button>
              <ButtonGroupSeparator />
              <Button
                type="button"
                variant={only === "disallow" ? "outline" : "ghost"}
                size="sm"
                aria-pressed={only === "disallow"}
                onClick={() => setOnly("disallow")}
                className="text-[13px]"
              >
                Disallow ({counts.disallows})
              </Button>
            </ButtonGroup>
          </div>

          {!hasFilteredRules ? (
            <div className="text-muted-foreground text-sm">
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
            groups={displayGroups}
            query={query}
            highlight={highlight}
          />

          {robots?.sitemaps?.length ? (
            <>
              <Separator />
              <SitemapsList items={robots.sitemaps} query={query} />
            </>
          ) : null}
        </div>
      ) : (
        <div className="text-muted-foreground text-sm">
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
              "my-1 rounded-lg border border-input bg-background/30 last:border",
            )}
          >
            <AccordionTrigger className="group/acc px-2 py-2 hover:no-underline [&>svg]:hidden">
              <div className="flex w-full items-center justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                  <ChevronRight className="size-3 text-muted-foreground transition-transform group-data-[state=open]/acc:rotate-90" />
                  {g.userAgents.map((ua) => (
                    <span
                      key={ua}
                      className="rounded bg-muted px-1.5 py-0.5 text-xs"
                    >
                      {ua}
                    </span>
                  ))}
                </div>
                <div className="text-muted-foreground text-xs">
                  {allowN} allow · {disallowN} disallow
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-0">
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
  const more = total - visible;
  const prevVisibleRef = React.useRef(visible);
  const prev = Math.min(prevVisibleRef.current, visible);
  const existing = rules.slice(0, prev);
  const added = rules.slice(prev, Math.min(visible, total));
  React.useEffect(() => {
    // When rules change significantly, sync the previous visible count
    prevVisibleRef.current = Math.min(visible, rules.length);
  }, [visible, rules]);
  return (
    <div className="flex flex-col gap-1 p-2">
      {existing.map((r, i) => (
        <RuleRow
          key={`r-${r.type}-${r.value}-existing-${i}`}
          rule={r}
          query={query}
          highlight={highlight}
        />
      ))}
      {added.length > 0 ? (
        <motion.div
          key={`added-${visible}`}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{ overflow: "hidden" }}
          className="flex flex-col gap-1"
        >
          {added.map((r, i) => (
            <RuleRow
              key={`r-${r.type}-${r.value}-added-${i}`}
              rule={r}
              query={query}
              highlight={highlight}
            />
          ))}
        </motion.div>
      ) : null}
      {more > 0 ? (
        <div className="my-4 flex justify-center">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-2 px-3 text-[13px]"
            onClick={() => setVisible(total)}
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span>Show {more} more</span>
          </Button>
        </div>
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
    <div className="group flex items-center gap-3 rounded-lg border border-input px-2 py-1 font-mono text-xs">
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
  const more = total - visible;
  const prevVisibleRef = React.useRef(visible);
  const prev = Math.min(prevVisibleRef.current, visible);
  const existing = filtered.slice(0, prev);
  const added = filtered.slice(prev, Math.min(visible, total));
  React.useEffect(() => {
    prevVisibleRef.current = Math.min(visible, filtered.length);
  }, [visible, filtered]);
  return (
    <div className="space-y-3">
      <div className="mt-5 text-[11px] text-foreground/70 uppercase tracking-[0.08em] dark:text-foreground/80">
        Sitemaps
      </div>
      <div className="flex flex-col gap-1">
        {existing.map((u) => (
          <div
            key={`sm-ex-${u}`}
            className="flex h-10 items-center rounded-lg border bg-background/40 px-2 py-1"
          >
            <a
              className="flex items-center gap-1.5 truncate text-foreground/85 text-xs hover:text-foreground/60 hover:no-underline"
              href={u}
              target="_blank"
              rel="noreferrer"
            >
              {u}
              <ExternalLink className="size-3" />
            </a>
          </div>
        ))}
        {added.length > 0 ? (
          <motion.div
            key={`sitemaps-added-${visible}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
            className="flex flex-col gap-1"
          >
            {added.map((u) => (
              <div
                key={`sm-add-${u}`}
                className="flex h-10 items-center rounded-lg border bg-background/40 px-2 py-1"
              >
                <a
                  className="flex items-center gap-1.5 truncate text-foreground/85 text-xs hover:text-foreground/60 hover:no-underline"
                  href={u}
                  target="_blank"
                  rel="noreferrer"
                >
                  {u}
                  <ExternalLink className="size-3" />
                </a>
              </div>
            ))}
          </motion.div>
        ) : null}
        {more > 0 ? (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-2 px-3 text-[13px]"
              onClick={() => setVisible(total)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span>Show {more} more</span>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
