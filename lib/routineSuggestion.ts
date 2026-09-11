import { RoutineFormat } from "./format";

export type RoutineSuggestion = {
  format: RoutineFormat;
  rounds?: number;
  workSeconds?: number;
  restSeconds?: number;
  timeCapMinutes?: number;
  ladderStart?: number;
  ladderEnd?: number;
  ladderStep?: number;
  ladderPyramid?: boolean;
  ladderUnit?: string;
};

// Weighted by how often each format actually shows up across the historical
// sessions: circuits and straight sets dominate, AMRAP/EMOM are common staples,
// Tabata/superset/ladder/WOD appear but less often.
const FORMAT_WEIGHTS: { format: RoutineFormat; weight: number }[] = [
  { format: "circuit", weight: 30 },
  { format: "straight_sets", weight: 18 },
  { format: "amrap", weight: 15 },
  { format: "emom", weight: 12 },
  { format: "tabata", weight: 8 },
  { format: "superset", weight: 8 },
  { format: "wod", weight: 5 },
  { format: "ladder", weight: 6 },
];

const CIRCUIT_ROUNDS = [2, 3, 4];
const CIRCUIT_WORK_SECONDS = [30, 40, 45];
const CIRCUIT_REST_SECONDS = [10, 15, 20];
const EMOM_ROUNDS = [6, 8, 10, 12];
const AMRAP_TIME_CAPS = [8, 10, 12, 15];
const SUPERSET_SETS = [3, 4];
const SUPERSET_REST_SECONDS = [45, 60, 90];
const LADDER_STARTS = [2, 4, 5];
const LADDER_ENDS = [10, 12, 15];
const LADDER_STEPS = [2, 5];

function randomFrom<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

function pickWeightedFormat(): RoutineFormat {
  const total = FORMAT_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);
  let roll = Math.random() * total;
  for (const { format, weight } of FORMAT_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return format;
  }
  return FORMAT_WEIGHTS[FORMAT_WEIGHTS.length - 1].format;
}

export function suggestRoutine(): RoutineSuggestion {
  const format = pickWeightedFormat();
  if (format === "circuit") {
    return {
      format,
      rounds: randomFrom(CIRCUIT_ROUNDS),
      workSeconds: randomFrom(CIRCUIT_WORK_SECONDS),
      restSeconds: randomFrom(CIRCUIT_REST_SECONDS),
    };
  }
  if (format === "emom") return { format, rounds: randomFrom(EMOM_ROUNDS), workSeconds: 60 };
  if (format === "amrap") return { format, rounds: 1, timeCapMinutes: randomFrom(AMRAP_TIME_CAPS), restSeconds: 60 };
  if (format === "wod") return { format };
  // Canonical Tabata protocol (Dr. Izumi Tabata, 1996): 20s work / 10s rest x 8 rounds.
  if (format === "tabata") return { format, rounds: 8, workSeconds: 20, restSeconds: 10 };
  if (format === "superset") {
    return { format, rounds: randomFrom(SUPERSET_SETS), restSeconds: randomFrom(SUPERSET_REST_SECONDS) };
  }
  if (format === "ladder") {
    return {
      format,
      ladderStart: randomFrom(LADDER_STARTS),
      ladderEnd: randomFrom(LADDER_ENDS),
      ladderStep: randomFrom(LADDER_STEPS),
      ladderPyramid: Math.random() < 0.3,
      ladderUnit: "reps",
    };
  }
  return { format: "straight_sets" };
}
