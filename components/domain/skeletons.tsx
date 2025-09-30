export function Skeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => {
        const key = `sk-${count}-${i}`;
        return (
          <div
            key={key}
            className="h-10 animate-pulse rounded-2xl bg-foreground/5 dark:bg-foreground/10"
          />
        );
      })}
    </div>
  );
}
