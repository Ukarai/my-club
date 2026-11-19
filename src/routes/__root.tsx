import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
  redirect,
  useRouter,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import {
  LayoutDashboard,
  ListChecks,
  LogOut,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from "lucide-react"
import { getSession, logout } from "@/server/auth-functions"
import { Button } from "@/components/ui/button"
import { useUser } from "@/lib/use-user"

import appCss from "../styles.css?url"

const PUBLIC_PATHS = ["/login", "/setup"]

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "My Club — Trampoline progress" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  // Every navigation checks the session: no account yet → first-run setup,
  // signed out → login page (remembering where they were going).
  beforeLoad: async ({ location }) => {
    const { user, needsSetup } = await getSession()
    const path = location.pathname
    if (needsSetup) {
      if (path !== "/setup") throw redirect({ to: "/setup" })
      return { user: null }
    }
    if (!user) {
      if (path === "/setup") throw redirect({ to: "/login" })
      if (!PUBLIC_PATHS.includes(path))
        throw redirect({ to: "/login", search: { redirect: location.href } })
      return { user: null }
    }
    if (PUBLIC_PATHS.includes(path)) throw redirect({ to: "/" })
    return { user }
  },
  notFoundComponent: () => (
    <div className="p-4 pt-16">
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="text-muted-foreground">
        The page you asked for doesn&apos;t exist.
      </p>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex flex-col items-start gap-2 p-4 pt-16">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">
        {error instanceof Error ? error.message : String(error)}
      </p>
      <a href="/" className="text-sm text-primary underline">
        Back to the dashboard
      </a>
    </div>
  ),
  shellComponent: RootDocument,
})

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/gymnasts", label: "Gymnasts", icon: Users, exact: false },
  { to: "/skills", label: "Skills", icon: ListChecks, exact: false },
  { to: "/competitions", label: "Competitions", icon: Trophy, exact: false },
] as const

const navLink =
  "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-muted data-[status=active]:font-medium data-[status=active]:text-foreground"

function Header() {
  const user = useUser()
  const router = useRouter()
  if (!user) return null

  async function signOut() {
    await logout()
    await router.invalidate()
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
        <Link to="/" className="mr-2 flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-xl bg-primary text-sm text-primary-foreground">
            ⤒
          </span>
          <span className="hidden sm:inline">My Club</span>
        </Link>
        <nav className="flex flex-1 gap-1 overflow-x-auto">
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact }}
              className={navLink}
            >
              <Icon className="size-4" />
              <span className="max-md:sr-only">{label}</span>
            </Link>
          ))}
          {user.role === "admin" && (
            <Link to="/users" className={navLink}>
              <ShieldCheck className="size-4" />
              <span className="max-md:sr-only">Users</span>
            </Link>
          )}
        </nav>
        <Link to="/account" className={navLink} title="Your account">
          <UserRound className="size-4" />
          <span className="max-w-32 truncate max-md:sr-only">{user.name}</span>
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={signOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut />
        </Button>
      </div>
    </header>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-svh">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <TanStackDevtools
          config={{ position: "bottom-right" }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
