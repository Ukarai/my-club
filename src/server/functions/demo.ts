// Demo data for trying the app out on an empty database.
import { createServerFn } from "@tanstack/react-start"
import { requireRole } from "../auth"
import { get, run, tx } from "../db"
import type { SkillStatus } from "@/lib/domain"

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
          "INSERT INTO gymnast_skills (gymnast_id, skill_id, status, updated_at, updated_by) VALUES (?, ?, ?, ?, 'Coach Sam')",
          ids[i],
          sid,
          status,
          date
        )
        run(
          "INSERT INTO skill_history (gymnast_id, skill_id, status, recorded_on, recorded_by) VALUES (?, ?, ?, ?, 'Coach Sam')",
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

      const groups: [string, string, string, number[]][] = [
        ["Tuesday 5pm", "Tuesday evening session, main hall", "sky", [1, 3, 4]],
        [
          "Thursday 6pm",
          "Thursday evening session, main hall",
          "emerald",
          [0, 2],
        ],
        [
          "Regional squad",
          "Gymnasts working towards regional grades",
          "violet",
          [0, 2, 4],
        ],
      ]
      for (const [name, description, color, members] of groups) {
        const gid = run(
          "INSERT INTO club_groups (name, description, color) VALUES (?, ?, ?)",
          name,
          description,
          color
        )
        for (const i of members)
          run(
            "INSERT INTO group_members (group_id, gymnast_id) VALUES (?, ?)",
            gid,
            ids[i]
          )
      }

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
