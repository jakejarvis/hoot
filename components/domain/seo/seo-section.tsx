import type { SeoData } from "@/lib/seo";
import { ErrorWithRetry } from "../error-with-retry";
import { Section } from "../section";
import { Skeletons } from "../skeletons";
import { SECTION_DEFS } from "../sections/sections-meta";
import { SeoContent } from "./seo-content";

interface SeoSectionProps {
  data: SeoData | null;
  isLoading: boolean;
  isError: boolean;
  onRetryAction: () => void;
}

export function SeoSection({ data, isLoading, isError, onRetryAction }: SeoSectionProps) {
  const { title, accent, Icon, description, help } = SECTION_DEFS.seo;

  return (
    <Section
      title={title}
      description={description}
      help={help}
      icon={<Icon className="h-4 w-4" />}
      accent={accent}
      status={isLoading ? "loading" : isError ? "error" : "ready"}
    >
      {data ? (
        <SeoContent data={data} />
      ) : isError ? (
        <ErrorWithRetry
          message="Failed to load SEO & social data"
          onRetry={onRetryAction}
        />
      ) : (
        <Skeletons count={6} />
      )}
    </Section>
  );
}