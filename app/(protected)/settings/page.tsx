import { getSettings } from "@/lib/settings";
import { LOCATION } from "@/lib/constants";
import { updateSettings } from "./actions";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <form action={updateSettings} className="flex flex-col gap-4">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="weatherFilter" defaultChecked={settings.weatherFilter} />
          Filter exercises by forecast weather ({LOCATION.name})
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="seasonFilter" defaultChecked={settings.seasonFilter} />
          Filter exercises by time of year
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="recencyFilter" defaultChecked={settings.recencyFilter} />
          Don&apos;t reuse an exercise from the previous
          <input
            type="number"
            name="recencyWeeks"
            min={1}
            defaultValue={settings.recencyWeeks}
            className="w-16 rounded-lg border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
          weeks
        </label>
        <label className="flex items-center gap-3 text-sm">
          When generating a workout, pick
          <input
            type="number"
            name="exercisesPerCategoryDefault"
            min={1}
            defaultValue={settings.exercisesPerCategoryDefault}
            className="w-16 rounded-lg border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
          exercise(s) per category by default
        </label>
        <button
          type="submit"
          className="self-start rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Save
        </button>
      </form>
    </div>
  );
}
