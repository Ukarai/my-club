import type * as React from "react"
import {
  HeadContent,
  Scripts,
  createRootRoute,
  redirect,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { getSession } from "@/server/functions/session"
import { AppShell } from "@/components/shell/app-shell"
import { CLUB } from "@/lib/club"

import appCss from "../styles.css?url"

const PUBLIC_PATHS = ["/login", "/setup"]

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${CLUB.name} — Trampoline progress` },
      { name: "theme-color", content: "#0b1f3d" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: CLUB.logo, type: "image/webp" },
    ],
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

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-svh">
        <AppShell>{children}</AppShell>
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
