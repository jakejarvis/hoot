import { ChevronDown, ChevronRight, Bot, Map, AlertTriangle } from "lucide-react";
import { useState } from "react";
import type { RobotsData } from "@/lib/seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { KeyValue } from "../key-value";

interface RobotsSummaryProps {
  robots: RobotsData;
  errors?: { robots?: string };
}

export function RobotsSummary({ robots, errors }: RobotsSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!robots.fetched) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">robots.txt not found or inaccessible</span>
        </div>
        {errors?.robots && (
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            Error: {errors.robots}
          </div>
        )}
      </div>
    );
  }

  if (robots.groups.length === 0 && robots.sitemaps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Empty robots.txt file</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {robots.groups.length} rule group{robots.groups.length !== 1 ? 's' : ''}
          </span>
        </div>
        {robots.sitemaps.length > 0 && (
          <div className="flex items-center gap-2">
            <Map className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {robots.sitemaps.length} sitemap{robots.sitemaps.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Sitemaps */}
      {robots.sitemaps.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Map className="h-4 w-4" />
            Sitemaps
          </h4>
          <div className="space-y-2">
            {robots.sitemaps.map((sitemap, index) => (
              <KeyValue
                key={index}
                label={`Sitemap ${index + 1}`}
                value={sitemap}
                copyable
              />
            ))}
          </div>
        </div>
      )}

      {/* Rules Groups */}
      {robots.groups.length > 0 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="justify-start p-0 h-auto font-semibold text-sm">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 mr-2" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )}
              <Bot className="h-4 w-4 mr-2" />
              Rules for User Agents
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-3">
            {robots.groups.map((group, groupIndex) => (
              <div key={groupIndex} className="border rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {group.userAgents.map((agent, agentIndex) => (
                    <Badge key={agentIndex} variant="outline" className="text-xs">
                      {agent === '*' ? 'All Bots' : agent}
                    </Badge>
                  ))}
                </div>
                
                {group.rules.length > 0 && (
                  <div className="space-y-2">
                    {group.rules.map((rule, ruleIndex) => {
                      const typeLabels = {
                        allow: 'Allow',
                        disallow: 'Disallow',
                        crawlDelay: 'Crawl Delay',
                      };
                      
                      const typeColors = {
                        allow: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                        disallow: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                        crawlDelay: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                      };

                      return (
                        <div key={ruleIndex} className="flex items-center gap-3 text-sm">
                          <Badge className={`text-xs ${typeColors[rule.type]}`} variant="secondary">
                            {typeLabels[rule.type]}
                          </Badge>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {rule.value}
                          </code>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {group.rules.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No specific rules</p>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}