import { createFileRoute, useRouter } from "@tanstack/react-router"
import { createFirstAdmin } from "@/server/auth-functions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FormError, formValues, useAction } from "@/components/form"
import { AuthCard } from "@/components/auth-card"
import { MIN_PASSWORD_LENGTH } from "@/lib/domain"

export const Route = createFileRoute("/setup")({
  component: SetupPage,
})

function SetupPage() {
  const router = useRouter()
  const submit = useAction(async (form: HTMLFormElement) => {
    const v = formValues(form)
    if (v.password !== v.confirm) throw new Error("Passwords don't match")
    await createFirstAdmin({
      data: { name: v.name, email: v.email, password: v.password },
    })
    await router.invalidate()
    await router.history.push("/")
  })

  return (
    <AuthCard
      title="Set up your club"
      description="Create the first admin account. You can add coaches and other users afterwards."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit.run(e.currentTarget)
        }}
      >
        <Field label="Your name" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" required autoFocus />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </Field>
        <Field label="Confirm password" htmlFor="confirm">
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>
        <FormError error={submit.error} />
        <Button type="submit" size="lg" disabled={submit.pending}>
          {submit.pending ? "Creating…" : "Create admin account"}
        </Button>
      </form>
    </AuthCard>
  )
}
