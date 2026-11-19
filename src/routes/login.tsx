import { createFileRoute, useRouter } from "@tanstack/react-router"
import { login } from "@/server/auth-functions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FormError, formValues, useAction } from "@/components/form"
import { AuthCard, safeRedirect } from "@/components/auth-card"

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s.redirect === "string" ? { redirect: s.redirect } : {},
  component: LoginPage,
})

function LoginPage() {
  const { redirect } = Route.useSearch()
  const router = useRouter()
  const submit = useAction(async (form: HTMLFormElement) => {
    const v = formValues(form)
    await login({ data: { email: v.email, password: v.password } })
    await router.invalidate()
    await router.history.push(safeRedirect(redirect))
  })

  return (
    <AuthCard
      title="Sign in"
      description="Use the account your club admin set up for you."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit.run(e.currentTarget)
        }}
      >
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <FormError error={submit.error} />
        <Button type="submit" size="lg" disabled={submit.pending}>
          {submit.pending ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Forgotten your password? Ask a club admin to reset it.
        </p>
      </form>
    </AuthCard>
  )
}
