import { RoutineFormat } from "./format";

export type RoutineSuggestion = {
  format: RoutineFormat;
  rounds?: number;
  workSeconds?: number;
  restSeconds?: number;
  timeCapMinutes?: number;
};

// Weights roughly reflect how often each shape actually shows up across the
// historical sessions: circuit/interval structure is the single most common
// pattern, AMRAP and EMOM next, with plain "work through the list once" and
// WOD-style "for time" chippers real but less frequent.
const FORMAT_WEIGHTS: { format: RoutineFormat; weight: number }[] = [
  { format: "circuit", weight: 35 },
  { format: "amrap", weight: 20 },
  { format: "emom", weight: 15 },
  { format: "straight_sets", weight: 20 },
  { format: "wod", weight: 10 },
];

const CIRCUIT_ROUNDS = [2, 3, 4];
const CIRCUIT_WORK_SECONDS = [30, 40, 45];
const CIRCUIT_REST_SECONDS = [10, 15, 20];
const EMOM_ROUNDS = [6, 8, 10, 12];
const AMRAP_TIME_CAPS = [8, 10, 12, 15];

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

/** Suggests a routine format (and its parameters) for a session block —
 * varied each time it's called rather than always defaulting to the same
 * shape, so the person building the session doesn't have to think about it. */
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
  if (format === "emom") {
    return { format, rounds: randomFrom(EMOM_ROUNDS), workSeconds: 60 };
  }
  if (format === "amrap") {
    // Single AMRAP block by default — repeated work/rest AMRAP rounds are an
    // edit away (bump "rounds" above 1) rather than the common case.
    return { format, rounds: 1, timeCapMinutes: randomFrom(AMRAP_TIME_CAPS), restSeconds: 60 };
  }
  if (format === "wod") {
    return { format };
  }
  return { format: "straight_sets" };
}
