import { Link, useRouter } from "@tanstack/react-router"
import { loadDemoData } from "@/server/functions/demo"
import { ClubLogo } from "@/components/club-logo"
import { FormError } from "@/components/form"
import { Button } from "@/components/ui/button"
import { CLUB } from "@/lib/club"
import { useAction } from "@/lib/use-action"
import { useCan } from "@/lib/use-user"

export function Welcome() {
  const router = useRouter()
  const canEdit = useCan("coach")
  const isAdmin = useCan("admin")
  const demo = useAction(async () => {
    await loadDemoData()
    await router.invalidate()
  })
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 pt-6 md:pt-10">
      <ClubLogo className="size-16 shadow-[0_0_0_3px_var(--sidebar)]" />
      <h1 className="text-[26px] font-extrabold tracking-tight">
        Welcome to {CLUB.name}
      </h1>
      <p className="text-muted-foreground">
        Track each gymnast&apos;s skills, training notes and targets, and manage
        your club&apos;s competition entries in one place.
      </p>
      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <Button
            size="lg"
            nativeButton={false}
            render={<Link to="/gymnasts" search={{ add: true }} />}
          >
            Add your first gymnast
          </Button>
        )}
        {isAdmin && (
          <Button
            size="lg"
            variant="outline"
            onClick={() => demo.run()}
            disabled={demo.pending}
          >
            {demo.pending ? "Loading…" : "Load demo data"}
          </Button>
        )}
      </div>
      <FormError error={demo.error} />
    </div>
  )
}
