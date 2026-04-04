#!/usr/bin/env node
/**
 * Simple check for Google Maps JavaScript API key validity.
 *
 * What it does:
 *  - loads environment variables via dotenv (if present)
 *  - fetches the Maps JS URL using the provided key and checks the response
 *    body for known error indicators.
 *
 * Exit codes:
 *  0 - success (no obvious error strings found)
 *  1 - missing key
 *  2 - key invalid / error detected or fetch failed
 */

const fs = require("fs");
const path = require("path");
const { URL } = require("url");

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
    const res = await fetch(url);
    const body = await res.text();

    // Known error indicators in the Maps JS response
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
      // print a small snippet to help debug
      const idx = body.indexOf(found);
      console.error(
        "Response snippet:",
        body.substring(Math.max(0, idx - 100), idx + 200),
      );
      process.exit(2);
    }

    // Heuristic: if body contains 'google' or 'function' and isn't obviously an error, assume OK
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

    // Unknown state — print small part of the body
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
