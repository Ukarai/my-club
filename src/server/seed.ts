// Starter skill catalogue. Tariffs follow the usual FIG convention
// (0.1 per ¼ somersault, +0.1 per completed somersault, +0.1 per ½ twist,
// shape bonus for pike/straight) but clubs should check them against the
// current Code of Points — every value is editable on the Skills page.

type SeedSkill = {
  name: string
  category: string
  tariff: number
  description?: string
}

export const SKILL_SEED: SeedSkill[] = [
  { name: "Straight jump", category: "Basics", tariff: 0 },
  { name: "Tuck jump", category: "Basics", tariff: 0 },
  { name: "Pike jump", category: "Basics", tariff: 0 },
  { name: "Straddle jump", category: "Basics", tariff: 0 },
  { name: "Half twist jump", category: "Basics", tariff: 0.1 },
  { name: "Full twist jump", category: "Basics", tariff: 0.2 },

  { name: "Seat drop", category: "Drops & rotations", tariff: 0 },
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
  { name: "Front drop", category: "Drops & rotations", tariff: 0 },
  { name: "Back drop", category: "Drops & rotations", tariff: 0 },
  {
    name: "Back drop half twist to feet",
    category: "Drops & rotations",
    tariff: 0.1,
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

  { name: "Double back tuck", category: "Multiple somersaults", tariff: 1.0 },
  { name: "Double back pike", category: "Multiple somersaults", tariff: 1.2 },
  {
    name: "Barani out tuck",
    category: "Multiple somersaults",
    tariff: 1.1,
    description: "Double front with half twist out",
  },
  { name: "Full-in back tuck", category: "Multiple somersaults", tariff: 1.2 },
]
