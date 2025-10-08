"use client";

import {
  ChevronRight,
  ExternalLink,
  FileQuestionMark,
  Filter,
  Plus,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import {
  DiscordIcon,
  FacebookIcon,
  LinkedinIcon,
  SlackIcon,
  TwitterIcon,
} from "@/components/brand-icons";
import { KeyValue } from "@/components/domain/key-value";
import { KeyValueSkeleton } from "@/components/domain/key-value-skeleton";
import { Section } from "@/components/domain/section";
import { SocialPreview } from "@/components/domain/social-preview";
import {
  SubheadCount,
  SubheadCountSkeleton,
} from "@/components/domain/subhead-count";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProgressiveReveal } from "@/hooks/use-progressive-reveal";
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
  const metaTagCount = metaTagValues.filter((t) => t.value != null).length;

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
    useState<SocialPreviewProvider>("twitter");

  return (
    <Section {...SECTION_DEFS.seo} isError={isError} isLoading={isLoading}>
      {isLoading ? (
        <SeoSkeleton />
      ) : data ? (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] text-foreground/70 uppercase leading-none tracking-[0.08em] dark:text-foreground/80">
              <span>Meta Tags</span>
              <SubheadCount count={metaTagCount} color="orange" />
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {metaTagValues
                .filter((t) => t.value != null)
                .map((t) => (
                  <KeyValue
                    key={t.label}
                    label={t.label}
                    value={String(t.value)}
                    suffix={
                      String(t.value).startsWith("http://") ||
                      String(t.value).startsWith("https://") ? (
                        <a
                          href={String(t.value)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          title="Open URL in new tab"
                        >
                          <ExternalLink
                            className="!h-3.5 !w-3.5"
                            aria-hidden="true"
                          />
                        </a>
                      ) : null
                    }
                    copyable
                  />
                ))}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="text-[11px] text-foreground/70 uppercase tracking-[0.08em] dark:text-foreground/80">
              Open Graph
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
              <div className="mx-auto mt-4 mb-2 w-full max-w-[480px] md:max-w-[640px]">
                <TabsContent
                  value={selectedTab}
                  className="grid place-items-center"
                >
                  {data?.preview ? (
                    <SocialPreview
                      provider={selectedTab}
                      title={data.preview.title}
                      description={data.preview.description}
                      image={data.preview.imageUploaded ?? null}
                      url={data.preview.canonicalUrl}
                      variant={selectedTab === "twitter" ? xVariant : undefined}
                    />
                  ) : null}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <RobotsSummary robots={data.robots} />
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

function RobotsSummary({ robots }: { robots: SeoResponse["robots"] }) {
  const has =
    !!robots &&
    robots.fetched &&
    ((robots.groups?.length ?? 0) > 0 || (robots.sitemaps?.length ?? 0) > 0);

  const counts = useMemo(() => {
    const isNonEmpty = (r: { value: string }) => r.value.trim() !== "";
    const disallows =
      robots?.groups.reduce(
        (acc, g) =>
          acc +
          g.rules.filter((r) => r.type === "disallow" && isNonEmpty(r)).length,
        0,
      ) ?? 0;
    const allows =
      robots?.groups.reduce(
        (acc, g) =>
          acc +
          g.rules.filter((r) => r.type === "allow" && isNonEmpty(r)).length,
        0,
      ) ?? 0;
    return { allows, disallows };
  }, [robots]);

  const hasAnyListedRules = useMemo(() => {
    const groups = robots?.groups ?? [];
    for (const g of groups) {
      for (const r of g.rules) {
        if (
          (r.type === "allow" || r.type === "disallow") &&
          r.value.trim() !== ""
        ) {
          return true;
        }
      }
    }
    return false;
  }, [robots]);

  const [query, setQuery] = useState("");
  const [only, setOnly] = useState<"all" | "allow" | "disallow">("all");

  const rankAgents = useCallback((agents: string[]): number => {
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

  const filteredGroups = useMemo(() => {
    const base = robots?.groups?.slice() ?? [];
    const sorted = base.sort(
      (a, b) => rankAgents(a.userAgents) - rankAgents(b.userAgents),
    );
    const isNonEmpty = (r: { value: string }) => r.value.trim() !== "";
    return sorted.map((g) => {
      const hasEmptyAllow = g.rules.some(
        (r) => r.type === "allow" && !isNonEmpty(r),
      );
      const hasEmptyDisallow = g.rules.some(
        (r) => r.type === "disallow" && !isNonEmpty(r),
      );
      const visible = g.rules
        .filter(isNonEmpty)
        .filter((r) => (only === "all" ? true : r.type === only))
        .filter((r) =>
          query ? r.value.toLowerCase().includes(query.toLowerCase()) : true,
        );
      return { ...g, rules: visible, hasEmptyAllow, hasEmptyDisallow } as {
        userAgents: string[];
        rules: { type: "allow" | "disallow" | "crawlDelay"; value: string }[];
        hasEmptyAllow: boolean;
        hasEmptyDisallow: boolean;
      };
    });
  }, [robots, only, query, rankAgents]);

  const hasFilteredRules = filteredGroups.some((g) => g.rules.length > 0);
  const filtersActive = query.trim().length > 0 || only !== "all";
  const displayGroups = useMemo(
    () =>
      filtersActive
        ? filteredGroups.filter((g) => g.rules.length > 0)
        : filteredGroups,
    [filteredGroups, filtersActive],
  );

  return (
    <div className="space-y-4 rounded-xl">
      <div className="mt-5 flex items-center gap-2 text-[11px] text-foreground/70 uppercase leading-none tracking-[0.08em] dark:text-foreground/80">
        <span>robots.txt</span>
        {has ? (
          <SubheadCount
            count={(counts.allows + counts.disallows) as number}
            color="blue"
          />
        ) : null}
      </div>

      {has ? (
        <div className="space-y-4">
          {hasAnyListedRules ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <InputGroup className="sm:flex-1">
                  <InputGroupInput
                    name="robots-filter"
                    placeholder="Filter rules…"
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

                <ButtonGroup className="!w-full sm:!w-auto h-9 items-stretch [&>*]:flex-1 sm:[&>*]:flex-none">
                  <Button
                    type="button"
                    variant="outline"
                    aria-pressed={only === "all"}
                    onClick={() => setOnly("all")}
                    className={cn(
                      "h-9 px-3 text-[13px]",
                      only === "all" && "!bg-accent hover:!bg-accent/90",
                    )}
                  >
                    All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-pressed={only === "allow"}
                    onClick={() => setOnly("allow")}
                    className={cn(
                      "h-9 gap-2.5 px-3 text-[13px]",
                      only === "allow" && "!bg-accent hover:!bg-accent/90",
                    )}
                  >
                    <span
                      className={
                        "inline-block size-1.5 rounded-full bg-emerald-500"
                      }
                      aria-hidden="true"
                    />
                    <span>Allow</span>
                    <SubheadCount count={counts.allows} color="slate" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-pressed={only === "disallow"}
                    onClick={() => setOnly("disallow")}
                    className={cn(
                      "h-9 gap-2.5 px-3 text-[13px]",
                      only === "disallow" && "!bg-accent hover:!bg-accent/90",
                    )}
                  >
                    <span
                      className={
                        "inline-block size-1.5 rounded-full bg-rose-500"
                      }
                      aria-hidden="true"
                    />
                    <span>Disallow</span>
                    <SubheadCount count={counts.disallows} color="slate" />
                  </Button>
                </ButtonGroup>
              </div>

              {filtersActive && !hasFilteredRules ? (
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
                only={only}
              />
            </>
          ) : robots?.sitemaps?.length ? (
            <div className="text-muted-foreground text-sm">
              This robots.txt only declares sitemaps; no crawl rules specified.
            </div>
          ) : null}

          {robots?.sitemaps?.length ? (
            <SitemapsList items={robots.sitemaps} />
          ) : null}
        </div>
      ) : (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileQuestionMark />
            </EmptyMedia>
            <EmptyTitle>No robots.txt found</EmptyTitle>
            <EmptyDescription>
              We didn&apos;t find a robots.txt for this site. Crawlers will use
              default behavior until one is added.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}

function RobotsGroupHeader({
  userAgents,
  allowN,
  disallowN,
  showAllow = true,
  showDisallow = true,
}: {
  userAgents: string[];
  allowN: number;
  disallowN: number;
  showAllow?: boolean;
  showDisallow?: boolean;
}) {
  return (
    <div className="flex w-full items-center justify-between rounded-md p-1 hover:bg-accent/50">
      <div className="flex flex-wrap items-center gap-1.5">
        <ChevronRight className="size-3 text-muted-foreground transition-transform group-data-[state=open]/accordion:rotate-90" />
        {userAgents.map((ua) => (
          <span
            key={ua}
            className={cn(
              "rounded px-1.5 py-0.5 text-xs",
              ua === "*"
                ? "bg-accent-purple/18 text-accent-purple"
                : "bg-muted",
            )}
          >
            {ua === "*" ? "All" : ua}
          </span>
        ))}
      </div>
      <div className="mr-1 text-muted-foreground text-xs">
        {showAllow ? `${allowN} allow` : null}
        {showAllow && showDisallow ? " · " : null}
        {showDisallow ? `${disallowN} disallow` : null}
      </div>
    </div>
  );
}

function GroupsAccordion({
  groups,
  query,
  highlight,
  only,
}: {
  groups: {
    userAgents: string[];
    rules: { type: "allow" | "disallow" | "crawlDelay"; value: string }[];
    hasEmptyAllow: boolean;
    hasEmptyDisallow: boolean;
  }[];
  query: string;
  highlight: (text: string, q: string) => React.ReactNode;
  only?: "all" | "allow" | "disallow";
}) {
  const defaultIdx = useMemo(
    () => groups.findIndex((g) => g.userAgents.includes("*")),
    [groups],
  );
  const defaultValue = defaultIdx >= 0 ? `g-${defaultIdx}` : undefined;
  const isSearching = Boolean(query);
  const openValues = useMemo(
    () => (isSearching ? groups.map((_, idx) => `g-${idx}`) : undefined),
    [groups, isSearching],
  );

  const content = groups.map((g, idx) => {
    const allowN = g.rules.filter((r) => r.type === "allow").length;
    const disallowN = g.rules.filter((r) => r.type === "disallow").length;
    const showAllow = isSearching ? true : only !== "disallow";
    const showDisallow = isSearching ? true : only !== "allow";
    return (
      <AccordionItem
        key={`g-${g.userAgents.join(",")}-${allowN}-${disallowN}`}
        value={`g-${idx}`}
      >
        <AccordionTrigger className="group/accordion py-2 hover:no-underline [&>svg]:hidden">
          <RobotsGroupHeader
            userAgents={g.userAgents}
            allowN={allowN}
            disallowN={disallowN}
            showAllow={showAllow}
            showDisallow={showDisallow}
          />
        </AccordionTrigger>
        <AccordionContent>
          <GroupContent
            rules={g.rules}
            query={query}
            highlight={highlight}
            only={only}
            hasEmptyAllow={g.hasEmptyAllow}
            hasEmptyDisallow={g.hasEmptyDisallow}
          />
        </AccordionContent>
      </AccordionItem>
    );
  });

  return isSearching ? (
    <Accordion type="multiple" value={openValues as string[]}>
      {content}
    </Accordion>
  ) : (
    <Accordion type="single" collapsible defaultValue={defaultValue}>
      {content}
    </Accordion>
  );
}

function GroupContent({
  rules,
  query,
  highlight,
  only,
  hasEmptyAllow,
  hasEmptyDisallow,
}: {
  rules: { type: "allow" | "disallow" | "crawlDelay"; value: string }[];
  query: string;
  highlight: (text: string, q: string) => React.ReactNode;
  only?: "all" | "allow" | "disallow";
  hasEmptyAllow: boolean;
  hasEmptyDisallow: boolean;
}) {
  const isSearching = query.trim().length > 0;
  const { existing, added, more, total, visible, setVisible } =
    useProgressiveReveal(rules, 6);
  if (isSearching) {
    return (
      <div className="flex flex-col gap-1.5 py-2">
        {rules.map((r, i) => (
          <RuleRow
            key={`r-${r.type}-${r.value}-all-${i}`}
            rule={r}
            query={query}
            highlight={highlight}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 py-2">
      {rules.length === 0 && hasEmptyDisallow && only !== "allow" ? (
        <div className="rounded-md bg-muted/30 px-2 py-1 text-[13px] text-muted-foreground/90">
          No disallow restrictions (allow all)
        </div>
      ) : null}
      {rules.length === 0 && hasEmptyAllow && only !== "disallow" ? (
        <div className="rounded-md bg-muted/30 px-2 py-1 text-[13px] text-muted-foreground/90">
          No explicit allow paths
        </div>
      ) : null}
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
          className="flex flex-col gap-1.5"
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
  return (
    <div className="group flex items-center gap-2 rounded-lg border border-input px-2.5 py-2 font-mono text-xs">
      <RuleTypeDot type={rule.type} />
      <span className="truncate">{highlight(rule.value, query)}</span>
    </div>
  );
}

function RuleTypeDot({ type }: { type: "allow" | "disallow" | "crawlDelay" }) {
  const color =
    type === "allow"
      ? "bg-emerald-500"
      : type === "disallow"
        ? "bg-rose-500"
        : "bg-amber-500";
  const label =
    type === "allow"
      ? "Allow"
      : type === "disallow"
        ? "Disallow"
        : "Crawl delay";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex h-4 w-4 items-center justify-center">
          <span
            className={cn("inline-block size-1.5 rounded-full", color)}
            role="img"
            aria-label={label}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="left" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SitemapsList({ items }: { items: string[] }) {
  const { existing, added, more, total, visible, setVisible } =
    useProgressiveReveal(items, 2);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] text-foreground/70 uppercase leading-none tracking-[0.08em] dark:text-foreground/80">
        <span>Sitemaps</span>
        <SubheadCount count={items.length} color="indigo" />
      </div>
      <div className="flex flex-col gap-2.5">
        {existing.map((u) => (
          <div key={`sm-ex-${u}`} className="flex items-center">
            <a
              className="flex items-center gap-1.5 truncate font-medium text-[13px] text-foreground/85 hover:text-foreground/60 hover:no-underline"
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
            className="flex flex-col gap-2.5"
          >
            {added.map((u) => (
              <div key={`sm-add-${u}`} className="flex items-center">
                <a
                  className="flex items-center gap-1.5 truncate font-medium text-[13px] text-foreground/85 hover:text-foreground/60 hover:no-underline"
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
          <div className="mt-2 flex justify-center">
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

// Loading skeletons mirroring the live layout for minimal CLS
function SeoSkeleton() {
  return (
    <div className="space-y-4">
      {/* Meta Tags */}
      <div className="space-y-3">
        <SubheadCountSkeleton />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <KeyValueSkeleton label="Title" widthClass="w-[220px]" />
          <KeyValueSkeleton label="Description" widthClass="w-[260px]" />
          <KeyValueSkeleton label="Canonical" widthClass="w-[200px]" />
          <KeyValueSkeleton label="Image" widthClass="w-[260px]" />
        </div>
      </div>

      {/* Open Graph */}
      <div className="mt-6 space-y-3">
        <div className="text-[11px] text-foreground/70 uppercase tracking-[0.08em] dark:text-foreground/80">
          Open Graph
        </div>
        {/* Tabs row skeleton */}
        <div className="flex h-auto w-full flex-wrap gap-1 rounded-md border border-muted-foreground/15 p-1 md:justify-start">
          {["twitter", "facebook", "linkedin", "discord", "slack"].map((id) => (
            <Skeleton
              key={`og-tab-${id}`}
              className="h-9 flex-1 basis-0 rounded-md"
            />
          ))}
        </div>
        {/* Preview skeleton */}
        <div className="mx-auto mt-4 mb-2 w-full max-w-[480px] md:max-w-[640px]">
          <SocialPreviewSkeletonLarge />
        </div>
      </div>

      {/* Robots summary */}
      <div className="space-y-4 rounded-xl">
        <div className="mt-5 flex items-center gap-2 text-[11px] text-foreground/70 uppercase leading-none tracking-[0.08em] dark:text-foreground/80">
          <Skeleton className="h-3 w-20 rounded" />
          <SubheadCountSkeleton />
        </div>

        {/* Filters row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Skeleton className="h-9 w-full rounded-md" />
          <div className="h-9 w-full items-stretch gap-2 sm:flex sm:w-auto">
            <Skeleton className="h-9 w-full rounded-md sm:w-16" />
            <Skeleton className="h-9 w-full rounded-md sm:w-24" />
            <Skeleton className="h-9 w-full rounded-md sm:w-28" />
          </div>
        </div>

        {/* Groups accordion skeleton */}
        <div className="space-y-2">
          {["g-0", "g-1", "g-2"].map((gid) => (
            <RobotsGroupSkeleton key={gid} />
          ))}
        </div>

        {/* Sitemaps */}
        <div className="space-y-3">
          <div className="mt-5">
            <SubheadCountSkeleton />
          </div>
          <div className="flex flex-col gap-1.5">
            {["sm-0", "sm-1"].map((sid) => (
              <Skeleton key={sid} className="h-3 w-56" />
            ))}
            <div className="mt-4 flex justify-center">
              <Skeleton className="h-7 w-28 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialPreviewSkeletonLarge() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#eff3f4] bg-white text-black dark:border-[#2f3336] dark:bg-black dark:text-white">
      <div className="relative w-full overflow-hidden bg-[#f1f5f9] dark:bg-[#0f1419]">
        <div className="aspect-[16/9] min-h-[160px] w-full">
          <Skeleton className="h-full w-full rounded-none" />
        </div>
      </div>
      <div className="p-3">
        <Skeleton className="h-[11px] w-24" />
        <div className="mt-1.5">
          <Skeleton className="h-5 w-3/4" />
        </div>
        <div className="mt-1">
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}

function RobotsGroupSkeleton() {
  return (
    <div className="rounded-lg border p-2">
      {/* Header with chevron + chips + count */}
      <div className="flex w-full items-center justify-between py-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="size-3 rounded-full bg-muted" />
          {["ua-0", "ua-1", "ua-2"].map((uid) => (
            <Skeleton key={uid} className="h-5 w-14 rounded" />
          ))}
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Rules */}
      <div className="flex flex-col gap-1.5 py-2">
        {["r-0", "r-1", "r-2"].map((rid) => (
          <div
            key={rid}
            className="flex items-center gap-2 rounded-lg border border-input px-2.5 py-2"
          >
            <span className="inline-block size-1.5 rounded-full bg-accent" />
            <Skeleton className="h-3 w-64" />
          </div>
        ))}
      </div>
      <div className="my-2 flex justify-center">
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
    </div>
  );
}
