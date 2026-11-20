import type * as React from "react"
import { PhoneHeader } from "@/components/shell/phone-header"
import { Sidebar } from "@/components/shell/sidebar"
import { TabBar } from "@/components/shell/tab-bar"
import { useUser } from "@/lib/use-user"

/** Signed-in layout: sidebar on wide screens, top bar and tab bar on phones. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useUser()
  if (!user) {
    return <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
  }
  return (
    <div className="md:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <PhoneHeader />
        <main className="mx-auto max-w-6xl px-4 pt-4 pb-28 md:px-9 md:pt-8 md:pb-12">
          {children}
        </main>
      </div>
      <TabBar />
    </div>
  )
}
