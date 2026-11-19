# My Club

A web app for trampoline clubs to track their gymnasts' progress and manage competitions.

## Features

- **Gymnasts**: profiles with squad, level, guardian contact and medical info. Gymnasts can be archived to keep their history.
- **Skills**: each gymnast's status on every skill in the club catalogue: *Learning → With support → Without support → Independent → In routine*. Every change is logged in the gymnast's History tab.
- **Training notes**: dated notes by type (general, injury, coaching, achievement). Injury notes stay open until marked resolved, and open injuries are flagged on the dashboard.
- **Targets**: free-text or skill-linked targets with due dates. A skill-linked target is marked achieved automatically when the skill reaches the goal status.
- **Competitions**: upcoming and past events, each with its own management page:
  - **Entries**: entry status, category and fee-paid tracking
  - **Routines**: two 10-skill routine cards per gymnast, with total tariff and warnings for repeated skills or skills not yet independent
  - **Tasks**: club checklist (submit entries, collect fees, book judges…)
  - **Results**: scores, placings and notes
- **Skill catalogue**: about 35 starter skills with default tariffs. You can edit, add and remove skills.

## Running

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. On first run you'll be asked to create the club's first admin account. After that, the dashboard offers to load demo data.

## Accounts and roles

Everyone signs in with an email and password. Admins add people on the **Users** page and give each one a role:

| Role | Can |
| --- | --- |
| **Admin** | Everything, including managing users, editing the skill catalogue and deleting gymnasts or competitions |
| **Coach** | Record skill progress, notes and targets; add and edit gymnasts and competitions; manage entries, routines, tasks and results |
| **Viewer** | Read-only. Guardian contact and medical details are hidden (injury notes are still visible) |

- New users get a temporary password from an admin and can change it under **Your account**. There is no email-based reset: if someone forgets their password, an admin resets it on the Users page.
- Deactivating a user signs them out everywhere straight away. The last active admin can't be removed or demoted.
- Permissions are enforced in every server function, not just hidden in the UI.
- Passwords are hashed with scrypt. Sessions use a 30-day httpOnly cookie, and only a hash of each session token is stored. After 10 failed sign-ins, an email is locked for 15 minutes.
- Run it behind HTTPS in production: the session cookie is marked `Secure` when `NODE_ENV=production`.

Data is stored in SQLite at `data/club.db` using Node's built-in `node:sqlite`, so Node 22.5+ is required. Set `CLUB_DB_PATH` to store the file somewhere else. Delete the file to start fresh.

## Stack

TanStack Start (React, file-based routing, server functions), Tailwind CSS v4 and shadcn/ui on Base UI.

- `src/server/db.ts`: schema and database access
- `src/server/functions.ts`: all reads and writes, as server functions
- `src/server/auth.ts` and `auth-functions.ts`: passwords, sessions, role checks, sign-in and user management
- `src/lib/domain.ts`: shared types, status lists and date helpers
- `src/routes/`: pages
