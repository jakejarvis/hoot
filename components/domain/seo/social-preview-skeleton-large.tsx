import { Skeleton } from "@/components/ui/skeleton";

export function SocialPreviewSkeletonLarge() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#eff3f4] bg-white text-black dark:border-[#2f3336] dark:bg-black dark:text-white">
      <div className="relative w-full overflow-hidden bg-[#f1f5f9] dark:bg-[#0f1419]">
        <div className="aspect-[16/9] min-h-[160px] w-full">
          <Skeleton className="h-full w-full rounded-none" />
        </div>
      </div>
      <div className="p-3">
        <Skeleton className="h-[11px] w-24" />
        <div className="mt-1.5">
          <Skeleton className="h-5 w-3/4" />
        </div>
        <div className="mt-1">
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}

