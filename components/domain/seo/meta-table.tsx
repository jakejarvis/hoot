import type { SeoMeta } from "@/lib/seo";
import { Badge } from "@/components/ui/badge";
import { KeyValue } from "../key-value";

interface MetaTableProps {
  meta: SeoMeta;
}

export function MetaTable({ meta }: MetaTableProps) {
  const hasOpenGraph = Object.keys(meta.openGraph).some(key => 
    key === 'images' ? meta.openGraph.images.length > 0 : Boolean(meta.openGraph[key as keyof typeof meta.openGraph])
  );
  const hasTwitter = Object.keys(meta.twitter).some(key => Boolean(meta.twitter[key as keyof typeof meta.twitter]));
  const hasGeneral = Object.keys(meta.general).some(key => Boolean(meta.general[key as keyof typeof meta.general]));

  return (
    <div className="space-y-6">
      {/* Open Graph */}
      {hasOpenGraph && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Open Graph</h4>
            <Badge variant="secondary" className="text-xs">og:</Badge>
          </div>
          <div className="space-y-2">
            {meta.openGraph.title && (
              <KeyValue 
                label="Title" 
                value={meta.openGraph.title}
                copyable
              />
            )}
            {meta.openGraph.description && (
              <KeyValue 
                label="Description" 
                value={meta.openGraph.description}
                copyable
              />
            )}
            {meta.openGraph.type && (
              <KeyValue 
                label="Type" 
                value={meta.openGraph.type}
                copyable
              />
            )}
            {meta.openGraph.url && (
              <KeyValue 
                label="URL" 
                value={meta.openGraph.url}
                copyable
              />
            )}
            {meta.openGraph.siteName && (
              <KeyValue 
                label="Site Name" 
                value={meta.openGraph.siteName}
                copyable
              />
            )}
            {meta.openGraph.images.map((image, index) => (
              <KeyValue 
                key={index}
                label={`Image ${index + 1}`} 
                value={image}
                copyable
              />
            ))}
          </div>
        </div>
      )}

      {/* Twitter Card */}
      {hasTwitter && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Twitter Card</h4>
            <Badge variant="secondary" className="text-xs">twitter:</Badge>
          </div>
          <div className="space-y-2">
            {meta.twitter.card && (
              <KeyValue 
                label="Card Type" 
                value={meta.twitter.card}
                copyable
              />
            )}
            {meta.twitter.title && (
              <KeyValue 
                label="Title" 
                value={meta.twitter.title}
                copyable
              />
            )}
            {meta.twitter.description && (
              <KeyValue 
                label="Description" 
                value={meta.twitter.description}
                copyable
              />
            )}
            {meta.twitter.image && (
              <KeyValue 
                label="Image" 
                value={meta.twitter.image}
                copyable
              />
            )}
          </div>
        </div>
      )}

      {/* General Meta */}
      {hasGeneral && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Standard Meta</h4>
            <Badge variant="secondary" className="text-xs">HTML</Badge>
          </div>
          <div className="space-y-2">
            {meta.general.title && (
              <KeyValue 
                label="Title" 
                value={meta.general.title}
                copyable
              />
            )}
            {meta.general.description && (
              <KeyValue 
                label="Description" 
                value={meta.general.description}
                copyable
              />
            )}
            {meta.general.canonical && (
              <KeyValue 
                label="Canonical URL" 
                value={meta.general.canonical}
                copyable
              />
            )}
            {meta.general.robots && (
              <KeyValue 
                label="Robots" 
                value={meta.general.robots}
                copyable
              />
            )}
          </div>
        </div>
      )}

      {!hasOpenGraph && !hasTwitter && !hasGeneral && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No meta tags found</p>
        </div>
      )}
    </div>
  );
}