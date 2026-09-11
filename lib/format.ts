export type RoutineFormat =
  | "straight_sets"
  | "circuit"
  | "amrap"
  | "emom"
  | "wod"
  | "tabata"
  | "superset"
  | "ladder";

type FormatFields = {
  format: string;
  rounds: number | null;
  workSeconds: number | null;
  restSeconds: number | null;
  timeCapMinutes: number | null;
  isPartner: boolean;
  partnerNote: string | null;
  ladderStart: number | null;
  ladderEnd: number | null;
  ladderStep: number | null;
  ladderPyramid: boolean;
  ladderUnit: string | null;
};

/** The rep/second value for each rung of a ladder, in order — e.g. start=2 end=12
 * step=2 gives [2,4,6,8,10,12], and pyramid=true climbs back down to [2,4,6,8,10,12,10,8,6,4,2]. */
export function ladderRungs(start: number, end: number, step: number, pyramid: boolean): number[] {
  const s = Math.max(1, Math.abs(step) || 1);
  const dir = end >= start ? 1 : -1;
  const rungs: number[] = [];
  for (let v = start; dir > 0 ? v <= end : v >= end; v += dir * s) rungs.push(v);
  if (pyramid) rungs.push(...rungs.slice(0, -1).reverse());
  return rungs;
}

/** Human-readable one-line summary of a category block's routine structure,
 * e.g. "Circuit — 3 rounds · 45s work / 15s rest · Partner workout". */
export function describeBlockFormat(block: FormatFields, exerciseCount?: number): string | null {
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
  } else if (block.format === "tabata") {
    let s = "Tabata";
    if (block.rounds && block.workSeconds) {
      s += ` — ${block.rounds} x ${block.workSeconds}s work / ${block.restSeconds ?? 0}s rest`;
    }
    parts.push(s);
  } else if (block.format === "superset") {
    const groupSize = exerciseCount ?? 0;
    let s = groupSize === 2 ? "Superset" : groupSize === 3 ? "Triset" : groupSize >= 4 ? "Giant set" : "Superset";
    const details: string[] = [];
    if (block.rounds) details.push(`${block.rounds} sets`);
    if (block.restSeconds) details.push(`${block.restSeconds}s rest between sets`);
    if (details.length > 0) s += ` — ${details.join(" · ")}`;
    parts.push(s);
  } else if (block.format === "ladder") {
    let s = block.ladderPyramid ? "Pyramid" : "Ladder";
    if (block.ladderStart !== null && block.ladderEnd !== null) {
      const unit = block.ladderUnit === "seconds" ? "s" : " reps";
      s += block.ladderPyramid
        ? ` — ${block.ladderStart}→${block.ladderEnd}→${block.ladderStart}${unit}`
        : ` — ${block.ladderStart}→${block.ladderEnd}${unit}`;
      if (block.ladderStep) s += ` (step ${block.ladderStep})`;
    }
    parts.push(s);
  }

  if (block.isPartner) parts.push("Partner workout");

  if (parts.length === 0) return null;
  return parts.join(" · ");
}

type BlockWithExercises = FormatFields & { exercises: { allocatedMinutes: number | null }[] };

/** Total minutes a category block takes, accounting for its routine format —
 * circuit/EMOM/AMRAP/Tabata timing is driven by the block's own fields, not per-exercise
 * minutes; WOD and reps-based formats (superset, rep-ladder) have no predictable duration
 * from timing alone, so they only contribute known rest/work time (or 0). */
export function blockTotalMinutes(block: BlockWithExercises): number {
  if (block.format === "circuit" || block.format === "emom" || block.format === "tabata") {
    const rounds = block.rounds ?? 0;
    const work = block.workSeconds ?? 0;
    const rest = block.format === "emom" ? 0 : block.restSeconds ?? 0;
    const perRound = block.format === "emom" ? 1 : block.exercises.length;
    return Math.round((rounds * perRound * (work + rest)) / 60);
  }
  if (block.format === "amrap") {
    const rounds = block.rounds ?? 1;
    const work = block.timeCapMinutes ?? 0;
    const rest = (block.restSeconds ?? 0) / 60;
    return Math.round(rounds * work + Math.max(rounds - 1, 0) * rest);
  }
  if (block.format === "wod") return 0;
  if (block.format === "superset") {
    const sets = block.rounds ?? 1;
    const restPerSet = block.restSeconds ?? 0;
    return Math.round((Math.max(sets - 1, 0) * restPerSet) / 60);
  }
  if (block.format === "ladder") {
    if (block.ladderUnit !== "seconds" || block.ladderStart === null || block.ladderEnd === null) return 0;
    const rungs = ladderRungs(block.ladderStart, block.ladderEnd, block.ladderStep ?? 1, block.ladderPyramid);
    const workSeconds = rungs.reduce((a, r) => a + r, 0);
    const restSeconds = (block.restSeconds ?? 0) * Math.max(rungs.length - 1, 0);
    return Math.round((workSeconds + restSeconds) / 60);
  }
  return block.exercises.reduce((a, e) => a + (e.allocatedMinutes ?? 0), 0);
}
