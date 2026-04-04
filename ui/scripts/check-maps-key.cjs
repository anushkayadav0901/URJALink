#!/usr/bin/env node
/**
 * CommonJS version of the maps key checker (works when package.json sets "type": "module").
 */
const fs = require("fs");
const path = require("path");

// Try to load dotenv if available and a .env file exists
try {
  const dotenvPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(dotenvPath)) {
    require("dotenv").config({ path: dotenvPath });
  }
} catch (e) {
  // ignore
}

const key = process.env.VITE_GOOGLE_MAPS_API_KEY;
if (!key) {
  console.error(
    "VITE_GOOGLE_MAPS_API_KEY is not set. Add it to .env or set the env var.",
  );
  process.exit(1);
}

const libraries = ["drawing", "places"].join(",");
const url = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=${libraries}`;

async function run() {
  try {
    // Node 18+ has global fetch
    const res = await fetch(url);
    const body = await res.text();

    const errorIndicators = [
      "Google Maps JavaScript API error",
      "InvalidKeyMapError",
      "ApiNotActivatedMapError",
      "refererNotAllowedMapError",
      "DailyLimitExceeded",
      "dailyLimitExceeded",
      "The provided API key is invalid",
      "This API project is not authorized to use this API",
    ];

    const found = errorIndicators.find((s) => body.includes(s));
    if (found) {
      console.error("Maps API returned an error indicator:", found);
      const idx = body.indexOf(found);
      console.error(
        "Response snippet:",
        body.substring(Math.max(0, idx - 100), idx + 200),
      );
      process.exit(2);
    }

    if (
      body.length > 100 &&
      (body.includes("google") ||
        body.includes("window.google") ||
        body.includes("function"))
    ) {
      console.log(
        "Key seems valid: received Maps JS bundle (length:",
        body.length + ")",
      );
      process.exit(0);
    }

    console.warn(
      "Unable to conclusively validate key. Response length:",
      body.length,
    );
    console.warn(body.substring(0, 400));
    process.exit(2);
  } catch (err) {
    console.error("Fetch failed:", err && err.message ? err.message : err);
    process.exit(2);
  }
}

run();
