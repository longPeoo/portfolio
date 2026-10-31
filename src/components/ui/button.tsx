import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Hiệu ứng "Mission Log": nảy lò xo khi rê chuột, icon cuối nhích chéo lên
const springHover =
  "duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5 active:scale-[0.98] [&_[data-icon]]:transition-transform [&_[data-icon]]:duration-300 [&_[data-icon]]:ease-[var(--ease-spring)] hover:[&_[data-icon=inline-end]]:translate-x-0.5 hover:[&_[data-icon=inline-end]]:-translate-y-0.5 hover:[&_[data-icon=inline-end]]:-rotate-[8deg]"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        // Nút chính kiểu gốc: viên thuốc cam, bóng đổ nét mực
        launch: `rounded-full bg-primary font-semibold text-primary-foreground shadow-[0_2px_0_0_var(--c-ink)] hover:shadow-[0_5px_0_0_var(--c-ink)] ${springHover}`,
        // Nút phụ kiểu gốc: viền theo màu chữ, đảo màu khi rê chuột
        "launch-outline": `rounded-full border-[1.5px] border-current bg-transparent font-semibold hover:bg-foreground hover:text-background ${springHover}`,
        // Nút "Liên hệ" trên thanh menu: viên thuốc màu mực, chuyển cam khi rê chuột
        ink: "rounded-full bg-foreground font-semibold text-background duration-300 ease-[var(--ease-spring)] hover:-translate-y-px hover:bg-primary hover:text-primary-foreground",
        // Nút icon mạng xã hội: nảy lên, nghiêng, đổi sang màu cam
        social:
          "rounded-full border-border duration-300 ease-[var(--ease-spring)] hover:-translate-y-1 hover:-rotate-[8deg] hover:border-transparent hover:bg-primary hover:text-primary-foreground",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        // Cỡ cho nút launch / launch-outline
        pill: "h-11 gap-2.5 px-5 text-sm has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
