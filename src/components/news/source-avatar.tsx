import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Avatar circular: some `img` em falha e cai na inicial da fonte. */
export function SourceAvatar({
  src,
  initial,
  size = 28,
  className,
  imgClassName,
  fallbackClassName,
  loading,
}: {
  src?: string | null;
  initial: string;
  size?: number;
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  loading?: "eager" | "lazy";
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading={loading}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={cn("shrink-0 rounded-full bg-paper-2 object-cover", imgClassName, className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-paper-2 font-medium text-mute",
        fallbackClassName,
        className,
      )}
      style={{ width: size, height: size }}
    >
      {initial}
    </span>
  );
}
