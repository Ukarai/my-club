import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { changeOwnPassword } from "@/server/functions/account"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FormError, formValues } from "@/components/form"
import { useAction } from "@/lib/use-action"
import { useUser } from "@/lib/use-user"
import { MIN_PASSWORD_LENGTH, labelFor } from "@/lib/domain"
import { ROLES } from "@/lib/roles"

export const Route = createFileRoute("/account")({
  component: AccountPage,
})

function AccountPage() {
  const user = useUser()
  const [done, setDone] = React.useState(false)
  const change = useAction(async (form: HTMLFormElement) => {
    const v = formValues(form)
    if (v.next !== v.confirm) throw new Error("New passwords don't match")
    await changeOwnPassword({ data: { current: v.current, next: v.next } })
    form.reset()
    setDone(true)
  })
  if (!user) return null

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{user.name}</h1>
        <p className="text-sm text-muted-foreground">
          {user.email} · {labelFor(ROLES, user.role)}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              setDone(false)
              change.run(e.currentTarget)
            }}
          >
            <Field label="Current password" htmlFor="current">
              <Input
                id="current"
                name="current"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="New password" htmlFor="next">
              <Input
                id="next"
                name="next"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm">
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
              />
            </Field>
            <FormError error={change.error} />
            {done && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                Password changed. Any other devices have been signed out.
              </p>
            )}
            <Button type="submit" disabled={change.pending}>
              {change.pending ? "Saving…" : "Change password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
