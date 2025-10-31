import { KeyValueGrid } from "@/components/domain/key-value-grid";
import { KeyValueSkeletonList } from "@/components/domain/key-value-skeletons";
import { Section } from "@/components/domain/section";
import { SECTION_DEFS } from "@/lib/sections-meta";

export function HeadersSectionSkeleton() {
  return (
    <Section {...SECTION_DEFS.headers} isLoading>
      <KeyValueGrid colsDesktop={2}>
        <KeyValueSkeletonList count={12} widthClass="w-[100px]" withTrailing />
      </KeyValueGrid>
    </Section>
  );
}
