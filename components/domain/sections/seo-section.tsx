"use client";

import {
  DiscordIcon,
  FacebookIcon,
  LinkedinIcon,
  SlackIcon,
  TwitterIcon,
} from "@/components/brand-icons";
import { SocialPreview } from "@/components/social-preview";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
