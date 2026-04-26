import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-white shadow-[0_12px_30px_rgba(162,62,43,0.22)] hover:-translate-y-0.5 hover:bg-[#8a3525]",
        secondary: "bg-secondary text-white shadow-[0_12px_30px_rgba(47,93,80,0.22)] hover:-translate-y-0.5 hover:bg-[#274d42]",
        outline: "border border-border bg-white/70 text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-white/70",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />
  ),
);
Button.displayName = "Button";
