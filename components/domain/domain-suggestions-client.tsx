"use client";

import { useHomeSearch } from "@/components/home-search-context";
import { DomainSuggestions } from "./domain-suggestions";

type DomainSuggestionsClientProps = {
  suggestions: string[];
  className?: string;
  faviconSize?: number;
  max?: number;
};

/**
 * Client wrapper that connects DomainSuggestions to HomeSearchContext.
 *
 * This allows the server component DomainSuggestionsServer to pass suggestions
 * while the click handler comes from the context provided by HomeSearchSection.
 */
export function DomainSuggestionsClient(props: DomainSuggestionsClientProps) {
  const { onSuggestionClickAction } = useHomeSearch();

  return (
    <DomainSuggestions {...props} onSelectAction={onSuggestionClickAction} />
  );
}
