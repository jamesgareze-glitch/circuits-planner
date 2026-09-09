"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createSession,
  getSuggestions,
  getWizardContext,
  Suggestion,
} from "../wizard-actions";

type Category = { id: string; name: string };

type WeatherInfo = {
  forecast: { maxTempC: number; minTempC: number; precipitationMm: number; windSpeedMaxKmh: number } | null;
  season: string;
  withinForecastRange: boolean;
  settings: { weatherFilter: boolean; seasonFilter: boolean };
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function Wizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(todayStr());
  const [targetMinutes, setTargetMinutes] = useState(45);

  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [chosenByCategory, setChosenByCategory] = useState<Record<string, string>>({});
  const [minutesByExercise, setMinutesByExercise] = useState<Record<string, number>>({});
  const [attendanceCount, setAttendanceCount] = useState<string>("");
  const [notes, setNotes] = useState("");

  const totalMinutes = useMemo(
    () => Object.values(minutesByExercise).reduce((a, b) => a + b, 0),
    [minutesByExercise],
  );

  function goToStep2() {
    setError(null);
    startTransition(async () => {
      const ctx = await getWizardContext(date);
      setWeather({
        forecast: ctx.forecast,
        season: ctx.season,
        withinForecastRange: ctx.withinForecastRange,
        settings: ctx.settings,
      });
      setCategories(ctx.categories);
      setStep(2);
    });
  }

  function goToStep3() {
    if (selectedCategoryIds.length === 0) {
      setError("Pick at least one category.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const results = await getSuggestions(date, selectedCategoryIds);
      const missing = results.filter((r) => !r.chosen);
      if (missing.length > 0) {
        setError(
          `No exercises found for: ${missing.map((m) => m.categoryName).join(", ")}. Add some in the exercise library first.`,
        );
        return;
      }
      setSuggestions(results);
      setChosenByCategory(Object.fromEntries(results.map((r) => [r.categoryId, r.chosen!.id])));
      setMinutesByExercise(
        Object.fromEntries(results.map((r) => [r.chosen!.id, r.chosen!.estimatedMinutes])),
      );
      setStep(3);
    });
  }

  function swapExercise(categoryId: string, exerciseId: string) {
    const suggestion = suggestions.find((s) => s.categoryId === categoryId);
    const exercise = suggestion?.pool.find((e) => e.id === exerciseId);
    if (!exercise) return;
    setChosenByCategory((prev) => ({ ...prev, [categoryId]: exerciseId }));
    setMinutesByExercise((prev) => ({ ...prev, [exerciseId]: exercise.estimatedMinutes }));
  }

  function save() {
    setError(null);
    const exercises = suggestions.map((s) => {
      const exerciseId = chosenByCategory[s.categoryId];
      return { exerciseId, allocatedMinutes: minutesByExercise[exerciseId] ?? 0 };
    });
    startTransition(async () => {
      await createSession({
        dateStr: date,
        targetMinutes,
        notes: notes || undefined,
        attendanceCount: attendanceCount ? Number(attendanceCount) : undefined,
        exercises,
      });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Session date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-fit rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Target session length (minutes)
            <input
              type="number"
              min={5}
              value={targetMinutes}
              onChange={(e) => setTargetMinutes(Number(e.target.value))}
              className="w-24 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={goToStep2}
            className="self-start rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {pending ? "Checking weather…" : "Continue"}
          </button>
        </div>
      )}

      {step === 2 && weather && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
            {weather.forecast ? (
              <p>
                Forecast for {date}: {weather.forecast.minTempC}°–{weather.forecast.maxTempC}°C,{" "}
                {weather.forecast.precipitationMm > 1 ? "rain expected" : "dry"}, wind up to{" "}
                {Math.round(weather.forecast.windSpeedMaxKmh)} km/h. Season: {weather.season}.
              </p>
            ) : (
              <p>
                No forecast available yet for this date (too far out) — filtering will fall back to
                season only. Season: {weather.season}.
              </p>
            )}
            <p className="mt-1 text-xs text-zinc-500">
              Weather filter is {weather.settings.weatherFilter ? "on" : "off"}, season filter is{" "}
              {weather.settings.seasonFilter ? "on" : "off"} (change in Settings).
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Pick categories to include</p>
            {categories.length === 0 && (
              <p className="text-sm text-zinc-500">
                No categories yet — add some in the exercise library first.
              </p>
            )}
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedCategoryIds.includes(c.id)}
                  onChange={(e) =>
                    setSelectedCategoryIds((prev) =>
                      e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                    )
                  }
                />
                {c.name}
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Back
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={goToStep3}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {pending ? "Choosing exercises…" : "Suggest exercises"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-3">
            {suggestions.map((s) => {
              const chosenId = chosenByCategory[s.categoryId];
              return (
                <li key={s.categoryId} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {s.categoryName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <select
                      value={chosenId}
                      onChange={(e) => swapExercise(s.categoryId, e.target.value)}
                      className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      {s.pool.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={minutesByExercise[chosenId] ?? 0}
                      onChange={(e) =>
                        setMinutesByExercise((prev) => ({ ...prev, [chosenId]: Number(e.target.value) }))
                      }
                      className="w-20 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <span className="text-xs text-zinc-500">min</span>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-sm">
            Total: <span className="font-medium">{totalMinutes} min</span> (target {targetMinutes} min)
            {totalMinutes !== targetMinutes && (
              <span className="ml-2 text-amber-600">
                {totalMinutes > targetMinutes ? "over" : "under"} by {Math.abs(totalMinutes - targetMinutes)} min
              </span>
            )}
          </p>

          <label className="flex flex-col gap-1 text-sm">
            Attendance count (optional)
            <input
              type="number"
              min={0}
              value={attendanceCount}
              onChange={(e) => setAttendanceCount(e.target.value)}
              className="w-24 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Notes (optional)
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Back
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save session"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
