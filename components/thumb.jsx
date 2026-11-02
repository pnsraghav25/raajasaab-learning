import { CheckCircle2, Play } from "lucide-react";
import { clock } from "@/lib/format";
import { sizedThumb } from "@/lib/thumbnail";
import { cn } from "@/lib/utils";

const WIDTH = { xs: 240, sm: 320, md: 640, lg: 960 };
const PLAY = { xs: "h-6 w-6", sm: "h-9 w-9", md: "h-12 w-12", lg: "h-14 w-14" };
const PLAY_ICON = { xs: "h-2.5 w-2.5", sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" };

/**
 * A real image thumbnail. Only render this when an image is available —
 * otherwise use the text-only layout (no placeholders).
 * The parent element needs the `group` class for the hover effects.
 *
 * raw = true  → use `src` exactly as given (your own cover URLs)
 * raw = false → Wistia thumbnail, resized via Wistia's image parameters
 */
export function VideoThumb({
  src,
  raw = false,
  onError,
  size = "md",
  duration = 0,
  progress = 0,
  done = false,
  active = false,
  className,
}) {
  return (
    <span className={cn("relative block aspect-video shrink-0 overflow-hidden rounded-2xl bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={raw ? src : sizedThumb(src, WIDTH[size])}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={onError}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />

      <span
        className={cn(
          "absolute inset-0 grid place-items-center transition duration-300",
          active ? "bg-black/45" : "bg-black/0 group-hover:bg-black/30"
        )}
      >
        {active ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-white">Playing</span>
        ) : (
          <span
            className={cn(
              "grid scale-90 place-items-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-xl transition duration-300 group-hover:scale-100 group-hover:opacity-100",
              PLAY[size]
            )}
          >
            <Play className={cn("translate-x-px fill-current", PLAY_ICON[size])} />
          </span>
        )}
      </span>

      {done && !active && (
        <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 backdrop-blur">
          <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
        </span>
      )}
      {duration > 0 && (
        <span
          className={cn(
            "absolute rounded bg-black/75 font-semibold tabular-nums text-white",
            size === "xs" ? "bottom-1 right-1 px-1 text-[9px]" : "bottom-2 right-2 px-1.5 py-0.5 text-[11px]"
          )}
        >
          {clock(duration)}
        </span>
      )}
      {progress > 0 && (
        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
          <span className="block h-full bg-primary" style={{ width: `${Math.min(100, progress)}%` }} />
        </span>
      )}
    </span>
  );
}

/** Purple accent bar used by text-only cards and rows. */
export function HoverBar({ active = false, className }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-2 left-0 z-[1] w-[3px] origin-center rounded-r-full bg-primary transition-transform duration-200",
        active ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100",
        className
      )}
    />
  );
}
