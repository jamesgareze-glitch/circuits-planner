export type RoutineFormat = "straight_sets" | "circuit" | "amrap" | "emom" | "wod";

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
 * e.g. "Circuit — 3 rounds · 45s work / 15s rest · Partner workout". */
export function describeBlockFormat(block: FormatFields): string | null {
  const parts: string[] = [];

  if (block.format === "circuit") {
    let s = "Circuit";
    const details: string[] = [];
    if (block.rounds) details.push(`${block.rounds} rounds`);
    if (block.workSeconds) details.push(`${block.workSeconds}s work / ${block.restSeconds ?? 0}s rest`);
    if (details.length > 0) s += ` — ${details.join(" · ")}`;
    parts.push(s);
  } else if (block.format === "emom") {
    let s = "EMOM";
    if (block.rounds && block.workSeconds) {
      s += ` — ${block.rounds} x ${block.workSeconds}s`;
    }
    parts.push(s);
  } else if (block.format === "amrap") {
    let s = "AMRAP";
    const rounds = block.rounds ?? 1;
    if (block.timeCapMinutes) {
      s +=
        rounds > 1
          ? ` — ${rounds} x ${block.timeCapMinutes} min work / ${block.restSeconds ?? 0}s rest`
          : ` — ${block.timeCapMinutes} min work`;
    }
    parts.push(s);
  } else if (block.format === "wod") {
    let s = "WOD";
    if (block.rounds && block.rounds > 1) s += ` — ${block.rounds} rounds for time`;
    else s += " — for time";
    parts.push(s);
  }

  if (block.isPartner) parts.push("Partner workout");

  if (parts.length === 0) return null;
  return parts.join(" · ");
}

type BlockWithExercises = FormatFields & { exercises: { allocatedMinutes: number | null }[] };

/** Total minutes a category block takes, accounting for its routine format —
 * circuit/EMOM/AMRAP timing is driven by the block's own fields, not per-exercise
 * minutes; WOD ("for time") has no predictable duration, so it contributes 0. */
export function blockTotalMinutes(block: BlockWithExercises): number {
  if (block.format === "circuit" || block.format === "emom") {
    const rounds = block.rounds ?? 0;
    const work = block.workSeconds ?? 0;
    const rest = block.format === "circuit" ? block.restSeconds ?? 0 : 0;
    const perRound = block.format === "circuit" ? block.exercises.length : 1;
    return Math.round((rounds * perRound * (work + rest)) / 60);
  }
  if (block.format === "amrap") {
    const rounds = block.rounds ?? 1;
    const work = block.timeCapMinutes ?? 0;
    const rest = (block.restSeconds ?? 0) / 60;
    return Math.round(rounds * work + Math.max(rounds - 1, 0) * rest);
  }
  if (block.format === "wod") return 0;
  return block.exercises.reduce((a, e) => a + (e.allocatedMinutes ?? 0), 0);
}
