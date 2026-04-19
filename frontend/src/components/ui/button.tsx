import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * ## Button hierarchy contract
 *
 * Pick exactly ONE primary-class button per interaction zone (page header,
 * dialog footer, card CTA row). Everything else must be lower in the
 * hierarchy so the primary wins the visual-weight competition.
 *
 * | Tier       | Variants                                  | When to use                                  |
 * | ---------- | ----------------------------------------- | -------------------------------------------- |
 * | Primary    | `default` · `destructive` · `gradient`    | The ONE action you want the user to take.    |
 * | Secondary  | `outline` · `secondary`                   | Alternative actions (cancel, filter, edit).  |
 * | Tertiary   | `ghost` · `link`                          | Icon buttons, inline links, nav chrome.      |
 * | Decorative | `ai` · `neon` · `neon-pink` · `gradient-outline` | Marketing / hero / brand moments only. |
 *
 * Primary-class variants use `font-semibold` so they pull attention (Fitts's
 * Law): larger perceived weight ⇒ faster target acquisition. Secondary and
 * tertiary tiers stay at `font-medium` so they recede.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        /** Primary CTA — use once per interaction zone. */
        default:
          "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:shadow-glow-sm",
        /** Primary destructive CTA (delete, irreversible). Use once per dialog. */
        destructive:
          "bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90",
        /** Secondary action. Neutral weight; pairs with one primary. */
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent-indigo/50",
        /** Secondary action (filled, softer than primary). */
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        /** Tertiary action. Reserve for icon buttons, nav, and inline chrome. */
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        /** Tertiary inline link. Never use as a primary CTA. */
        link:
          "text-primary underline-offset-4 hover:underline",
        /** Primary-class hero CTA (marketing / onboarding). */
        gradient:
          "bg-gradient-primary text-white font-semibold hover:shadow-glow-md hover:scale-[1.02]",
        /** Decorative — use only on marketing / landing pages. */
        "gradient-outline":
          "border-2 border-transparent bg-clip-padding bg-gradient-primary text-white hover:shadow-glow-sm [background:linear-gradient(hsl(var(--color-bg-secondary)),hsl(var(--color-bg-secondary)))_padding-box,linear-gradient(135deg,hsl(var(--color-accent-indigo)),hsl(var(--color-accent-purple)))_border-box]",
        /** Decorative — AI / Ask-AI entry points only. */
        ai:
          "relative overflow-hidden bg-bg-tertiary text-foreground hover:shadow-glow-md before:absolute before:inset-0 before:bg-gradient-ai before:opacity-0 before:transition-opacity hover:before:opacity-100 before:bg-[length:200%_100%] before:animate-gradient-flow",
        /** Decorative — brand neon treatment. */
        neon:
          "bg-transparent border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 hover:shadow-glow-neon",
        /** Decorative — brand neon treatment. */
        "neon-pink":
          "bg-transparent border border-neon-pink text-neon-pink hover:bg-neon-pink/10 hover:shadow-glow-pink",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-8 text-base",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Show loading spinner */
  loading?: boolean
  /** Icon to show before text */
  leftIcon?: React.ReactNode
  /** Icon to show after text */
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="sr-only">Loading</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
