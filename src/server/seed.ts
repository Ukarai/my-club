// Starter skill catalogue. Tariffs follow the FIG 2025-2028 Code of Points
// (§17.1): 0.1 per ¼ somersault, 0.5 for a completed single somersault and
// 1.0 for a double, 0.1 per ½ twist, 0.1 for jumps/seat drop with no rotation,
// +0.1 shape bonus for untwisted single somersaults and +0.1 per somersault
// for multiples in pike or straight, and +0.1 for backward doubles.
// National grade rules may differ; every value is editable on the Skills page.

type SeedSkill = {
  name: string
  category: string
  tariff: number
  description?: string
}

export const SKILL_SEED: SeedSkill[] = [
  { name: "Straight jump", category: "Basics", tariff: 0 },
  { name: "Tuck jump", category: "Basics", tariff: 0.1 },
  { name: "Pike jump", category: "Basics", tariff: 0.1 },
  { name: "Straddle jump", category: "Basics", tariff: 0.1 },
  { name: "Half twist jump", category: "Basics", tariff: 0.1 },
  { name: "Full twist jump", category: "Basics", tariff: 0.2 },

  { name: "Seat drop", category: "Drops & rotations", tariff: 0.1 },
  {
    name: "Seat half twist to seat",
    category: "Drops & rotations",
    tariff: 0.1,
  },
  {
    name: "Swivel hips",
    category: "Drops & rotations",
    tariff: 0.1,
    description: "Seat drop, half twist, seat drop",
  },
  { name: "Front drop", category: "Drops & rotations", tariff: 0.1 },
  { name: "Back drop", category: "Drops & rotations", tariff: 0.1 },
  {
    name: "Back drop half twist to feet",
    category: "Drops & rotations",
    tariff: 0.2,
  },
  {
    name: "Cradle",
    category: "Drops & rotations",
    tariff: 0.1,
    description: "Back drop, half twist, back drop",
  },
  {
    name: "Cat twist",
    category: "Drops & rotations",
    tariff: 0.2,
    description: "Back drop, full twist, back drop",
  },
  {
    name: "Turntable",
    category: "Drops & rotations",
    tariff: 0,
    description: "Front drop to front drop, rotating 360° flat",
  },
  {
    name: "¾ front somersault to back",
    category: "Drops & rotations",
    tariff: 0.3,
  },
  {
    name: "¾ back somersault to front",
    category: "Drops & rotations",
    tariff: 0.3,
  },

  { name: "Front somersault tuck", category: "Somersaults", tariff: 0.5 },
  { name: "Front somersault pike", category: "Somersaults", tariff: 0.6 },
  { name: "Front somersault straight", category: "Somersaults", tariff: 0.6 },
  { name: "Back somersault tuck", category: "Somersaults", tariff: 0.5 },
  { name: "Back somersault pike", category: "Somersaults", tariff: 0.6 },
  { name: "Back somersault straight", category: "Somersaults", tariff: 0.6 },

  {
    name: "Barani tuck",
    category: "Twisting",
    tariff: 0.6,
    description: "Front somersault with half twist",
  },
  { name: "Barani pike", category: "Twisting", tariff: 0.6 },
  { name: "Barani straight", category: "Twisting", tariff: 0.6 },
  { name: "Back full twist (Full)", category: "Twisting", tariff: 0.7 },
  {
    name: "Rudolph (Rudy)",
    category: "Twisting",
    tariff: 0.8,
    description: "Front somersault with 1½ twists",
  },
  { name: "Double full", category: "Twisting", tariff: 0.9 },
  {
    name: "Randolph (Randy)",
    category: "Twisting",
    tariff: 1.0,
    description: "Front somersault with 2½ twists",
  },

  { name: "Double back tuck", category: "Multiple somersaults", tariff: 1.1 },
  { name: "Double back pike", category: "Multiple somersaults", tariff: 1.3 },
  {
    name: "Barani out tuck",
    category: "Multiple somersaults",
    tariff: 1.1,
    description: "Double front with half twist out",
  },
  { name: "Full-in back tuck", category: "Multiple somersaults", tariff: 1.3 },
]

// Starter tariffs that changed with the 2025-2028 Code of Points. Applied to
// existing databases only where a skill still has the old default value, so
// any tariff a club has deliberately edited is left alone.
export const TARIFF_UPDATES_2025: ReadonlyArray<
  [name: string, from: number, to: number]
> = [
  ["Tuck jump", 0, 0.1],
  ["Pike jump", 0, 0.1],
  ["Straddle jump", 0, 0.1],
  ["Seat drop", 0, 0.1],
  ["Front drop", 0, 0.1],
  ["Back drop", 0, 0.1],
  ["Back drop half twist to feet", 0.1, 0.2],
  ["Double back tuck", 1.0, 1.1],
  ["Double back pike", 1.2, 1.3],
  ["Full-in back tuck", 1.2, 1.3],
]
