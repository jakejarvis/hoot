"use client";

import { useState } from "react";
import type { SeoData } from "@/lib/seo";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MetaTable } from "./meta-table";
import { PreviewCard } from "./preview-card";
import { RobotsSummary } from "./robots-summary";

interface SeoContentProps {
  data: SeoData;
}

export function SeoContent({ data }: SeoContentProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="previews" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="previews">Social Previews</TabsTrigger>
          <TabsTrigger value="metadata">Meta Tags</TabsTrigger>
          <TabsTrigger value="robots">Robots.txt</TabsTrigger>
        </TabsList>

        <TabsContent value="previews" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PreviewCard 
              platform="x" 
              preview={data.preview}
              title="X (Twitter) Card"
            />
            <PreviewCard 
              platform="facebook" 
              preview={data.preview}
              title="Facebook Share"
            />
            <PreviewCard 
              platform="linkedin" 
              preview={data.preview}
              title="LinkedIn Share"
            />
            <PreviewCard 
              platform="pinterest" 
              preview={data.preview}
              title="Pinterest Pin"
            />
          </div>
        </TabsContent>

        <TabsContent value="metadata" className="mt-4">
          <MetaTable meta={data.meta} />
        </TabsContent>

        <TabsContent value="robots" className="mt-4">
          <RobotsSummary robots={data.robots} errors={data.errors} />
        </TabsContent>
      </Tabs>
    </div>
  );
}