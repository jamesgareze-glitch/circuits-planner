import { LOCATION, Season } from "./constants";

export type DayForecast = {
  maxTempC: number;
  minTempC: number;
  precipitationMm: number;
  windSpeedMaxKmh: number;
};

const RAIN_THRESHOLD_MM = 1;
const HIGH_WIND_THRESHOLD_KMH = 30;

/** Open-Meteo's free forecast only covers ~16 days out; beyond that (or on fetch
 * failure) callers should treat weather as unknown and fall back to season-only
 * filtering rather than failing the whole wizard. */
export async function fetchForecastForDate(date: Date): Promise<DayForecast | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const daysOut = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (daysOut < 0 || daysOut > 15) return null;

  const dateStr = date.toISOString().slice(0, 10);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(LOCATION.latitude));
  url.searchParams.set("longitude", String(LOCATION.longitude));
  url.searchParams.set("timezone", LOCATION.timezone);
  url.searchParams.set("start_date", dateStr);
  url.searchParams.set("end_date", dateStr);
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
  );

  try {
    const res = await fetch(url, { next: { revalidate: 60 * 30 } });
    if (!res.ok) return null;
    const data = await res.json();
    const daily = data.daily;
    if (!daily?.temperature_2m_max?.[0] && daily?.temperature_2m_max?.[0] !== 0) return null;
    return {
      maxTempC: daily.temperature_2m_max[0],
      minTempC: daily.temperature_2m_min[0],
      precipitationMm: daily.precipitation_sum[0] ?? 0,
      windSpeedMaxKmh: daily.wind_speed_10m_max[0] ?? 0,
    };
  } catch {
    return null;
  }
}

export function seasonForDate(date: Date): Season {
  const month = date.getMonth(); // 0-11
  if (month === 11 || month <= 1) return "winter";
  if (month <= 4) return "spring";
  if (month <= 7) return "summer";
  return "autumn";
}

export function passesWeatherRules(
  exercise: { minTempC: number | null; maxTempC: number | null; avoidRain: boolean; avoidHighWind: boolean },
  forecast: DayForecast,
): boolean {
  if (exercise.minTempC !== null && forecast.maxTempC < exercise.minTempC) return false;
  if (exercise.maxTempC !== null && forecast.minTempC > exercise.maxTempC) return false;
  if (exercise.avoidRain && forecast.precipitationMm > RAIN_THRESHOLD_MM) return false;
  if (exercise.avoidHighWind && forecast.windSpeedMaxKmh > HIGH_WIND_THRESHOLD_KMH) return false;
  return true;
}

export function passesSeasonRule(exercise: { seasons: string[] }, season: Season): boolean {
  if (exercise.seasons.length === 0) return true;
  return exercise.seasons.includes(season);
}
