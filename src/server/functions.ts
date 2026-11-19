import { createServerFn } from "@tanstack/react-start"
import { requireRole } from "./auth"
import { all, get, run, tx } from "./db"
import { SKILL_NOTE_KINDS, SKILL_STATUSES, hasRole, today } from "@/lib/domain"
import type {
  CompTask,
  Competition,
  CompetitionSummary,
  Entry,
  Gymnast,
  GymnastEntry,
  GymnastSkill,
  GymnastSummary,
  Note,
  SkillNote,
  Skill,
  SkillHistory,
  SkillStatus,
  Target,
} from "@/lib/domain"

const input =
  <T>() =>
  (d: T) =>
    d
const blank = (v: string | null | undefined) =>
  v && v.trim() ? v.trim() : null
const rank = (s: string | null) =>
  SKILL_STATUSES.findIndex((x) => x.value === s)

// ───────────────────────────── Dashboard ─────────────────────────────

export const getDashboard = createServerFn({ method: "GET" }).handler(
  async () => {
    requireRole("viewer")
    const t = today()
    return {
      counts: get<{
        gymnasts: number
        skills: number
        targets: number
        injuries: number
      }>(
        `SELECT
        (SELECT count(*) FROM gymnasts WHERE active = 1) AS gymnasts,
        (SELECT count(*) FROM skills) AS skills,
        (SELECT count(*) FROM targets t JOIN gymnasts g ON g.id = t.gymnast_id
           WHERE t.status = 'active' AND g.active = 1) AS targets,
        (SELECT count(*) FROM notes n JOIN gymnasts g ON g.id = n.gymnast_id
           WHERE n.category = 'injury' AND n.resolved = 0 AND g.active = 1) AS injuries`
      )!,
      upcoming: all<CompetitionSummary>(
        `SELECT c.*,
        (SELECT count(*) FROM competition_entries e WHERE e.competition_id = c.id AND e.status != 'withdrawn') AS entry_count,
        (SELECT count(*) FROM competition_tasks k WHERE k.competition_id = c.id AND k.done = 0) AS open_tasks
       FROM competitions c
       WHERE coalesce(c.end_date, c.start_date) >= ? AND c.status != 'cancelled'
       ORDER BY c.start_date LIMIT 5`,
        t
      ),
      targetsDue: all<Target & { gymnast_name: string }>(
        `SELECT t.*, s.name AS skill_name, g.first_name || ' ' || g.last_name AS gymnast_name
       FROM targets t JOIN gymnasts g ON g.id = t.gymnast_id
       LEFT JOIN skills s ON s.id = t.skill_id
       WHERE t.status = 'active' AND g.active = 1
       ORDER BY t.target_date IS NULL, t.target_date LIMIT 8`
      ),
      injuries: all<Note & { gymnast_name: string }>(
        `SELECT n.*, g.first_name || ' ' || g.last_name AS gymnast_name
       FROM notes n JOIN gymnasts g ON g.id = n.gymnast_id
       WHERE n.category = 'injury' AND n.resolved = 0 AND g.active = 1
       ORDER BY n.noted_on DESC`
      ),
      recentProgress: all<
        SkillHistory & { gymnast_id: number; gymnast_name: string }
      >(
        `SELECT h.*, s.name AS skill_name, g.first_name || ' ' || g.last_name AS gymnast_name
       FROM skill_history h JOIN skills s ON s.id = h.skill_id
       JOIN gymnasts g ON g.id = h.gymnast_id
       ORDER BY h.recorded_on DESC, h.id DESC LIMIT 10`
      ),
    }
  }
)

// ───────────────────────────── Gymnasts ─────────────────────────────

export const listGymnasts = createServerFn({ method: "GET" }).handler(
  async () => {
    requireRole("viewer")
    // The list never needs contact or medical details, so they're never sent.
    return all<GymnastSummary>(
      `SELECT g.id, g.first_name, g.last_name, g.date_of_birth, g.squad, g.level, g.active,
      g.created_at, NULL AS guardian_contact, NULL AS medical_info,
      (SELECT count(*) FROM gymnast_skills x WHERE x.gymnast_id = g.id AND x.status IN ('independent','in_routine')) AS independent_count,
      (SELECT count(*) FROM gymnast_skills x WHERE x.gymnast_id = g.id AND x.status NOT IN ('independent','in_routine')) AS in_progress_count,
      (SELECT count(*) FROM targets t WHERE t.gymnast_id = g.id AND t.status = 'active') AS active_targets,
      (SELECT count(*) FROM notes n WHERE n.gymnast_id = g.id AND n.category = 'injury' AND n.resolved = 0) AS open_injuries
     FROM gymnasts g ORDER BY g.active DESC, g.last_name, g.first_name`
    )
  }
)

export const getGymnast = createServerFn({ method: "GET" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    const user = requireRole("viewer")
    const gymnast = get<Gymnast>("SELECT * FROM gymnasts WHERE id = ?", id)
    if (!gymnast) throw new Error("Gymnast not found")
    // Viewers (e.g. volunteers) don't see personal contact or medical details.
    if (!hasRole(user, "coach")) {
      gymnast.guardian_contact = null
      gymnast.medical_info = null
    }
    return {
      gymnast,
      skills: all<Skill>("SELECT * FROM skills ORDER BY sort_order, name"),
      gymnastSkills: all<GymnastSkill>(
        "SELECT skill_id, status, updated_at, note FROM gymnast_skills WHERE gymnast_id = ?",
        id
      ),
      history: all<SkillHistory>(
        `SELECT h.*, s.name AS skill_name FROM skill_history h JOIN skills s ON s.id = h.skill_id
         WHERE h.gymnast_id = ? ORDER BY h.recorded_on DESC, h.id DESC LIMIT 50`,
        id
      ),
      notes: all<Note>(
        "SELECT * FROM notes WHERE gymnast_id = ? ORDER BY noted_on DESC, id DESC",
        id
      ),
      skillNotes: all<SkillNote>(
        `SELECT * FROM skill_notes WHERE gymnast_id = ?
         ORDER BY archived, CASE kind WHEN 'focus' THEN 0 ELSE 1 END, noted_on DESC, id DESC`,
        id
      ),
      targets: all<Target>(
        `SELECT t.*, s.name AS skill_name FROM targets t LEFT JOIN skills s ON s.id = t.skill_id
         WHERE t.gymnast_id = ?
         ORDER BY CASE t.status WHEN 'active' THEN 0 ELSE 1 END, t.target_date IS NULL, t.target_date`,
        id
      ),
      entries: all<GymnastEntry>(
        `SELECT e.id, e.competition_id, c.name AS competition_name, c.start_date, e.category,
                e.status, e.score, e.placing
         FROM competition_entries e JOIN competitions c ON c.id = e.competition_id
         WHERE e.gymnast_id = ? ORDER BY c.start_date DESC`,
        id
      ),
    }
  })

export type GymnastInput = {
  id?: number
  first_name: string
  last_name: string
  date_of_birth?: string | null
  squad?: string | null
  level?: string | null
  guardian_contact?: string | null
  medical_info?: string | null
}

export const saveGymnast = createServerFn({ method: "POST" })
  .validator(input<GymnastInput>())
  .handler(async ({ data: d }) => {
    requireRole("coach")
    if (!d.first_name.trim() || !d.last_name.trim())
      throw new Error("Name is required")
    const vals = [
      d.first_name.trim(),
      d.last_name.trim(),
      blank(d.date_of_birth),
      blank(d.squad),
      blank(d.level),
      blank(d.guardian_contact),
      blank(d.medical_info),
    ]
    if (d.id) {
      run(
        `UPDATE gymnasts SET first_name=?, last_name=?, date_of_birth=?, squad=?, level=?,
         guardian_contact=?, medical_info=? WHERE id=?`,
        ...vals,
        d.id
      )
      return d.id
    }
    return run(
      `INSERT INTO gymnasts (first_name, last_name, date_of_birth, squad, level, guardian_contact, medical_info)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ...vals
    )
  })

export const setGymnastActive = createServerFn({ method: "POST" })
  .validator(input<{ id: number; active: boolean }>())
  .handler(async ({ data }) => {
    requireRole("coach")
    run(
      "UPDATE gymnasts SET active = ? WHERE id = ?",
      data.active ? 1 : 0,
      data.id
    )
  })

export const deleteGymnast = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("admin")
    run("DELETE FROM gymnasts WHERE id = ?", id)
  })

// ───────────────────────────── Skill progress ─────────────────────────────

export const setSkillStatus = createServerFn({ method: "POST" })
  .validator(
    input<{
      gymnastId: number
      skillId: number
      status: SkillStatus | null
      note?: string | null
      date?: string
    }>()
  )
  .handler(async ({ data: d }) => {
    requireRole("coach")
    const date = d.date || today()
    const note = blank(d.note)
    tx(() => {
      if (d.status === null) {
        run(
          "DELETE FROM gymnast_skills WHERE gymnast_id = ? AND skill_id = ?",
          d.gymnastId,
          d.skillId
        )
        return
      }
      run(
        `INSERT INTO gymnast_skills (gymnast_id, skill_id, status, updated_at, note) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (gymnast_id, skill_id) DO UPDATE SET status = excluded.status,
           updated_at = excluded.updated_at, note = coalesce(excluded.note, gymnast_skills.note)`,
        d.gymnastId,
        d.skillId,
        d.status,
        date,
        note
      )
      run(
        "INSERT INTO skill_history (gymnast_id, skill_id, status, recorded_on, note) VALUES (?, ?, ?, ?, ?)",
        d.gymnastId,
        d.skillId,
        d.status,
        date,
        note
      )
      // Auto-complete any active skill targets this progress satisfies.
      const targets = all<{ id: number; goal_status: string | null }>(
        "SELECT id, goal_status FROM targets WHERE gymnast_id = ? AND skill_id = ? AND status = 'active'",
        d.gymnastId,
        d.skillId
      )
      for (const t of targets) {
        if (t.goal_status && rank(d.status) >= rank(t.goal_status)) {
          run(
            "UPDATE targets SET status = 'achieved', achieved_on = ? WHERE id = ?",
            date,
            t.id
          )
        }
      }
    })
  })

// ───────────────────────────── Notes ─────────────────────────────

export const saveNote = createServerFn({ method: "POST" })
  .validator(
    input<{
      id?: number
      gymnastId: number
      noted_on: string
      category: string
      body: string
      author?: string | null
    }>()
  )
  .handler(async ({ data: d }) => {
    requireRole("coach")
    if (!d.body.trim()) throw new Error("Note can't be empty")
    if (d.id) {
      run(
        "UPDATE notes SET noted_on=?, category=?, body=?, author=? WHERE id=?",
        d.noted_on,
        d.category,
        d.body.trim(),
        blank(d.author),
        d.id
      )
      return d.id
    }
    return run(
      "INSERT INTO notes (gymnast_id, noted_on, category, body, author) VALUES (?, ?, ?, ?, ?)",
      d.gymnastId,
      d.noted_on || today(),
      d.category,
      d.body.trim(),
      blank(d.author)
    )
  })

export const setNoteResolved = createServerFn({ method: "POST" })
  .validator(input<{ id: number; resolved: boolean }>())
  .handler(async ({ data }) => {
    requireRole("coach")
    run(
      "UPDATE notes SET resolved = ? WHERE id = ?",
      data.resolved ? 1 : 0,
      data.id
    )
  })

export const deleteNote = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("coach")
    run("DELETE FROM notes WHERE id = ?", id)
  })

// ───────────────────────────── Skill notes ─────────────────────────────

export const saveSkillNote = createServerFn({ method: "POST" })
  .validator(
    input<{
      id?: number
      gymnastId: number
      skillId: number
      kind: string
      body: string
    }>()
  )
  .handler(async ({ data: d }) => {
    const user = requireRole("coach")
    if (!SKILL_NOTE_KINDS.some((k) => k.value === d.kind))
      throw new Error("Unknown note type")
    const body = d.body.trim()
    if (!body) throw new Error("Note can't be empty")
    if (d.id) {
      run(
        "UPDATE skill_notes SET kind = ?, body = ? WHERE id = ? AND gymnast_id = ?",
        d.kind,
        body,
        d.id,
        d.gymnastId
      )
      return d.id
    }
    return run(
      "INSERT INTO skill_notes (gymnast_id, skill_id, kind, body, author, noted_on) VALUES (?, ?, ?, ?, ?, ?)",
      d.gymnastId,
      d.skillId,
      d.kind,
      body,
      user.name,
      today()
    )
  })

export const setSkillNoteArchived = createServerFn({ method: "POST" })
  .validator(input<{ id: number; archived: boolean }>())
  .handler(async ({ data }) => {
    requireRole("coach")
    run(
      "UPDATE skill_notes SET archived = ? WHERE id = ?",
      data.archived ? 1 : 0,
      data.id
    )
  })

export const deleteSkillNote = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("coach")
    run("DELETE FROM skill_notes WHERE id = ?", id)
  })

// ───────────────────────────── Targets ─────────────────────────────

export const saveTarget = createServerFn({ method: "POST" })
  .validator(
    input<{
      id?: number
      gymnastId: number
      title: string
      details?: string | null
      skill_id?: number | null
      goal_status?: string | null
      target_date?: string | null
    }>()
  )
  .handler(async ({ data: d }) => {
    requireRole("coach")
    if (!d.title.trim()) throw new Error("Target needs a title")
    const vals = [
      d.title.trim(),
      blank(d.details),
      d.skill_id || null,
      d.skill_id ? blank(d.goal_status) : null,
      blank(d.target_date),
    ]
    if (d.id) {
      run(
        "UPDATE targets SET title=?, details=?, skill_id=?, goal_status=?, target_date=? WHERE id=?",
        ...vals,
        d.id
      )
      return d.id
    }
    return run(
      "INSERT INTO targets (gymnast_id, title, details, skill_id, goal_status, target_date) VALUES (?, ?, ?, ?, ?, ?)",
      d.gymnastId,
      ...vals
    )
  })

export const setTargetStatus = createServerFn({ method: "POST" })
  .validator(input<{ id: number; status: string }>())
  .handler(async ({ data }) => {
    requireRole("coach")
    run(
      "UPDATE targets SET status = ?, achieved_on = ? WHERE id = ?",
      data.status,
      data.status === "achieved" ? today() : null,
      data.id
    )
  })

export const deleteTarget = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("coach")
    run("DELETE FROM targets WHERE id = ?", id)
  })

// ───────────────────────────── Skill catalogue ─────────────────────────────

export const listSkills = createServerFn({ method: "GET" }).handler(
  async () => {
    requireRole("viewer")
    return all<Skill & { tracked: number; independent: number }>(
      `SELECT s.*,
      (SELECT count(*) FROM gymnast_skills x WHERE x.skill_id = s.id) AS tracked,
      (SELECT count(*) FROM gymnast_skills x WHERE x.skill_id = s.id AND x.status IN ('independent','in_routine')) AS independent
     FROM skills s ORDER BY s.sort_order, s.name`
    )
  }
)

export const saveSkill = createServerFn({ method: "POST" })
  .validator(
    input<{
      id?: number
      name: string
      category: string
      tariff: number
      description?: string | null
    }>()
  )
  .handler(async ({ data: d }) => {
    requireRole("admin")
    if (!d.name.trim()) throw new Error("Skill needs a name")
    const tariff = Number.isFinite(d.tariff) ? d.tariff : 0
    if (d.id) {
      run(
        "UPDATE skills SET name=?, category=?, tariff=?, description=? WHERE id=?",
        d.name.trim(),
        d.category,
        tariff,
        blank(d.description),
        d.id
      )
      return d.id
    }
    const { m } = get<{ m: number }>(
      "SELECT coalesce(max(sort_order), 0) + 1 AS m FROM skills"
    )!
    return run(
      "INSERT INTO skills (name, category, tariff, description, sort_order) VALUES (?, ?, ?, ?, ?)",
      d.name.trim(),
      d.category,
      tariff,
      blank(d.description),
      m
    )
  })

export const deleteSkill = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("admin")
    run("DELETE FROM skills WHERE id = ?", id)
  })

// ───────────────────────────── Competitions ─────────────────────────────

export const listCompetitions = createServerFn({ method: "GET" }).handler(
  async () => {
    requireRole("viewer")
    return all<CompetitionSummary>(
      `SELECT c.*,
      (SELECT count(*) FROM competition_entries e WHERE e.competition_id = c.id AND e.status != 'withdrawn') AS entry_count,
      (SELECT count(*) FROM competition_tasks k WHERE k.competition_id = c.id AND k.done = 0) AS open_tasks
     FROM competitions c ORDER BY c.start_date DESC`
    )
  }
)

type EntryRow = Omit<Entry, "routine1" | "routine2"> & {
  routine1: string
  routine2: string
}

export const getCompetition = createServerFn({ method: "GET" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("viewer")
    const competition = get<Competition>(
      "SELECT * FROM competitions WHERE id = ?",
      id
    )
    if (!competition) throw new Error("Competition not found")
    const entries = all<EntryRow>(
      `SELECT e.*, g.first_name || ' ' || g.last_name AS gymnast_name
       FROM competition_entries e JOIN gymnasts g ON g.id = e.gymnast_id
       WHERE e.competition_id = ? ORDER BY e.category, g.last_name, g.first_name`,
      id
    ).map((e): Entry => ({
      ...e,
      routine1: JSON.parse(e.routine1),
      routine2: JSON.parse(e.routine2),
    }))
    return {
      competition,
      entries,
      tasks: all<CompTask>(
        "SELECT * FROM competition_tasks WHERE competition_id = ? ORDER BY done, due_date IS NULL, due_date, id",
        id
      ),
      gymnasts: all<Pick<Gymnast, "id" | "first_name" | "last_name" | "squad">>(
        "SELECT id, first_name, last_name, squad FROM gymnasts WHERE active = 1 ORDER BY last_name, first_name"
      ),
      skills: all<Skill>("SELECT * FROM skills ORDER BY sort_order, name"),
      // Skills each entered gymnast can do independently or better, for routine building.
      readySkills: all<{
        gymnast_id: number
        skill_id: number
        status: SkillStatus
      }>(
        `SELECT x.gymnast_id, x.skill_id, x.status FROM gymnast_skills x
         JOIN competition_entries e ON e.gymnast_id = x.gymnast_id AND e.competition_id = ?`,
        id
      ),
    }
  })

export type CompetitionInput = {
  id?: number
  name: string
  start_date: string
  end_date?: string | null
  venue?: string | null
  organiser?: string | null
  level?: string | null
  entry_deadline?: string | null
  entry_fee?: number | null
  status: string
  notes?: string | null
}

export const saveCompetition = createServerFn({ method: "POST" })
  .validator(input<CompetitionInput>())
  .handler(async ({ data: d }) => {
    requireRole("coach")
    if (!d.name.trim() || !d.start_date)
      throw new Error("Name and start date are required")
    const vals = [
      d.name.trim(),
      d.start_date,
      blank(d.end_date),
      blank(d.venue),
      blank(d.organiser),
      blank(d.level),
      blank(d.entry_deadline),
      d.entry_fee ?? null,
      d.status,
      blank(d.notes),
    ]
    if (d.id) {
      run(
        `UPDATE competitions SET name=?, start_date=?, end_date=?, venue=?, organiser=?, level=?,
         entry_deadline=?, entry_fee=?, status=?, notes=? WHERE id=?`,
        ...vals,
        d.id
      )
      return d.id
    }
    return run(
      `INSERT INTO competitions (name, start_date, end_date, venue, organiser, level, entry_deadline, entry_fee, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ...vals
    )
  })

export const deleteCompetition = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("admin")
    run("DELETE FROM competitions WHERE id = ?", id)
  })

export const addEntries = createServerFn({ method: "POST" })
  .validator(
    input<{
      competitionId: number
      gymnastIds: number[]
      category?: string | null
    }>()
  )
  .handler(async ({ data: d }) => {
    requireRole("coach")
    tx(() => {
      for (const gid of d.gymnastIds) {
        run(
          `INSERT INTO competition_entries (competition_id, gymnast_id, category) VALUES (?, ?, ?)
           ON CONFLICT DO NOTHING`,
          d.competitionId,
          gid,
          blank(d.category)
        )
      }
    })
  })

export type EntryPatch = {
  id: number
  category?: string | null
  status?: string
  fee_paid?: boolean
  routine1?: number[]
  routine2?: number[]
  score?: number | null
  placing?: number | null
  notes?: string | null
}

export const updateEntry = createServerFn({ method: "POST" })
  .validator(input<EntryPatch>())
  .handler(async ({ data: d }) => {
    requireRole("coach")
    const sets: string[] = []
    const vals: (string | number | null)[] = []
    const set = (col: string, v: string | number | null) => {
      sets.push(`${col} = ?`)
      vals.push(v)
    }
    if ("category" in d) set("category", blank(d.category))
    if (d.status) set("status", d.status)
    if ("fee_paid" in d) set("fee_paid", d.fee_paid ? 1 : 0)
    if (d.routine1) set("routine1", JSON.stringify(d.routine1.slice(0, 10)))
    if (d.routine2) set("routine2", JSON.stringify(d.routine2.slice(0, 10)))
    if ("score" in d) set("score", d.score ?? null)
    if ("placing" in d) set("placing", d.placing ?? null)
    if ("notes" in d) set("notes", blank(d.notes))
    if (!sets.length) return
    run(
      `UPDATE competition_entries SET ${sets.join(", ")} WHERE id = ?`,
      ...vals,
      d.id
    )
  })

export const removeEntry = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("coach")
    run("DELETE FROM competition_entries WHERE id = ?", id)
  })

export const saveTask = createServerFn({ method: "POST" })
  .validator(
    input<{
      competitionId: number
      title: string
      due_date?: string | null
      assignee?: string | null
    }>()
  )
  .handler(async ({ data: d }) => {
    requireRole("coach")
    if (!d.title.trim()) throw new Error("Task needs a title")
    return run(
      "INSERT INTO competition_tasks (competition_id, title, due_date, assignee) VALUES (?, ?, ?, ?)",
      d.competitionId,
      d.title.trim(),
      blank(d.due_date),
      blank(d.assignee)
    )
  })

export const setTaskDone = createServerFn({ method: "POST" })
  .validator(input<{ id: number; done: boolean }>())
  .handler(async ({ data }) => {
    requireRole("coach")
    run(
      "UPDATE competition_tasks SET done = ? WHERE id = ?",
      data.done ? 1 : 0,
      data.id
    )
  })

export const deleteTask = createServerFn({ method: "POST" })
  .validator(input<number>())
  .handler(async ({ data: id }) => {
    requireRole("coach")
    run("DELETE FROM competition_tasks WHERE id = ?", id)
  })

// ───────────────────────────── Demo data ─────────────────────────────

export const loadDemoData = createServerFn({ method: "POST" }).handler(
  async () => {
    requireRole("admin")
    const { n } = get<{ n: number }>("SELECT count(*) AS n FROM gymnasts")!
    if (n > 0)
      throw new Error("Demo data can only be loaded into an empty club")
    const skillId = (name: string) =>
      get<{ id: number }>("SELECT id FROM skills WHERE name = ?", name)!.id
    const addDays = (days: number) => {
      const d = new Date()
      d.setDate(d.getDate() + days)
      return d.toISOString().slice(0, 10)
    }

    tx(() => {
      const people: [string, string, string, string, string][] = [
        ["Amelia", "Hart", "2013-04-12", "Performance", "Regional 2"],
        ["Noah", "Patel", "2015-09-03", "Development", "Proficiency 6"],
        ["Isla", "Morgan", "2012-01-28", "Performance", "National D"],
        ["Leo", "Okafor", "2016-06-17", "Development", "Proficiency 4"],
        ["Freya", "Clarke", "2014-11-02", "Recreational", "Proficiency 5"],
      ]
      const ids = people.map(([f, l, dob, squad, level]) =>
        run(
          "INSERT INTO gymnasts (first_name, last_name, date_of_birth, squad, level, guardian_contact) VALUES (?, ?, ?, ?, ?, ?)",
          f,
          l,
          dob,
          squad,
          level,
          `Parent of ${f} — 07700 900${String(100 + f.length).slice(-3)}`
        )
      )

      const progress: [number, string, SkillStatus, number][] = [
        [0, "Seat drop", "in_routine", -120],
        [0, "Back drop", "in_routine", -110],
        [0, "Front somersault tuck", "in_routine", -90],
        [0, "Back somersault tuck", "in_routine", -80],
        [0, "Back somersault pike", "independent", -40],
        [0, "Barani tuck", "independent", -30],
        [0, "Barani straight", "without_support", -12],
        [0, "Back full twist (Full)", "with_support", -5],
        [1, "Seat drop", "independent", -60],
        [1, "Swivel hips", "independent", -45],
        [1, "Back drop", "without_support", -20],
        [1, "Front somersault tuck", "learning", -7],
        [2, "Back somersault straight", "in_routine", -150],
        [2, "Barani pike", "in_routine", -100],
        [2, "Back full twist (Full)", "in_routine", -70],
        [2, "Rudolph (Rudy)", "independent", -25],
        [2, "Double back tuck", "with_support", -10],
        [3, "Tuck jump", "independent", -50],
        [3, "Seat drop", "without_support", -14],
        [3, "Front drop", "learning", -3],
        [4, "Back drop", "independent", -35],
        [4, "Cradle", "with_support", -9],
      ]
      for (const [i, skill, status, days] of progress) {
        const sid = skillId(skill)
        const date = addDays(days)
        run(
          "INSERT INTO gymnast_skills (gymnast_id, skill_id, status, updated_at) VALUES (?, ?, ?, ?)",
          ids[i],
          sid,
          status,
          date
        )
        run(
          "INSERT INTO skill_history (gymnast_id, skill_id, status, recorded_on) VALUES (?, ?, ?, ?)",
          ids[i],
          sid,
          status,
          date
        )
      }

      run(
        "INSERT INTO notes (gymnast_id, noted_on, category, body, author) VALUES (?, ?, 'injury', ?, 'Coach Sam')",
        ids[2],
        addDays(-8),
        "Rolled left ankle on landing. No twisting or multiple somersaults until cleared; basics only."
      )
      run(
        "INSERT INTO notes (gymnast_id, noted_on, category, body, author) VALUES (?, ?, 'coaching', ?, 'Coach Sam')",
        ids[0],
        addDays(-3),
        "Barani straight looking much tighter — keep arms in on take-off. Ready to drop the spot next session."
      )
      run(
        "INSERT INTO notes (gymnast_id, noted_on, category, body, author) VALUES (?, ?, 'achievement', ?, 'Coach Jo')",
        ids[1],
        addDays(-20),
        "Passed Proficiency 6."
      )

      const skillNotes: [number, string, string, string, string, number][] = [
        [
          1,
          "Front somersault tuck",
          "focus",
          "Keep head up for longer on take-off to improve direction — finishing too far forward.",
          "Coach Jo",
          -7,
        ],
        [
          1,
          "Front somersault tuck",
          "coaching_point",
          'Tends to throw arms early; cue "arms up, then tuck".',
          "Coach Jo",
          -14,
        ],
        [
          0,
          "Back full twist (Full)",
          "focus",
          "Finish the somersault before twisting — twist is starting too early off the bed.",
          "Coach Sam",
          -5,
        ],
        [
          0,
          "Back full twist (Full)",
          "coaching_point",
          "Responds best to the belt on the first two attempts each session.",
          "Coach Sam",
          -12,
        ],
        [
          0,
          "Barani straight",
          "focus",
          "Keep arms in tight on take-off.",
          "Coach Sam",
          -3,
        ],
        [
          2,
          "Double back tuck",
          "coaching_point",
          "No multiple somersaults until physio clears the ankle.",
          "Coach Sam",
          -8,
        ],
      ]
      for (const [i, skill, kind, body, author, days] of skillNotes) {
        run(
          "INSERT INTO skill_notes (gymnast_id, skill_id, kind, body, author, noted_on) VALUES (?, ?, ?, ?, ?, ?)",
          ids[i],
          skillId(skill),
          kind,
          body,
          author,
          addDays(days)
        )
      }

      run(
        "INSERT INTO targets (gymnast_id, title, skill_id, goal_status, target_date) VALUES (?, ?, ?, 'independent', ?)",
        ids[0],
        "Full twist independently",
        skillId("Back full twist (Full)"),
        addDays(45)
      )
      run(
        "INSERT INTO targets (gymnast_id, title, skill_id, goal_status, target_date) VALUES (?, ?, ?, 'without_support', ?)",
        ids[1],
        "Front tuck without a spot",
        skillId("Front somersault tuck"),
        addDays(30)
      )
      run(
        "INSERT INTO targets (gymnast_id, title, details, target_date) VALUES (?, ?, ?, ?)",
        ids[2],
        "Return to full training",
        "Gradual return after ankle injury — physio sign-off first.",
        addDays(21)
      )

      const comp = run(
        `INSERT INTO competitions (name, start_date, venue, organiser, level, entry_deadline, entry_fee, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'entries_open')`,
        "Winter Regional Grades",
        addDays(24),
        "City Sports Centre",
        "Regional Trampoline Committee",
        "Regional",
        addDays(7),
        18
      )
      run(
        "INSERT INTO competition_entries (competition_id, gymnast_id, category, status, fee_paid, routine1) VALUES (?, ?, ?, 'entered', 1, ?)",
        comp,
        ids[0],
        "Regional 2 — 13-14",
        JSON.stringify(
          [
            "Back somersault tuck",
            "Seat drop",
            "Back drop",
            "Front somersault tuck",
            "Barani tuck",
            "Back somersault pike",
            "Straddle jump",
            "Pike jump",
            "Tuck jump",
            "Half twist jump",
          ].map(skillId)
        )
      )
      run(
        "INSERT INTO competition_entries (competition_id, gymnast_id, category, status) VALUES (?, ?, ?, 'invited')",
        comp,
        ids[4],
        "Proficiency 5 — 11-12"
      )
      run(
        "INSERT INTO competition_tasks (competition_id, title, due_date, assignee) VALUES (?, ?, ?, ?)",
        comp,
        "Submit entries to organiser",
        addDays(7),
        "Coach Sam"
      )
      run(
        "INSERT INTO competition_tasks (competition_id, title, due_date, assignee) VALUES (?, ?, ?, ?)",
        comp,
        "Collect entry fees",
        addDays(5),
        "Treasurer"
      )
      run(
        "INSERT INTO competition_tasks (competition_id, title, assignee, done) VALUES (?, ?, ?, 1)",
        comp,
        "Book coach / judge for the day",
        "Head coach"
      )

      run(
        `INSERT INTO competitions (name, start_date, venue, level, status) VALUES (?, ?, ?, ?, 'planning')`,
        "Club Spring Championships",
        addDays(110),
        "Home gym",
        "Club"
      )
    })
  }
)
