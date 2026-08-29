"use client";

import { cn } from "@/src/lib/utils";

type BrandLogoProps = {
  variant?: "full" | "mark";
  /** Kept for API compatibility; wordmark uses theme tokens. */
  theme?: "light" | "dark";
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

type RekallIQMarkProps = {
  className?: string;
  title?: string;
};

/**
 * Rekall-IQ — primary logo using the provided brand image.
 */
export function RekallIQMark({
  className,
  title,
}: RekallIQMarkProps) {
  return (
    <img
      src="/brand/rekall-logo.png"
      alt={title ?? "Rekall-IQ"}
      className={cn("shrink-0", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    />
  );
}

/**
 * The Rekall-IQ brand. In-app mark uses `/brand/rekall-logo.png`.
 * Raster `/brand/rekall-mark.jpeg` remains for email / apple-touch only.
 */
export function BrandLogo({
  variant = "full",
  theme = "dark",
  className,
  imageClassName,
  fallbackClassName,
}: BrandLogoProps) {
  void theme;

  if (variant === "mark") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <RekallIQMark className={cn("h-full w-full", imageClassName)} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <RekallIQMark
        className={cn("h-9 w-9 shrink-0", imageClassName)}
      />
      <span className="text-[18px] font-bold leading-none tracking-tight text-[var(--ink)] sm:text-[19px]">
        Rekall<span className="text-[var(--accent-jade)]">-IQ</span>
      </span>
      <span className={cn("sr-only", fallbackClassName)}>Rekall-IQ</span>
    </div>
  );
}
