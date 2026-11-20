import type * as React from "react"
import { ClubLogo } from "@/components/avatar"
import { CLUB } from "@/lib/club"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 pt-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <ClubLogo className="size-20 shadow-[0_0_0_4px_var(--sidebar)]" />
        <div className="flex flex-col leading-tight">
          <span className="text-xl font-extrabold tracking-tight">
            {CLUB.name}
          </span>
          <span className="text-sm text-muted-foreground">{CLUB.tagline}</span>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}

/** Only follow same-site relative redirects, never to another origin. */
export function safeRedirect(target: string | undefined) {
  return target && target.startsWith("/") && !target.startsWith("//")
    ? target
    : "/"
}
