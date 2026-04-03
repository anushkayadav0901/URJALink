export function getMapsApiKey(): string {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.warn(
      "[maps-key] VITE_GOOGLE_MAPS_API_KEY is not set. " +
      "Google Maps features will not work. " +
      "Add it to your .env file in the ui/ directory."
    );
    return "";
  }
  return key;
}
