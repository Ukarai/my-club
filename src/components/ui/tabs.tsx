"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex flex-col gap-2", className)}
      {...props}
    />
  )
}

// Underline tabs: a 2px baseline with a 3px primary bar under the active tab.
const tabsListVariants = cva(
  "group/tabs-list flex w-full max-w-full [scrollbar-width:none] items-end gap-1 overflow-x-auto overflow-y-hidden text-muted-foreground shadow-[inset_0_-2px_0_var(--border)]",
  {
    variants: {
      variant: {
        default: "",
        line: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-11 shrink-0 items-center justify-center gap-1.5 px-3.5 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:font-bold data-active:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-t-sm after:bg-primary after:opacity-0 after:transition-opacity data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

/** Small count pill for a tab label. */
function TabCount({ n }: { n: number }) {
  if (!n) return null
  return (
    <span className="rounded-full bg-[#d9e1ec] px-[7px] text-xs font-semibold text-[#364660] tabular-nums">
      {n}
    </span>
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabCount, tabsListVariants }
