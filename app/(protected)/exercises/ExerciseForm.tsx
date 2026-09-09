import { SEASONS } from "@/lib/constants";

type Category = { id: string; name: string };
type ExerciseDefaults = {
  id?: string;
  name?: string;
  categoryId?: string;
  description?: string | null;
  estimatedMinutes?: number;
  minTempC?: number | null;
  maxTempC?: number | null;
  avoidRain?: boolean;
  avoidHighWind?: boolean;
  seasons?: string[];
};

export function ExerciseForm({
  action,
  categories,
  defaults,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  categories: Category[];
  defaults?: ExerciseDefaults;
  submitLabel: string;
}) {
  const seasons = defaults?.seasons ?? [];

  return (
    <form action={action} className="flex flex-col gap-4">
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          type="text"
          name="name"
          required
          defaultValue={defaults?.name}
          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Category
        <select
          name="categoryId"
          required
          defaultValue={defaults?.categoryId}
          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="" disabled>
            Choose a category
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          name="description"
          rows={2}
          defaultValue={defaults?.description ?? ""}
          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Estimated minutes
        <input
          type="number"
          name="estimatedMinutes"
          min={1}
          required
          defaultValue={defaults?.estimatedMinutes ?? 5}
          className="w-24 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <fieldset className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <legend className="px-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Weather suitability (optional)
        </legend>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Min °C
            <input
              type="number"
              name="minTempC"
              defaultValue={defaults?.minTempC ?? ""}
              className="w-20 rounded-lg border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Max °C
            <input
              type="number"
              name="maxTempC"
              defaultValue={defaults?.maxTempC ?? ""}
              className="w-20 rounded-lg border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="avoidRain" defaultChecked={defaults?.avoidRain} />
            Avoid if rain
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="avoidHighWind" defaultChecked={defaults?.avoidHighWind} />
            Avoid if high wind
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <legend className="px-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Seasons (leave all unchecked = all year)
        </legend>
        <div className="flex flex-wrap gap-4">
          {SEASONS.map((season) => (
            <label key={season} className="flex items-center gap-2 text-sm capitalize">
              <input
                type="checkbox"
                name={`season-${season}`}
                defaultChecked={seasons.includes(season)}
              />
              {season}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        className="self-start rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        {submitLabel}
      </button>
    </form>
  );
}
