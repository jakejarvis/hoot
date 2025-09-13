import Image from "next/image"

export function Favicon({ domain, size = 16, className }: { domain: string; size?: number; className?: string }) {
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
  return (
    <Image
      src={src}
      alt="Favicon"
      width={size}
      height={size}
      className={className}
    />
  )
}


