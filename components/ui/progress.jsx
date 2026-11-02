import { cn } from "@/lib/utils";

export function Progress({ value = 0, max = 100, className, indicatorClassName, label = "Progress" }) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.max(0, (Number(value) / safeMax) * 100)) || 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Number(value) || 0}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full bg-linear-to-r from-primary to-accent transition-[width] duration-500", indicatorClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
