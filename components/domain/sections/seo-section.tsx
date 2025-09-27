"use client";

// React 19 automatic runtime, explicit import not needed
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
          <Tabs defaultValue="x" className="w-full">
            <TabsList>
              <TabsTrigger value="x">X</TabsTrigger>
              <TabsTrigger value="facebook">Facebook</TabsTrigger>
              <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
              <TabsTrigger value="pinterest">Pinterest</TabsTrigger>
              <TabsTrigger value="raw">Raw Data</TabsTrigger>
            </TabsList>
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
            <TabsContent value="raw">
              <RawMeta data={data} />
            </TabsContent>
          </Tabs>

          <RobotsSummary robots={data.robots} />
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

function RobotsSummary({ robots }: { robots: RobotsTxt | null }) {
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

  return (
    <div className="rounded-xl border bg-background/40 p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-sm font-medium">robots.txt</div>
        <Badge variant={has ? "default" : "secondary"}>
          {has ? "Found" : "Missing"}
        </Badge>
      </div>
      {has ? (
        <div className="text-xs text-muted-foreground">
          {allowCount} allows, {disallowCount} disallows,{" "}
          {robots?.sitemaps.length ?? 0} sitemaps
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          No robots.txt discovered.
        </div>
      )}
    </div>
  );
}
