# My Club

A web app for trampoline clubs to track their gymnasts' progress and manage competitions.

## Features

- **Gymnasts**: profiles with squad, level, guardian contact and medical info. Gymnasts can be archived to keep their history.
- **Skills**: each gymnast's status on every skill in the club catalogue: *Learning → With support → Without support → Independent → In routine*. Every change, including clearing a status, is logged in the gymnast's History tab with the date and who made it.
- **Skill notes**: per-gymnast notes on any skill, either a *current focus* (e.g. "keep head up for longer on take-off") or a *coaching point* to remember. Current focuses show under the skill name and in a summary at the top of the Skills tab. Marking a note done keeps it as history.
- **Groups**: custom groups of gymnasts (training sessions, competition teams, ability groups…), each with a colour and description. A gymnast can be in any number of groups. Add gymnasts from the group's page or from the gymnast's header, and filter the gymnast list by group. Deleting a group doesn't affect the gymnasts in it.
- **Training notes**: dated notes by type (general, injury, coaching, achievement). Injury notes stay open until marked resolved, and open injuries are flagged on the dashboard.
- **Targets**: free-text or skill-linked targets with due dates. A skill-linked target is marked achieved automatically when the skill reaches the goal status.
- **Competitions**: upcoming and past events, each with its own management page:
  - **Entries**: entry status, category and fee-paid tracking
  - **Routines**: two 10-skill routine cards per gymnast, with total tariff and warnings for repeated skills or skills not yet independent. Coaches can edit them until an admin locks the competition's routines (e.g. once cards are submitted)
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

> **Test accounts (development only):** `pnpm dev` creates five test accounts: Alex Admin, Casey Head Coach, Jordan Coach, Sam Parent (viewer) and Riley Volunteer (viewer). Pick one from the dropdown on the sign-in page to log in without a password. This is turned off in production builds (`import.meta.env.DEV`), so none of it reaches a deployed site. Their emails end in `@example.test`, and they show on the Users page like any other account.

Everyone signs in with an email and password. Admins add people on the **Users** page and give each one a role:

| Role | Can |
| --- | --- |
| **Admin** | Everything, including managing users, editing the skill catalogue, deleting gymnasts, and all competition management: details, entries, fees, routines (including locking them), tasks and results |
| **Coach** | Record skill progress, notes and targets; add and edit gymnasts and groups; edit routine cards unless an admin has locked them. Otherwise competitions are view-only |
| **Viewer** | Read-only. Guardian contact and medical details are hidden (injury notes are still visible) |

- New users get a temporary password from an admin and can change it under **Your account**. There is no email-based reset: if someone forgets their password, an admin resets it on the Users page.
- Deactivating a user signs them out everywhere straight away. The last active admin can't be removed or demoted.
- Permissions are enforced in every server function, not just hidden in the UI.
- Passwords are hashed with scrypt. Sessions use a 30-day httpOnly cookie, and only a hash of each session token is stored. After 10 failed sign-ins, an email is locked for 15 minutes. The count is kept in the database, so restarting the app doesn't reset it.
- Run it behind HTTPS in production: the session cookie is marked `Secure` when `NODE_ENV=production`.

Data is stored in SQLite at `data/club.db` using Node's built-in `node:sqlite`, so Node 22.13+ is required (24 recommended). Set `CLUB_DB_PATH` to store the file somewhere else. Delete the file to start fresh. Schema changes are applied automatically when the app starts.

## Deploying

The app is a single Node process with a SQLite file, so a small VPS, or any host that runs a Docker container with a persistent volume, is enough. Serverless platforms aren't suitable because the database is a local file.

### With Docker (recommended)

```bash
docker compose up -d --build
```

This builds the image, starts it on port 3000 (bound to `127.0.0.1` only, for a reverse proxy on the same machine), stores the database on the `club-data` volume, and restarts it automatically. Docker uses `/api/health` to report whether the container is healthy.

Without Compose:

```bash
docker build -t my-club .
docker run -d --name my-club --restart unless-stopped -p 127.0.0.1:3000:3000 -v club-data:/app/data my-club
```

### Without Docker

On a machine with Node 22.13+ and pnpm:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

`pnpm start` runs `server.mjs`, which serves the built app with `NODE_ENV=production`. Keep it running with systemd, pm2 or similar.

### HTTPS

Put the app behind a reverse proxy that handles HTTPS. Sign-in won't work over plain HTTP in production, because the session cookie is `Secure`. With [Caddy](https://caddyserver.com), which gets certificates automatically, the whole config is:

```
club.example.org {
    reverse_proxy 127.0.0.1:3000
}
```

### First run

A new install asks for a **setup code** before it will create the first admin account, so only someone with access to the server can claim the club. When the app starts with no accounts, it prints the code to its log:

```bash
docker compose logs app    # or wherever your process manager writes output
```

```
  ┌─ No admin account yet ──────────────────────────────
  │ To set up the club, open /setup and enter this code:
  │
  │     7KQM-X2RD-WN4P-HC9T
  ...
```

Open the site, enter the code along with your name, email and password, and you're the admin. The code is random, changes each time the app restarts, and isn't needed again once the first admin exists. To choose your own code instead, set `CLUB_SETUP_CODE` to a value of at least 12 characters; shorter values are ignored.

The development test accounts and their password-free sign-in don't exist in production builds.

### Settings

| Variable | Default | |
| --- | --- | --- |
| `PORT` | `3000` | Port to listen on |
| `HOST` | all interfaces | Interface to bind, e.g. `127.0.0.1` |
| `CLUB_DB_PATH` | `data/club.db` (`/app/data/club.db` in Docker) | Database file |
| `CLUB_SETUP_CODE` | random, printed to the log | Code needed to create the first admin (12+ characters) |
| `CLUB_BACKUP_DIR` | `backups/` next to the database | Where `pnpm backup` writes |
| `CLUB_BACKUP_KEEP` | `14` | How many backups to keep |

### Backups

Everything the club records is in the one database file. `pnpm backup` (or `node scripts/backup.mjs`) writes a consistent copy while the app is running, checks it, and deletes all but the newest 14:

```bash
# Docker
docker compose exec app node scripts/backup.mjs
# Otherwise
pnpm backup
```

Backups are named with the UTC time, e.g. `club-2026-11-19_19-45-13.db`. Schedule one a day, for example with cron:

```
30 2 * * * cd /srv/my-club && docker compose exec -T app node scripts/backup.mjs
```

The backups sit on the same disk (or Docker volume) as the database, so also copy them somewhere else regularly (rsync, rclone, your host's snapshots) or a disk failure takes both.

To restore: stop the app, replace `club.db` with the backup file, delete any `club.db-wal` and `club.db-shm` files next to it, then start the app again.

### Updating

Pull the new code and rebuild (`docker compose up -d --build`, or `pnpm install && pnpm build` and restart). Take a backup first. Any schema changes are applied when the app starts.

### Forgotten passwords

There's no email-based reset, because the app doesn't send email. An admin resets the password on the **Users** page and passes on the temporary password.

## Stack

TanStack Start (React, file-based routing, server functions), Tailwind CSS v4 and shadcn/ui on Base UI.

- `src/server/db.ts`: schema, migrations and database access
- `src/server/functions/`: all reads and writes, as server functions, one file per area (gymnasts, progress, notes, competitions, groups…)
- `src/server/auth.ts` and `auth-functions.ts`: passwords, sessions, role checks, sign-in and user management
- `src/lib/domain.ts`: shared types, status lists and date helpers
- `src/routes/`: pages. `src/routes/api/health.ts` is the health check
- `src/components/gymnast/` and `src/components/competition/`: the tabs of the gymnast and competition pages
- `server.mjs`: production server. `scripts/backup.mjs`: database backup
