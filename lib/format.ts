export type RoutineFormat = "straight_sets" | "circuit" | "amrap";

type FormatFields = {
  format: string;
  rounds: number | null;
  workSeconds: number | null;
  restSeconds: number | null;
  timeCapMinutes: number | null;
  isPartner: boolean;
  partnerNote: string | null;
};

/** Human-readable one-line summary of a category block's routine structure,
 * e.g. "Circuit — 3 rounds · 45s on / 15s off · Partner workout". */
export function describeBlockFormat(block: FormatFields): string | null {
  const parts: string[] = [];

  if (block.format === "circuit") {
    let s = "Circuit";
    const details: string[] = [];
    if (block.rounds) details.push(`${block.rounds} rounds`);
    if (block.workSeconds) details.push(`${block.workSeconds}s on / ${block.restSeconds ?? 0}s off`);
    if (details.length > 0) s += ` — ${details.join(" · ")}`;
    parts.push(s);
  } else if (block.format === "amrap") {
    let s = "AMRAP";
    if (block.timeCapMinutes) s += ` — ${block.timeCapMinutes} min time cap`;
    parts.push(s);
  }

  if (block.isPartner) parts.push("Partner workout");

  if (parts.length === 0) return null;
  return parts.join(" · ");
}

type BlockWithExercises = FormatFields & { exercises: { allocatedMinutes: number | null }[] };

/** Total minutes a category block takes, accounting for its routine format —
 * circuit/AMRAP timing is driven by the block's own fields, not per-exercise minutes. */
export function blockTotalMinutes(block: BlockWithExercises): number {
  if (block.format === "circuit") {
    const rounds = block.rounds ?? 0;
    const work = block.workSeconds ?? 0;
    const rest = block.restSeconds ?? 0;
    return Math.round((rounds * block.exercises.length * (work + rest)) / 60);
  }
  if (block.format === "amrap") {
    return block.timeCapMinutes ?? 0;
  }
  return block.exercises.reduce((a, e) => a + (e.allocatedMinutes ?? 0), 0);
}
