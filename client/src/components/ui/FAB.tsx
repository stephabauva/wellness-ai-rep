import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@shared"

const fabVariants = cva(
  "fixed z-50 inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-lg hover:shadow-xl active:scale-95 touch-manipulation",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700",
        secondary:
          "bg-white text-purple-600 border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-300 active:bg-purple-100",
        outline:
          "bg-transparent border-2 border-purple-500 text-purple-600 hover:bg-purple-50 active:bg-purple-100",
      },
      size: {
        default: "h-14 w-14 min-h-[56px] min-w-[56px]",
        sm: "h-12 w-12 min-h-[48px] min-w-[48px]",
        lg: "h-16 w-16 min-h-[64px] min-w-[64px]",
      },
      position: {
        "bottom-right": "bottom-6 right-6 md:bottom-8 md:right-8",
        "bottom-left": "bottom-6 left-6 md:bottom-8 md:left-8",
        "bottom-center": "bottom-6 left-1/2 transform -translate-x-1/2 md:bottom-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      position: "bottom-right",
    },
  }
)

export interface FABProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof fabVariants> {
  children?: React.ReactNode
  asChild?: boolean
}

const FAB = React.forwardRef<HTMLButtonElement, FABProps>(
  ({ className, variant, size, position, children, asChild = false, ...props }, ref) => {
    const Comp = asChild ? React.Fragment : "button"
    
    return (
      <Comp
        className={cn(fabVariants({ variant, size, position, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)

FAB.displayName = "FAB"

export { FAB, fabVariants }