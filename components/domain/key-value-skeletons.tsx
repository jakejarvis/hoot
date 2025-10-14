import { KeyValueSkeleton } from "@/components/domain/key-value-skeleton";

export function KeyValueSkeletonList({
  count,
  widthClass = "w-[100px]",
  withLeading = false,
  withTrailing = false,
  withSuffix = false,
  keyPrefix = "kv-skel",
}: {
  count: number;
  widthClass?: string;
  withLeading?: boolean;
  withTrailing?: boolean;
  withSuffix?: boolean;
  keyPrefix?: string;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <KeyValueSkeleton
          key={`${keyPrefix}-${i + 1}`}
          widthClass={widthClass}
          withLeading={withLeading}
          withTrailing={withTrailing}
          withSuffix={withSuffix}
        />
      ))}
    </>
  );
}
