/**
 * Test script for Google Solar API
 */

import * as dotenv from "dotenv";

dotenv.config();

const GOOGLE_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;

// Test address
const TEST_ADDRESS = {
  lat: 42.32552,
  lng: -71.1051,
  name: "14 Schiller Street, Boston, MA",
};

console.log("🧪 Testing Google Solar API\n");
console.log(`📍 Test Address: ${TEST_ADDRESS.name}`);
console.log(`🌍 Coordinates: ${TEST_ADDRESS.lat}, ${TEST_ADDRESS.lng}\n`);

async function testSolarAPI() {
  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${TEST_ADDRESS.lat}&location.longitude=${TEST_ADDRESS.lng}&key=${GOOGLE_API_KEY}`;

  console.log("🌞 Calling Solar API...");
  console.log(`   URL: ${url}\n`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ FAILED:", response.status, response.statusText);
      console.error("   Response:", errorText, "\n");

      if (response.status === 403) {
        console.log("💡 SOLUTION:");
        console.log("   The Solar API is not enabled for your API key.");
        console.log(
          "   Enable it at: https://console.cloud.google.com/apis/library/solar.googleapis.com\n",
        );
      }

      return;
    }

    const data = await response.json();

    console.log("✅ SUCCESS! Solar API Response:\n");
    console.log(`   Building name: ${data.name}`);
    console.log(
      `   Center: ${data.center?.latitude}, ${data.center?.longitude}`,
    );
    console.log(
      `   Image date: ${data.imageryDate?.year}-${data.imageryDate?.month}-${data.imageryDate?.day}`,
    );
    console.log(`   Image quality: ${data.imageryQuality}`);

    if (data.solarPotential) {
      const potential = data.solarPotential;
      console.log(`\n   Solar Potential:`);
      console.log(`     Max array panels: ${potential.maxArrayPanelsCount}`);
      console.log(`     Max array area: ${potential.maxArrayAreaMeters2} m²`);
      console.log(
        `     Roof segments: ${potential.roofSegmentStats?.length || 0}`,
      );

      if (potential.roofSegmentStats && potential.roofSegmentStats.length > 0) {
        console.log(`\n   📐 Roof Segments:`);
        potential.roofSegmentStats.forEach((segment, index) => {
          console.log(`     Segment ${index + 1}:`);
          console.log(
            `       Center: ${segment.center.latitude}, ${segment.center.longitude}`,
          );
          console.log(
            `       SW: ${segment.boundingBox.sw.latitude}, ${segment.boundingBox.sw.longitude}`,
          );
          console.log(
            `       NE: ${segment.boundingBox.ne.latitude}, ${segment.boundingBox.ne.longitude}`,
          );
          if (segment.stats) {
            console.log(
              `       Area: ${segment.stats.areaMeters2.toFixed(2)} m²`,
            );
          }
        });
      }
    }

    console.log("\n✅ Solar API is working correctly!");
    console.log("🎉 You can now use roof detection in your app!\n");
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }
}

testSolarAPI();
