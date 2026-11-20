import { Link } from "@tanstack/react-router"
import { NAV } from "@/components/shell/nav"

/** Phone bottom tab bar. */
export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-around bg-sidebar px-1.5 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_14px_rgb(11_31_61/0.18)] md:hidden"
    >
      {NAV.map(({ to, short, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="group flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-[#a8bbd8] data-[status=active]:font-bold data-[status=active]:text-white"
        >
          <span className="flex h-[30px] w-13 items-center justify-center rounded-full group-data-[status=active]:bg-sidebar-accent group-data-[status=active]:shadow-[inset_0_-2px_0_var(--sidebar-edge)]">
            <Icon className="size-5" />
          </span>
          {short}
        </Link>
      ))}
    </nav>
  )
}
