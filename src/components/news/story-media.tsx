import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { StoryAsset } from "@/lib/news/types";

export function StoryMedia({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
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
      width={16}
      height={9}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}

export function StoryAssetBlock({
  asset,
  alt,
  priority = false,
}: {
  asset: StoryAsset;
  alt: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const node = videoRef.current;
    if (!node || asset.type !== "video") return;
    node.muted = true;
    const play = node.play();
    if (play) void play.catch(() => {});
  }, [asset.type, asset.url]);
  if (asset.type === "video") {
    return (
      <video
        ref={videoRef}
        controls
        autoPlay
        muted
        loop
        playsInline
        // video.twimg.com devolve 403 se o browser mandar Referer do site.
        // @ts-expect-error React omite referrerPolicy em VideoHTMLAttributes.
        referrerPolicy="no-referrer"
        aria-label={`Vídeo: ${alt}`}
        width={asset.width ?? 16}
        height={asset.height ?? 9}
        preload={priority ? "auto" : "metadata"}
        poster={asset.poster}
        src={asset.url}
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
      <StoryMedia
        src={asset.poster || null}
        alt={alt}
        priority={priority}
        className="mt-6 aspect-[16/9] w-full rounded-lg"
      />
    );
  }
  return (
    <img
      src={asset.url}
      alt={alt}
      width={asset.width ?? 16}
      height={asset.height ?? 9}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="mt-6 h-auto w-full rounded-lg bg-hero object-contain"
    />
  );
}
