"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createSession,
  getSuggestions,
  getWizardContext,
  BlockInput,
  Suggestion,
} from "../wizard-actions";
import { SelectableExercise } from "@/lib/selection";
import { ladderRungs, RoutineFormat } from "@/lib/format";

type Category = { id: string; name: string };

type WeatherInfo = {
  forecast: { maxTempC: number; minTempC: number; precipitationMm: number; windSpeedMaxKmh: number } | null;
  season: string;
  withinForecastRange: boolean;
  settings: { weatherFilter: boolean; seasonFilter: boolean };
};

type ExerciseItem = {
  id: string;
  exerciseId: string;
  minutes: string;
  weight: string;
  reps: string;
};

type CategoryBlock = {
  id: string;
  kind: "category";
  categoryId: string;
  categoryName: string;
  pool: SelectableExercise[];
  items: ExerciseItem[];
  format: RoutineFormat;
  rounds: string;
  workSeconds: string;
  restSeconds: string;
  timeCapMinutes: string;
  ladderStart: string;
  ladderEnd: string;
  ladderStep: string;
  ladderPyramid: boolean;
  ladderUnit: string;
  isPartner: boolean;
  partnerNote: string;
};

type TextBlock = {
  id: string;
  kind: "text";
  text: string;
};

type Block = CategoryBlock | TextBlock;

function uid() {
  return Math.random().toString(36).slice(2);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function itemFromExercise(ex: SelectableExercise): ExerciseItem {
  return { id: uid(), exerciseId: ex.id, minutes: String(ex.estimatedMinutes), weight: "", reps: "" };
}

// Fallback values for whichever format fields aren't part of the server's
// suggestion (e.g. "rounds" when the suggestion came back as AMRAP) — kept
// sane so switching the format dropdown by hand always has something usable.
const FALLBACK_FORMAT_FIELDS = {
  rounds: "3",
  workSeconds: "45",
  restSeconds: "15",
  timeCapMinutes: "12",
  ladderStart: "2",
  ladderEnd: "12",
  ladderStep: "2",
};

function categoryBlockFromSuggestion(r: Suggestion): CategoryBlock {
  const s = r.suggestedFormat;
  return {
    id: uid(),
    kind: "category",
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    pool: r.pool,
    items: r.picks.map(itemFromExercise),
    format: s.format,
    rounds: s.rounds ? String(s.rounds) : FALLBACK_FORMAT_FIELDS.rounds,
    workSeconds: s.workSeconds ? String(s.workSeconds) : FALLBACK_FORMAT_FIELDS.workSeconds,
    restSeconds: s.restSeconds ? String(s.restSeconds) : FALLBACK_FORMAT_FIELDS.restSeconds,
    timeCapMinutes: s.timeCapMinutes ? String(s.timeCapMinutes) : FALLBACK_FORMAT_FIELDS.timeCapMinutes,
    ladderStart: s.ladderStart ? String(s.ladderStart) : FALLBACK_FORMAT_FIELDS.ladderStart,
    ladderEnd: s.ladderEnd ? String(s.ladderEnd) : FALLBACK_FORMAT_FIELDS.ladderEnd,
    ladderStep: s.ladderStep ? String(s.ladderStep) : FALLBACK_FORMAT_FIELDS.ladderStep,
    ladderPyramid: s.ladderPyramid ?? false,
    ladderUnit: s.ladderUnit ?? "reps",
    isPartner: false,
    partnerNote: "",
  };
}

function blockMinutes(b: CategoryBlock): number {
  if (b.format === "circuit" || b.format === "emom" || b.format === "tabata") {
    const rounds = Number(b.rounds) || 0;
    const work = Number(b.workSeconds) || 0;
    const rest = b.format === "emom" ? 0 : Number(b.restSeconds) || 0;
    const perRound = b.format === "emom" ? 1 : b.items.length;
    return (rounds * perRound * (work + rest)) / 60;
  }
  if (b.format === "amrap") {
    const rounds = Number(b.rounds) || 1;
    const work = Number(b.timeCapMinutes) || 0;
    const rest = (Number(b.restSeconds) || 0) / 60;
    return rounds * work + Math.max(rounds - 1, 0) * rest;
  }
  if (b.format === "wod") return 0;
  if (b.format === "superset") {
    const sets = Number(b.rounds) || 1;
    const restPerSet = Number(b.restSeconds) || 0;
    return (Math.max(sets - 1, 0) * restPerSet) / 60;
  }
  if (b.format === "ladder") {
    if (b.ladderUnit !== "seconds") return 0;
    const rungs = ladderRungs(Number(b.ladderStart) || 0, Number(b.ladderEnd) || 0, Number(b.ladderStep) || 1, b.ladderPyramid);
    const workSeconds = rungs.reduce((s, r) => s + r, 0);
    const restSeconds = (Number(b.restSeconds) || 0) * Math.max(rungs.length - 1, 0);
    return (workSeconds + restSeconds) / 60;
  }
  return b.items.reduce((s, it) => s + (Number(it.minutes) || 0), 0);
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

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [addCategoryId, setAddCategoryId] = useState<string>("");
  const [attendanceCount, setAttendanceCount] = useState<string>("");
  const [notes, setNotes] = useState("");

  const totalMinutes = useMemo(
    () =>
      Math.round(
        blocks.reduce((sum, b) => (b.kind === "category" ? sum + blockMinutes(b) : sum), 0),
      ),
    [blocks],
  );

  const categoryIdsInUse = useMemo(
    () => new Set(blocks.filter((b): b is CategoryBlock => b.kind === "category").map((b) => b.categoryId)),
    [blocks],
  );
  const availableCategoriesToAdd = categories.filter((c) => !categoryIdsInUse.has(c.id));

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

  // Warm-up always leads, Abs always finishes the session. Everything else is
  // ordered by the category's sortOrder — derived from how these categories
  // actually sequence across the historical sessions (Cardio, then Lower Body,
  // Upper Body, Full Body/Strength, Games) — rather than whatever order they
  // happened to be picked/generated in.
  function blockRank(b: Block): number {
    if (b.kind !== "category") return 1;
    if (b.categoryName === "Warm-up") return 0;
    if (b.categoryName === "Abs") return 2;
    return 1;
  }

  function sortWarmupFirstAbsLast(list: CategoryBlock[], categoryOrder: Category[]): CategoryBlock[] {
    const orderIndex = new Map(categoryOrder.map((c, i) => [c.id, i]));
    return [...list].sort((a, b) => {
      const rankDiff = blockRank(a) - blockRank(b);
      if (rankDiff !== 0) return rankDiff;
      return (orderIndex.get(a.categoryId) ?? 0) - (orderIndex.get(b.categoryId) ?? 0);
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
      const newBlocks: CategoryBlock[] = results.map(categoryBlockFromSuggestion);
      const empty = newBlocks.filter((b) => b.items.length === 0);
      if (empty.length > 0) {
        setError(
          `No exercises found for: ${empty.map((b) => b.categoryName).join(", ")}. Add some in the exercise library first.`,
        );
        return;
      }
      setBlocks(sortWarmupFirstAbsLast(newBlocks, categories));
      setStep(3);
    });
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function addTextBlock() {
    setBlocks((prev) => [...prev, { id: uid(), kind: "text", text: "" }]);
  }

  function updateTextBlock(id: string, text: string) {
    setBlocks((prev) => prev.map((b) => (b.id === id && b.kind === "text" ? { ...b, text } : b)));
  }

  function addCategoryBlock() {
    if (!addCategoryId) return;
    const category = categories.find((c) => c.id === addCategoryId);
    if (!category) return;
    setError(null);
    startTransition(async () => {
      const results = await getSuggestions(date, [addCategoryId]);
      const r = results[0];
      if (!r || r.pool.length === 0) {
        setError(`No exercises found for ${category.name}. Add some in the exercise library first.`);
        return;
      }
      const newBlock = categoryBlockFromSuggestion(r);
      // Insert respecting the warm-up-first/abs-last convention on arrival, without
      // re-sorting the whole list (which would undo any manual reordering she's done).
      setBlocks((prev) => {
        if (newBlock.categoryName === "Warm-up") return [newBlock, ...prev];
        return [...prev, newBlock];
      });
      setAddCategoryId("");
    });
  }

  function addExerciseToBlock(blockId: string) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId || b.kind !== "category") return b;
        const unused = b.pool.find((ex) => !b.items.some((it) => it.exerciseId === ex.id));
        const next = unused ?? b.pool[0];
        if (!next) return b;
        return { ...b, items: [...b.items, itemFromExercise(next)] };
      }),
    );
  }

  function removeExerciseFromBlock(blockId: string, itemId: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId && b.kind === "category" ? { ...b, items: b.items.filter((it) => it.id !== itemId) } : b,
      ),
    );
  }

  function swapExercise(blockId: string, itemId: string, newExerciseId: string) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId || b.kind !== "category") return b;
        const ex = b.pool.find((e) => e.id === newExerciseId);
        if (!ex) return b;
        return {
          ...b,
          items: b.items.map((it) =>
            it.id === itemId ? { ...itemFromExercise(ex), id: it.id } : it,
          ),
        };
      }),
    );
  }

  function updateItemField(blockId: string, itemId: string, field: "minutes" | "weight" | "reps", value: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId && b.kind === "category"
          ? { ...b, items: b.items.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)) }
          : b,
      ),
    );
  }

  function updateBlockFormat(blockId: string, format: RoutineFormat) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId && b.kind === "category" ? { ...b, format } : b)),
    );
  }

  function updateBlockField(
    blockId: string,
    field:
      | "rounds"
      | "workSeconds"
      | "restSeconds"
      | "timeCapMinutes"
      | "partnerNote"
      | "ladderStart"
      | "ladderEnd"
      | "ladderStep",
    value: string,
  ) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId && b.kind === "category" ? { ...b, [field]: value } : b)),
    );
  }

  function updateBlockPartner(blockId: string, isPartner: boolean) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId && b.kind === "category" ? { ...b, isPartner } : b)),
    );
  }

  function updateBlockLadderPyramid(blockId: string, ladderPyramid: boolean) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId && b.kind === "category" ? { ...b, ladderPyramid } : b)),
    );
  }

  function updateBlockLadderUnit(blockId: string, ladderUnit: string) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId && b.kind === "category" ? { ...b, ladderUnit } : b)),
    );
  }

  function save() {
    setError(null);
    const blockInputs: BlockInput[] = blocks
      .map((b): BlockInput | null => {
        if (b.kind === "text") {
          return b.text.trim() ? { type: "text", text: b.text } : null;
        }
        if (b.items.length === 0) return null;
        return {
          type: "category",
          categoryId: b.categoryId,
          format: b.format,
          rounds:
            (b.format === "circuit" || b.format === "emom" || b.format === "amrap" || b.format === "tabata" || b.format === "superset") &&
            b.rounds
              ? Number(b.rounds)
              : undefined,
          workSeconds:
            (b.format === "circuit" || b.format === "emom" || b.format === "tabata") && b.workSeconds
              ? Number(b.workSeconds)
              : undefined,
          restSeconds:
            (b.format === "circuit" ||
              b.format === "tabata" ||
              b.format === "superset" ||
              b.format === "ladder" ||
              (b.format === "amrap" && Number(b.rounds) > 1)) &&
            b.restSeconds
              ? Number(b.restSeconds)
              : undefined,
          timeCapMinutes: b.format === "amrap" && b.timeCapMinutes ? Number(b.timeCapMinutes) : undefined,
          ladderStart: b.format === "ladder" && b.ladderStart ? Number(b.ladderStart) : undefined,
          ladderEnd: b.format === "ladder" && b.ladderEnd ? Number(b.ladderEnd) : undefined,
          ladderStep: b.format === "ladder" && b.ladderStep ? Number(b.ladderStep) : undefined,
          ladderPyramid: b.format === "ladder" ? b.ladderPyramid : undefined,
          ladderUnit: b.format === "ladder" ? b.ladderUnit : undefined,
          isPartner: b.isPartner,
          partnerNote: b.isPartner && b.partnerNote ? b.partnerNote : undefined,
          exercises: b.items.map((it) => ({
            exerciseId: it.exerciseId,
            minutes: b.format === "straight_sets" && it.minutes ? Number(it.minutes) : undefined,
            weight: it.weight ? Number(it.weight) : undefined,
            reps: it.reps ? Number(it.reps) : undefined,
          })),
        };
      })
      .filter((b): b is BlockInput => b !== null);

    startTransition(async () => {
      await createSession({
        dateStr: date,
        targetMinutes,
        notes: notes || undefined,
        attendanceCount: attendanceCount ? Number(attendanceCount) : undefined,
        blocks: blockInputs,
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
            {blocks.map((b, index) => (
              <li key={b.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {b.kind === "category" ? b.categoryName : "Note"}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveBlock(index, -1)}
                      className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                      aria-label="Move up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={index === blocks.length - 1}
                      onClick={() => moveBlock(index, 1)}
                      className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                      aria-label="Move down"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(b.id)}
                      className="rounded px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {b.kind === "text" ? (
                  <textarea
                    value={b.text}
                    onChange={(e) => updateTextBlock(b.id, e.target.value)}
                    rows={3}
                    placeholder="Free-text note (instructions, warm-up game, reminders…)"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900/50">
                      <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                        Format
                        <select
                          value={b.format}
                          onChange={(e) => updateBlockFormat(b.id, e.target.value as RoutineFormat)}
                          className="rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          <option value="straight_sets">Straight sets</option>
                          <option value="circuit">Circuit (rounds)</option>
                          <option value="emom">EMOM</option>
                          <option value="amrap">AMRAP</option>
                          <option value="tabata">Tabata</option>
                          <option value="superset">Superset / Triset</option>
                          <option value="ladder">Ladder / Pyramid</option>
                          <option value="wod">WOD (for time)</option>
                        </select>
                      </label>

                      {b.format === "circuit" && (
                        <>
                          <label className="flex items-center gap-1 text-xs">
                            Rounds
                            <input
                              type="number"
                              min={1}
                              value={b.rounds}
                              onChange={(e) => updateBlockField(b.id, "rounds", e.target.value)}
                              className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            Work (s)
                            <input
                              type="number"
                              min={1}
                              value={b.workSeconds}
                              onChange={(e) => updateBlockField(b.id, "workSeconds", e.target.value)}
                              className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            Rest (s)
                            <input
                              type="number"
                              min={0}
                              value={b.restSeconds}
                              onChange={(e) => updateBlockField(b.id, "restSeconds", e.target.value)}
                              className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </label>
                        </>
                      )}

                      {b.format === "emom" && (
                        <>
                          <label className="flex items-center gap-1 text-xs">
                            Rounds (mins)
                            <input
                              type="number"
                              min={1}
                              value={b.rounds}
                              onChange={(e) => updateBlockField(b.id, "rounds", e.target.value)}
                              className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            Interval (s)
                            <input
                              type="number"
                              min={1}
                              value={b.workSeconds}
                              onChange={(e) => updateBlockField(b.id, "workSeconds", e.target.value)}
                              className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </label>
                        </>
                      )}

                      {b.format === "amrap" && (
                        <>
                          <label className="flex items-center gap-1 text-xs">
                            Rounds
                            <input
                              type="number"
                              min={1}
                              value={b.rounds}
                              onChange={(e) => updateBlockField(b.id, "rounds", e.target.value)}
                              className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            Work (min)
                            <input
                              type="number"
                              min={1}
                              value={b.timeCapMinutes}
                              onChange={(e) => updateBlockField(b.id, "timeCapMinutes", e.target.value)}
                              className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </label>
                          {Number(b.rounds) > 1 && (
                            <label className="flex items-center gap-1 text-xs">
                              Rest (s)
                              <input
                                type="number"
                                min={0}
                                value={b.restSeconds}
                                onChange={(e) => updateBlockField(b.id, "restSeconds", e.target.value)}
                                className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              />
                            </label>
                          )}
                        </>
                      )}

                      {b.format === "tabata" && (
                        <>
                          <label className="flex items-center gap-1 text-xs">
                            Rounds
                            <input
                              type="number"
                              min={1}
                              value={b.rounds}
                              onChange={(e) => updateBlockField(b.id, "rounds", e.target.value)}
                              className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            Work (s)
                            <input
                              type="number"
                              min={1}
                              value={b.workSeconds}
                              onChange={(e) => updateBlockField(b.id, "workSeconds", e.target.value)}
                              className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            Rest (s)
                            <input
                              type="number"
                              min={0}
                              value={b.restSeconds}
                              onChange={(e) => updateBlockField(b.id, "restSeconds", e.target.value)}
                              className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </label>
                          <span className="text-xs text-zinc-500">(classic Tabata: 8 x 20s/10s)</span>
                        </>
                      )}

                      {b.format === "superset" && (
                        <>
                          <label className="flex items-center gap-1 text-xs">
                            Sets
                            <input
                              type="number"
                              min={1}
                              value={b.rounds}
                              onChange={(e) => updateBlockField(b.id, "rounds", e.target.value)}
                              className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            Rest between sets (s)
                            <input
                              type="number"
                              min={0}
                              value={b.restSeconds}
                              onChange={(e) => updateBlockField(b.id, "restSeconds", e.target.value)}
                              className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </label>
                          <span className="text-xs text-zinc-500">
                            (no rest between exercises — labelled Superset/Triset/Giant set by exercise count)
                          </span>
                        </>
                      )}

                      {b.format === "ladder" && (
                        <>
                          <label className="flex items-center gap-1 text-xs">
                            Start
                            <input
                              type="number"
                              min={1}
                              value={b.ladderStart}
                              onChange={(e) => updateBlockField(b.id, "ladderStart", e.target.value)}
                              className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            End
                            <input
                              type="number"
                              min={1}
                              value={b.ladderEnd}
                              onChange={(e) => updateBlockField(b.id, "ladderEnd", e.target.value)}
                              className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            Step
                            <input
                              type="number"
                              min={1}
                              value={b.ladderStep}
                              onChange={(e) => updateBlockField(b.id, "ladderStep", e.target.value)}
                              className="w-14 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            Unit
                            <select
                              value={b.ladderUnit}
                              onChange={(e) => updateBlockLadderUnit(b.id, e.target.value)}
                              className="rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            >
                              <option value="reps">reps</option>
                              <option value="seconds">seconds</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={b.ladderPyramid}
                              onChange={(e) => updateBlockLadderPyramid(b.id, e.target.checked)}
                            />
                            Pyramid (climb back down)
                          </label>
                          {b.ladderStart && b.ladderEnd && (
                            <span className="text-xs text-zinc-500">
                              {ladderRungs(
                                Number(b.ladderStart) || 0,
                                Number(b.ladderEnd) || 0,
                                Number(b.ladderStep) || 1,
                                b.ladderPyramid,
                              ).join("/")}
                            </span>
                          )}
                        </>
                      )}

                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={b.isPartner}
                          onChange={(e) => updateBlockPartner(b.id, e.target.checked)}
                        />
                        Partner workout
                      </label>
                    </div>

                    {b.isPartner && (
                      <input
                        type="text"
                        placeholder="Partner mechanic (e.g. partner 1 holds plank while partner 2 does reps, then swap)"
                        value={b.partnerNote}
                        onChange={(e) => updateBlockField(b.id, "partnerNote", e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    )}

                    {b.items.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center gap-2">
                        <select
                          value={item.exerciseId}
                          onChange={(e) => swapExercise(b.id, item.id, e.target.value)}
                          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          {b.pool.map((ex) => (
                            <option key={ex.id} value={ex.id}>
                              {ex.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0}
                          placeholder="reps"
                          value={item.reps}
                          onChange={(e) => updateItemField(b.id, item.id, "reps", e.target.value)}
                          className="w-16 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        <span className="text-xs text-zinc-500">reps</span>
                        <input
                          type="number"
                          min={0}
                          step="0.5"
                          placeholder="kg"
                          value={item.weight}
                          onChange={(e) => updateItemField(b.id, item.id, "weight", e.target.value)}
                          className="w-16 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        <span className="text-xs text-zinc-500">kg</span>
                        {b.format === "straight_sets" && (
                          <>
                            <input
                              type="number"
                              min={1}
                              value={item.minutes}
                              onChange={(e) => updateItemField(b.id, item.id, "minutes", e.target.value)}
                              className="w-16 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            />
                            <span className="text-xs text-zinc-500">min</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => removeExerciseFromBlock(b.id, item.id)}
                          className="rounded px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                          aria-label="Remove exercise"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addExerciseToBlock(b.id)}
                      className="self-start rounded-lg border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    >
                      + Add exercise
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={addCategoryId}
              onChange={(e) => setAddCategoryId(e.target.value)}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Choose a category…</option>
              {availableCategoriesToAdd.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!addCategoryId || pending}
              onClick={addCategoryBlock}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              + Add category
            </button>
            <button
              type="button"
              onClick={addTextBlock}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              + Add text block
            </button>
          </div>

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
