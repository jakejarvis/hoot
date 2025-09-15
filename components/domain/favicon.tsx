import Image from "next/image";

export function Favicon({
  domain,
  size = 16,
  className,
}: {
  domain: string;
  size?: number;
  className?: string;
}) {
  const src = `/api/favicon?domain=${encodeURIComponent(domain)}`;
  return (
    <Image
      src={src}
      alt="Favicon"
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  );
}
