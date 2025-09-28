import Image from "next/image";

type Provider = "x" | "twitter" | "facebook" | "linkedin" | "slack" | "discord";
type Variant = "compact" | "large";

export type SocialPreviewProps = {
  provider: Provider;
  title: string;
  description: string;
  image: string | null;
  url: string;
  variant?: Variant;
};

function getHostname(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SocialPreview({
  provider,
  title,
  description,
  image,
  url,
  variant = "compact",
}: SocialPreviewProps) {
  const normalized: Provider = provider === "twitter" ? "x" : provider;

  if (normalized === "x") {
    if (variant === "compact") {
      return (
        <div className="rounded-2xl border overflow-hidden bg-white text-black dark:bg-black dark:text-white border-[#eff3f4] dark:border-[#2f3336]">
          <div className="flex items-stretch">
            <div className="relative w-24 shrink-0 self-stretch bg-[#f1f5f9] dark:bg-[#0f1419]">
              {image ? (
                <Image
                  src={image}
                  alt="Preview image"
                  width={240}
                  height={240}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[11px] text-[#64748b] dark:text-[#8b98a5]">
                  No image
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 p-3">
              <div className="text-[11px] leading-4 text-[#536471] dark:text-[#8b98a5] truncate">
                {getHostname(url)}
              </div>
              <div className="mt-0.5 text-[15px] leading-5 font-semibold line-clamp-2">
                {title}
              </div>
              <div className="mt-0.5 text-[13px] leading-5 text-[#536471] dark:text-[#8b98a5] line-clamp-2">
                {description}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Large (summary_large_image) layout
    return (
      <div className="rounded-2xl border bg-white text-black dark:bg-black dark:text-white border-[#eff3f4] dark:border-[#2f3336] overflow-hidden">
        <div className="relative w-full overflow-hidden bg-[#f1f5f9] dark:bg-[#0f1419]">
          <div className="aspect-[16/9] w-full">
            {image ? (
              <Image
                src={image}
                alt="Preview image"
                width={1200}
                height={675}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[12px] text-[#64748b] dark:text-[#8b98a5]">
                No image
              </div>
            )}
          </div>
        </div>
        <div className="p-3">
          <div className="text-[11px] leading-4 text-[#536471] dark:text-[#8b98a5] truncate">
            {getHostname(url)}
          </div>
          <div className="mt-0.5 text-[15px] leading-5 font-semibold line-clamp-2">
            {title}
          </div>
          <div className="mt-0.5 text-[13px] leading-5 text-[#536471] dark:text-[#8b98a5] line-clamp-2">
            {description}
          </div>
        </div>
      </div>
    );
  }

  if (normalized === "facebook") {
    return (
      <div className="rounded-md border overflow-hidden bg-white text-black dark:bg-[#18191a] dark:text-white border-[#e4e6eb] dark:border-[#3a3b3c]">
        <div className="relative w-full bg-[#f0f2f5] dark:bg-[#242526]">
          <div className="aspect-[1.91/1] w-full">
            {image ? (
              <Image
                src={image}
                alt="Preview image"
                width={1200}
                height={628}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[12px] text-[#606770] dark:text-[#b0b3b8]">
                No image
              </div>
            )}
          </div>
        </div>
        <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-[#3a3b3c]">
          <div className="text-[11px] font-medium tracking-wide uppercase text-[#606770] dark:text-[#b0b3b8] truncate">
            {getHostname(url)}
          </div>
          <div className="mt-1 text-[17px] leading-5 font-semibold line-clamp-2 text-[#050505] dark:text-[#e4e6eb]">
            {title}
          </div>
          <div className="mt-1 text-[13px] leading-5 text-[#606770] dark:text-[#b0b3b8] line-clamp-2">
            {description}
          </div>
        </div>
      </div>
    );
  }

  if (normalized === "linkedin") {
    return (
      <div className="border overflow-hidden bg-white text-black dark:bg-[#1d2226] dark:text-white border-[#dde6f2] dark:border-[#2e3a44]">
        <div className="relative w-full bg-[#eef3f8] dark:bg-[#0b0f12]">
          <div className="aspect-[1200/627] w-full">
            {image ? (
              <Image
                src={image}
                alt="Preview image"
                width={1200}
                height={627}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[12px] text-[#6e7781] dark:text-[#9aa6b2]">
                No image
              </div>
            )}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[13px] leading-6 font-semibold line-clamp-2 text-[#0a66c2] dark:text-[#70b5f9]">
            {title}
          </div>
          <div className="text-[13px] leading-5 text-[#6e7781] dark:text-[#9aa6b2] truncate">
            {getHostname(url)}
          </div>
        </div>
      </div>
    );
  }

  if (normalized === "slack") {
    // Slack unfurl card: hostname, title (link blue), description, then image.
    return (
      <div className="relative overflow-hidden rounded-md border bg-white text-black dark:bg-[#1f2329] dark:text-white border-[#e1e3e6] dark:border-[#2b2e33] p-3 pl-6">
        <div className="absolute top-3 bottom-3 left-3 w-[3px] bg-[#c9ced6] dark:bg-[#3a3f45] rounded" />
        <div className="text-[12px] leading-4 text-[#4a4e52] dark:text-[#b7bfc6] truncate">
          {getHostname(url)}
        </div>
        <div className="mt-1 text-[15px] leading-5 text-[#1d9bd1] dark:text-[#36c5f0] font-semibold">
          {title}
        </div>
        <div className="mt-1 text-[13px] leading-5 text-[#4a4e52] dark:text-[#b7bfc6]">
          {description}
        </div>
        <div className="mt-3 overflow-hidden rounded-[6px] bg-[#f6f6f6] dark:bg-[#222529]">
          <div className="aspect-[16/9] w-full">
            {image ? (
              <Image
                src={image}
                alt="Preview image"
                width={1200}
                height={675}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[12px] text-[#6b7075] dark:text-[#9aa6b2]">
                No image
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (normalized === "discord") {
    // Discord embed-style card: title link blue, description, large rounded image, subtle container.
    return (
      <div className="rounded-lg border bg-[#2b2d31] text-white border-[#1f2124] p-3">
        <div className="text-[12px] leading-4 text-[#b5bac1] truncate">
          {getHostname(url)}
        </div>
        <div className="mt-1 text-[16px] leading-5 font-semibold text-[#58a6ff] line-clamp-2">
          {title}
        </div>
        <div className="mt-1 text-[13px] leading-5 text-[#dbdee1] line-clamp-3">
          {description}
        </div>
        <div className="mt-3 overflow-hidden rounded-md bg-[#1f2124]">
          <div className="aspect-[1200/628] w-full">
            {image ? (
              <Image
                src={image}
                alt="Preview image"
                width={1200}
                height={628}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[12px] text-[#99a1ab]">
                No image
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Future providers will be implemented here.
  return null;
}
