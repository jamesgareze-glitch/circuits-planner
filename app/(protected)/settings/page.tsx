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
