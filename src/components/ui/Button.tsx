import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-pill text-sm font-medium leading-[1.4286] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
        secondary: "border border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]",
        outline: "border border-[var(--input)] bg-white text-[var(--foreground)]",
        ghost: "border border-transparent bg-[var(--accent)] text-[var(--foreground)]"
      },
      size: {
        default: "h-10 gap-1.5 px-4 py-2",
        lg: "h-12 gap-1.5 px-4 py-2.5",
        icon: "h-8 w-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
