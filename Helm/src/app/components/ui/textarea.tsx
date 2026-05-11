import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-[var(--border)] placeholder:text-muted-foreground hover:border-[#CBD5E1] focus-visible:border-indigo-400 focus-visible:ring-indigo-100 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-lg border bg-input-background px-3 py-2 text-base shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-150 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
