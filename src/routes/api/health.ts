// Health check for Docker, load balancers and uptime monitors.
// 200 when the app can query its database, 503 otherwise. Public, and
// deliberately says nothing else about the app.
import { createFileRoute } from "@tanstack/react-router"

const headers = { "Cache-Control": "no-store" }

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          // Imported here so the database module never reaches the browser.
          const { get } = await import("@/server/db")
          get("SELECT 1")
          return Response.json({ status: "ok" }, { headers })
        } catch {
          return Response.json({ status: "error" }, { status: 503, headers })
        }
      },
    },
  },
})
