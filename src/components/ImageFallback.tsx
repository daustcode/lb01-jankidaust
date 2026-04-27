import React, { useEffect, useState } from "react";
import { ImageIcon, User as UserIcon } from "lucide-react";

/**
 * Drop-in replacement for <img>. Three jobs:
 *   1. Never pass src="" (browsers re-fetch the page URL on empty src).
 *   2. Keep the layout stable while the real image loads.
 *   3. Show a clean fallback (avatar / logo glyph) on missing or broken src.
 *
 * Use `variant="avatar"` for circular people images, `variant="logo"` for
 * brand marks, `variant="generic"` for everything else.
 */
export type ImageFallbackVariant = "avatar" | "logo" | "generic";

export interface ImageFallbackProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  alt: string;
  /** Visual style of the placeholder/fallback. Default: "generic". */
  variant?: ImageFallbackVariant;
  /** Optional fallback element shown on error (overrides the default glyph). */
  fallback?: React.ReactNode;
  /** Extra wrapper classes (kept transparent — `className` styles the <img>). */
  wrapperClassName?: string;
}

/**
 * Build a deterministic Dicebear avatar URL from any seed string.
 * Used by callers (e.g. the "create student" form) — NOT auto-applied here.
 * Rule: missing photos render as a placeholder glyph; new students get a
 * Dicebear avatar at creation time, which is then persisted as their photo.
 */
export function dicebearAvatar(seed: string | undefined | null): string {
  const safeSeed = encodeURIComponent((seed ?? "student").trim() || "student");
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${safeSeed}&backgroundColor=b6e3f4,d1d4f9,c0aede,ffd5dc,ffdfbf`;
}

export function ImageFallback({
  src,
  alt,
  variant = "generic",
  fallback,
  className = "",
  wrapperClassName = "",
  onLoad,
  onError,
  ...rest
}: ImageFallbackProps) {
  const cleanSrc = typeof src === "string" && src.trim() !== "" ? src : null;

  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    cleanSrc ? "loading" : "error",
  );

  useEffect(() => {
    setStatus(cleanSrc ? "loading" : "error");
  }, [cleanSrc]);

  const showImage = cleanSrc && status !== "error";
  const showFallback = !cleanSrc || status === "error";

  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden ${wrapperClassName}`}
      style={{ lineHeight: 0 }}
    >
      {showImage && (
        <img
          {...rest}
          src={cleanSrc!}
          alt={alt}
          className={`${className} ${status === "loading" ? "opacity-0" : "opacity-100"}`}
          onLoad={(e) => {
            setStatus("loaded");
            onLoad?.(e);
          }}
          onError={(e) => {
            setStatus("error");
            onError?.(e);
          }}
        />
      )}
      {showFallback && (
        <span
          aria-label={alt}
          role="img"
          className={`${className} bg-base-200 text-text-light flex items-center justify-center`}
        >
          {fallback ?? <PlaceholderGlyph variant={variant} />}
        </span>
      )}
    </span>
  );
}

function PlaceholderGlyph({ variant }: { variant: ImageFallbackVariant }) {
  if (variant === "avatar") return <UserIcon className="w-1/2 h-1/2 opacity-60" />;
  if (variant === "logo") return <ImageIcon className="w-1/2 h-1/2 opacity-60" />;
  return <ImageIcon className="w-1/2 h-1/2 opacity-60" />;
}

export default ImageFallback;