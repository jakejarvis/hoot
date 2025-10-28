import { domainSuggestionsFlag } from "@/flags";
import { DomainSuggestionsClient } from "./domain-suggestions-client";

type DomainSuggestionsServerProps = {
  className?: string;
  faviconSize?: number;
  max?: number;
};

/**
 * Server wrapper for DomainSuggestions that evaluates the feature flag.
 *
 * This component evaluates the domainSuggestionsFlag on the server side
 * and passes the result to the client DomainSuggestions component.
 *
 * The onSelectAction handler is provided via HomeSearchContext from the parent.
 */
export async function DomainSuggestionsServer(
  props: DomainSuggestionsServerProps,
) {
  const suggestions = await domainSuggestionsFlag();

  return <DomainSuggestionsClient {...props} suggestions={suggestions} />;
}
