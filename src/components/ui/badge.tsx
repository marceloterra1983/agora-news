import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
  {
    variants: {
      variant: {
        default: "bg-ink text-paper",
        mark: "bg-mark text-mark-fg",
        outline: "border border-line-strong text-ink-soft",
        mute: "bg-paper-2 text-mute",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
