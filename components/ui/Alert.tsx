import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "error" | "warning";

const toneClasses: Record<Tone, string> = {
  info: "bg-blue-50 text-blue-900 border-blue-200",
  success: "bg-emerald-50 text-emerald-900 border-emerald-200",
  error: "bg-red-50 text-red-900 border-red-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
};

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
