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
  // Evaluate flag with defensive fallback in case of unexpected values
  const flagValue = await domainSuggestionsFlag();

  // Validate the flag value is an array, otherwise fall back to empty array
  const suggestions = Array.isArray(flagValue) ? flagValue : [];

  return <DomainSuggestionsClient {...props} suggestions={suggestions} />;
}
