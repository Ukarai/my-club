import type * as React from "react"
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
      <div className="flex items-center justify-center gap-2 text-lg font-semibold">
        <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
          ⤒
        </span>
        My Club
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
