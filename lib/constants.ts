export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

// Crondall, Hampshire, UK
export const LOCATION = {
  name: "Crondall, Hampshire",
  latitude: 51.1936,
  longitude: -0.8459,
  timezone: "Europe/London",
};
