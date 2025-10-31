import { KeyValueGrid } from "@/components/domain/key-value-grid";
import { KeyValueSkeleton } from "@/components/domain/key-value-skeleton";
import { Section } from "@/components/domain/section";
import { SECTION_DEFS } from "@/lib/sections-meta";

export function HostingSectionSkeleton() {
  return (
    <Section {...SECTION_DEFS.hosting} isLoading>
      <KeyValueGrid colsDesktop={3}>
        <KeyValueSkeleton label="DNS" withLeading widthClass="w-[100px]" />
        <KeyValueSkeleton label="Hosting" withLeading widthClass="w-[100px]" />
        <KeyValueSkeleton label="Email" withLeading widthClass="w-[100px]" />
      </KeyValueGrid>

      <KeyValueSkeleton label="Location" withLeading widthClass="w-[100px]" />

      {/* Map skeleton */}
      <div className="h-[280px] w-full rounded-2xl border border-black/10 bg-background/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/40 dark:border-white/10" />
    </Section>
  );
}
