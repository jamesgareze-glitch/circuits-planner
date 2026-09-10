import { Season } from "./constants";
import { DayForecast, passesSeasonRule, passesWeatherRules } from "./weather";

export type SelectableExercise = {
  id: string;
  name: string;
  categoryId: string;
  estimatedMinutes: number;
  minTempC: number | null;
  maxTempC: number | null;
  avoidRain: boolean;
  avoidHighWind: boolean;
  seasons: string[];
  upvotes: number;
  downvotes: number;
};

export type EligibilityOptions = {
  forecast: DayForecast | null;
  season: Season;
  weatherFilterOn: boolean;
  seasonFilterOn: boolean;
  recencyFilterOn: boolean;
  recencyWeeks: number;
  lastUsedByExerciseId: Map<string, Date>;
  sessionDate: Date;
};

/**
 * Narrows a category's exercises down to the eligible pool for the wizard, relaxing
 * constraints in order (recency, then weather/season) rather than ever returning an
 * empty pool — there should always be *something* to suggest.
 */
export function eligiblePoolForCategory(
  exercises: SelectableExercise[],
  categoryId: string,
  opts: EligibilityOptions,
): SelectableExercise[] {
  const inCategory = exercises.filter((e) => e.categoryId === categoryId);

  const notRecentlyUsed = (e: SelectableExercise) => {
    if (!opts.recencyFilterOn) return true;
    const lastUsed = opts.lastUsedByExerciseId.get(e.id);
    if (!lastUsed) return true;
    const daysSince = (opts.sessionDate.getTime() - lastUsed.getTime()) / 86_400_000;
    return daysSince >= opts.recencyWeeks * 7;
  };

  const passesWeather = (e: SelectableExercise) => {
    if (!opts.weatherFilterOn || !opts.forecast) return true;
    return passesWeatherRules(e, opts.forecast);
  };

  const passesSeason = (e: SelectableExercise) => {
    if (!opts.seasonFilterOn) return true;
    return passesSeasonRule(e, opts.season);
  };

  const strict = inCategory.filter((e) => notRecentlyUsed(e) && passesWeather(e) && passesSeason(e));
  if (strict.length > 0) return strict;

  const withoutRecencyRule = inCategory.filter((e) => passesWeather(e) && passesSeason(e));
  if (withoutRecencyRule.length > 0) return withoutRecencyRule;

  if (inCategory.length > 0) return inCategory;

  return [];
}

/** Weighted random pick — popular exercises come up more often, but every
 * eligible exercise always has some chance (weight floor of 1). */
export function pickWeighted(pool: SelectableExercise[]): SelectableExercise | null {
  if (pool.length === 0) return null;
  const weights = pool.map((e) => Math.max(e.upvotes - e.downvotes, 0) + 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Weighted sampling without replacement — picks up to `count` distinct exercises.
 * If the pool is smaller than `count`, returns everything in the pool. */
export function pickWeightedMany(pool: SelectableExercise[], count: number): SelectableExercise[] {
  const remaining = [...pool];
  const picked: SelectableExercise[] = [];
  while (remaining.length > 0 && picked.length < count) {
    const choice = pickWeighted(remaining);
    if (!choice) break;
    picked.push(choice);
    remaining.splice(remaining.indexOf(choice), 1);
  }
  return picked;
}
