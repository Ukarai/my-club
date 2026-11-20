import { createFileRoute, useRouter } from "@tanstack/react-router"
import { login } from "@/server/functions/session"
import { listTestAccounts, testLogin } from "@/server/functions/test-login"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FormError, NativeSelect, formValues } from "@/components/form"
import { useAction } from "@/lib/use-action"
import { labelFor } from "@/lib/domain"
import { ROLES } from "@/lib/roles"
import { AuthCard, safeRedirect } from "@/components/auth-card"

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s.redirect === "string" ? { redirect: s.redirect } : {},
  loader: () => listTestAccounts(),
  component: LoginPage,
})

function LoginPage() {
  const { redirect } = Route.useSearch()
  const router = useRouter()
  const testAccounts = Route.useLoaderData()
  const done = async () => {
    await router.invalidate()
    await router.history.push(safeRedirect(redirect))
  }
  const submit = useAction(async (form: HTMLFormElement) => {
    const v = formValues(form)
    await login({ data: { email: v.email, password: v.password } })
    await done()
  })
  const quick = useAction(async (form: HTMLFormElement) => {
    await testLogin({ data: formValues(form).account })
    await done()
  })

  return (
    <AuthCard
      title="Sign in"
      description="Use the account your club admin set up for you."
    >
      {testAccounts.length > 0 && (
        <form
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-dashed border-amber-500/50 bg-amber-500/5 p-3"
          onSubmit={(e) => {
            e.preventDefault()
            quick.run(e.currentTarget)
          }}
        >
          <Field label="Test account (development only)" htmlFor="account">
            <NativeSelect id="account" name="account">
              {testAccounts.map((a) => (
                <option key={a.email} value={a.email}>
                  {a.name} · {labelFor(ROLES, a.role)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <FormError error={quick.error} />
          <Button type="submit" variant="outline" disabled={quick.pending}>
            {quick.pending ? "Signing in…" : "Sign in as test account"}
          </Button>
        </form>
      )}
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
