"use client";

import Image from "next/image";
import * as React from "react";

export function Favicon({
  domain,
  size = 16,
  className,
}: {
  domain: string;
  size?: number;
  className?: string;
}) {
  const duckUrl = React.useMemo(
    () => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
    [domain],
  );
  const [src, setSrc] = React.useState(duckUrl);

  React.useEffect(() => {
    setSrc(duckUrl);
  }, [duckUrl]);

  return (
    <Image
      src={src}
      alt="Favicon"
      width={size}
      height={size}
      className={className}
      onError={() => {
        if (src !== "/globe.svg") {
          setSrc("/globe.svg");
        }
      }}
    />
  );
}
