import { Link } from "@tanstack/react-router"
import { cn } from "cn"
import type { DashboardView } from "@/server/functions/dashboard"
import type { DashboardData } from "./data"

/** "My groups" / "Whole club" switch. */
export function ViewBar({ data }: { data: DashboardData }) {
  const views: { value: DashboardView; label: string }[] = [
    { value: "mine", label: "My groups" },
    { value: "all", label: "Whole club" },
  ]
  return (
    <nav
      aria-label="Dashboard view"
      className="flex w-fit gap-0.5 rounded-[10px] border border-[#d6dfeb] bg-muted p-[3px]"
    >
      {views.map((v) => (
        <Link
          key={v.value}
          to="/"
          search={{ view: v.value }}
          replace
          aria-current={data.view === v.value ? "page" : undefined}
          className={cn(
            "rounded-[7px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
            data.view === v.value
              ? "bg-white text-foreground shadow-[0_1px_3px_rgb(11_31_61/0.18)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {v.label}
        </Link>
      ))}
    </nav>
  )
}
