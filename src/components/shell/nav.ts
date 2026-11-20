import {
  Layers,
  LayoutDashboard,
  ListChecks,
  Trophy,
  Users,
} from "lucide-react"

export const NAV = [
  { to: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { to: "/gymnasts", label: "Gymnasts", short: "Gymnasts", icon: Users },
  { to: "/groups", label: "Groups", short: "Groups", icon: Layers },
  { to: "/skills", label: "Skills", short: "Skills", icon: ListChecks },
  { to: "/competitions", label: "Competitions", short: "Comps", icon: Trophy },
] as const
