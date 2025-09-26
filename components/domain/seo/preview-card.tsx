import { ExternalLink, ImageIcon } from "lucide-react";
import type { SeoPreview } from "@/lib/seo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "../copy-button";

interface PreviewCardProps {
  platform: "x" | "facebook" | "linkedin" | "pinterest";
  preview: SeoPreview;
  title: string;
}

export function PreviewCard({ platform, preview, title }: PreviewCardProps) {
  const platformStyles = {
    x: "border-[#1DA1F2] bg-gradient-to-br from-[#1DA1F2]/5 to-[#1DA1F2]/10",
    facebook: "border-[#1877F2] bg-gradient-to-br from-[#1877F2]/5 to-[#1877F2]/10",
    linkedin: "border-[#0A66C2] bg-gradient-to-br from-[#0A66C2]/5 to-[#0A66C2]/10",
    pinterest: "border-[#E60023] bg-gradient-to-br from-[#E60023]/5 to-[#E60023]/10",
  };

  const platformEmojis = {
    x: "𝕏",
    facebook: "📘", 
    linkedin: "💼",
    pinterest: "📌",
  };

  return (
    <Card className={`${platformStyles[platform]} border-2`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="text-lg">{platformEmojis[platform]}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Mock preview */}
        <div className="border rounded-lg overflow-hidden bg-card">
          {/* Image placeholder */}
          {preview.image ? (
            <div className="relative aspect-[1.91/1] bg-muted flex items-center justify-center">
              <div className="absolute inset-2 bg-muted-foreground/10 rounded flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
                Image Preview
              </Badge>
            </div>
          ) : (
            <div className="aspect-[1.91/1] bg-muted/50 flex items-center justify-center">
              <div className="text-center text-muted-foreground text-sm">
                <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                No image available
              </div>
            </div>
          )}
          
          {/* Content */}
          <div className="p-3 space-y-2">
            {preview.canonicalUrl && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3" />
                <span className="truncate">{new URL(preview.canonicalUrl).hostname}</span>
              </div>
            )}
            
            {preview.title && (
              <h4 className="font-semibold text-sm leading-tight line-clamp-2">
                {preview.title}
              </h4>
            )}
            
            {preview.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {preview.description}
              </p>
            )}
          </div>
        </div>

        {/* Raw values for copying */}
        <div className="space-y-2 text-xs">
          {preview.title && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground min-w-0 flex-shrink-0">Title:</span>
              <div className="min-w-0 flex-1 flex items-center gap-1">
                <span className="text-xs truncate" title={preview.title}>
                  {preview.title}
                </span>
                <CopyButton value={preview.title} />
              </div>
            </div>
          )}
          
          {preview.description && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground min-w-0 flex-shrink-0">Description:</span>
              <div className="min-w-0 flex-1 flex items-center gap-1">
                <span className="text-xs truncate" title={preview.description}>
                  {preview.description}
                </span>
                <CopyButton value={preview.description} />
              </div>
            </div>
          )}
          
          {preview.image && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground min-w-0 flex-shrink-0">Image:</span>
              <div className="min-w-0 flex-1 flex items-center gap-1">
                <span className="text-xs truncate" title={preview.image}>
                  {preview.image}
                </span>
                <CopyButton value={preview.image} />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}