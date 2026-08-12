import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-zinc-200/80 bg-white/90 shadow-sm shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900/80",
        className
      )}
      {...props}
    />
  );
}
