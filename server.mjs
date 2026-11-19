// Production server. Run `pnpm build` first, then `pnpm start`.
//
// Serves the built client files from dist/client and hands every other
// request to the TanStack Start handler in dist/server.
//
// Environment:
//   PORT          port to listen on (default 3000)
//   HOST          interface to bind (default: all)
//   CLUB_DB_PATH  SQLite database file (default data/club.db)
import { serve } from "srvx"
import { staticMiddleware } from "srvx/static"

// Set before the app loads: React picks its production build from this, and
// the session cookie is only marked Secure in production.
process.env.NODE_ENV ??= "production"

const { default: app } = await import("./dist/server/server.js")

// Vite's hashed bundles never change, so browsers can cache them for a year.
// Everything else (favicon, manifest…) revalidates.
const assets = staticMiddleware({
  dir: "dist/client",
  maxAge: 31_536_000,
  immutable: true,
})
const files = staticMiddleware({ dir: "dist/client" })

serve({
  port: process.env.PORT || 3000,
  hostname: process.env.HOST || undefined,
  middleware: [
    (req, next) =>
      new URL(req.url).pathname.startsWith("/assets/")
        ? assets(req, next)
        : files(req, next),
  ],
  fetch: app.fetch,
})
