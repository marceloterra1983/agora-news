import { useState } from "react";
import { cn } from "@/lib/utils";
import type { StoryAsset } from "@/lib/news/types";

export function StoryMedia({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-hero text-hero-fg",
          className,
        )}
        aria-hidden
      >
        <p className="absolute inset-x-3 bottom-3 line-clamp-3 font-display text-lg leading-tight">
          {alt}
        </p>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}

export function StoryAssetBlock({
  asset,
  alt,
}: {
  asset: StoryAsset;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  if (asset.type === "video") {
    return (
      <video
        controls
        playsInline
        preload="metadata"
        poster={asset.poster}
        className="mt-6 w-full rounded-lg bg-hero"
        style={
          asset.width && asset.height
            ? { aspectRatio: `${asset.width} / ${asset.height}` }
            : undefined
        }
      >
        <source src={asset.url} type="video/mp4" />
      </video>
    );
  }
  if (failed) {
    return (
      <StoryMedia src={asset.poster || null} alt={alt} className="mt-6 aspect-[16/9] w-full rounded-lg" />
    );
  }
  return (
    <img
      src={asset.url}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="mt-6 h-auto w-full rounded-lg bg-hero object-contain"
    />
  );
}
