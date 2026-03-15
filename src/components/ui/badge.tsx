import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-pill border border-transparent px-3 py-2 text-sm font-medium leading-[1.142857]",
  {
    variants: {
      variant: {
        success: "bg-[var(--color-success)] text-[var(--color-success-foreground)]",
        default: "bg-[var(--accent)] text-[var(--foreground)]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps): React.JSX.Element {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
