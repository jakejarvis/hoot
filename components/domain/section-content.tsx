"use client";

import { cn } from "@/lib/utils";

type SectionContentProps<T> = {
  isLoading: boolean;
  isError: boolean;
  data?: T | null;
  className?: string;
  renderLoading: () => React.ReactNode;
  renderError: () => React.ReactNode;
  renderData: (data: T) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  isEmpty?: (data: T) => boolean;
};

export function SectionContent<T>({
  isLoading,
  isError,
  data,
  className,
  renderLoading,
  renderError,
  renderData,
  renderEmpty,
  isEmpty,
}: SectionContentProps<T>) {
  if (isLoading) {
    return <div className={cn(className)}>{renderLoading()}</div>;
  }

  if (isError) {
    return <div className={cn(className)}>{renderError()}</div>;
  }

  if (data == null) {
    return renderEmpty ? (
      <div className={cn(className)}>{renderEmpty()}</div>
    ) : null;
  }

  if (isEmpty?.(data)) {
    return renderEmpty ? (
      <div className={cn(className)}>{renderEmpty()}</div>
    ) : null;
  }

  return <div className={cn(className)}>{renderData(data)}</div>;
}
