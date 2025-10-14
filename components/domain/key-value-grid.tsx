import { cn } from "@/lib/utils";

export function KeyValueGrid({
  children,
  className,
  colsSm = 2,
  colsMd,
  colsLg,
}: {
  children: React.ReactNode;
  className?: string;
  colsSm?: 1 | 2 | 3 | 4;
  colsMd?: 1 | 2 | 3 | 4;
  colsLg?: 1 | 2 | 3 | 4;
}) {
  const smClass = `sm:grid-cols-${colsSm}`;
  const mdClass = colsMd ? `md:grid-cols-${colsMd}` : undefined;
  const lgClass = colsLg ? `lg:grid-cols-${colsLg}` : undefined;
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2",
        smClass,
        mdClass,
        lgClass,
        className,
      )}
    >
      {children}
    </div>
  );
}
