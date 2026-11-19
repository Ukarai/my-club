// Production server. Run `pnpm build` first, then `pnpm start`.
//
// Serves the built client files from dist/client and hands every other
// request to the TanStack Start handler in dist/server.
//
// Environment:
//   PORT          port to listen on (default 3000)
//   HOST          interface to bind (default: all)
//   CLUB_DB_PATH  SQLite database file (default data/club.db)
//   CLUB_SETUP_CODE  code needed to create the first admin (default: random,
//                    printed to the log)
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

// Warm up: opens the database (applying any schema changes) before the first
// visitor arrives and, on a fresh install, prints the setup code to the log.
await app.fetch(new Request("http://localhost/")).catch((e) => {
  console.error("Warm-up request failed:", e)
})
