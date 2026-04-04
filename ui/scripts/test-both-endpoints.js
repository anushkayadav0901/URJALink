/**
 * Comprehensive Diagnostic Test - Both Endpoints
 */

const BACKEND_URL = "https://URJALINK-324600681483.us-central1.run.app";

const testData = {
  analysis_id: "test-123",
  latitude: 37.7749,
  longitude: -122.4194,
  address: "San Francisco, CA",
  system_size_kw: 10.0,
  annual_generation_kwh: 14000,
};

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testEndpoint(endpointName, endpointPath) {
  log(`\n${"═".repeat(60)}`, colors.cyan);
  log(`Testing ${endpointName}`, colors.cyan);
  log("═".repeat(60), colors.cyan);
  log(`URL: ${BACKEND_URL}${endpointPath}`, colors.gray);
  console.log("");

  try {
    const response = await fetch(`${BACKEND_URL}${endpointPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData),
    });

    log(`Status: ${response.status} ${response.statusText}`, colors.green);
    log(`Content-Type: ${response.headers.get("content-type")}`, colors.green);

    if (!response.body) {
      log("❌ No response body", colors.red);
      return { success: false, reason: "No response body" };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let chunkCount = 0;
    let totalBytes = 0;
    let allContent = "";

    log("📡 Reading stream...", colors.blue);
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunkCount++;
      totalBytes += value.length;
      const chunk = decoder.decode(value, { stream: true });
      allContent += chunk;

      if (chunkCount === 1) {
        log(`\nFirst chunk (${value.length} bytes):`, colors.gray);
        log(chunk.substring(0, 150) + "...", colors.gray);
      } else if (chunkCount % 20 === 0) {
        process.stdout.write(".");
      }
    }

    if (chunkCount >= 20) console.log("");

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const dataLines = allContent
      .split("\n")
      .filter((line) => line.startsWith("data: "));

    log(`\n✓ Completed in ${duration}s`, colors.green);
    log(`✓ Chunks: ${chunkCount}, Bytes: ${totalBytes}`, colors.green);
    log(`✓ SSE lines: ${dataLines.length}`, colors.green);

    // Extract actual content
    const extractedContent = dataLines
      .map((line) => line.substring(6))
      .join("");

    if (extractedContent.length > 0) {
      log(`\n📝 Content preview (first 300 chars):`, colors.cyan);
      log(extractedContent.substring(0, 300) + "...", colors.gray);

      // Check if it's the raw StreamChunk object or actual text
      if (
        extractedContent.includes("StreamChunk") ||
        extractedContent.includes("ChoiceDelta")
      ) {
        log(
          `\n⚠️  WARNING: Receiving raw Python/OpenAI objects, not markdown text`,
          colors.yellow,
        );
        return { success: false, reason: "Raw objects instead of text" };
      } else {
        log(`\n✅ SUCCESS: Receiving proper text content`, colors.green);
        return {
          success: true,
          duration,
          chunks: chunkCount,
          bytes: totalBytes,
        };
      }
    } else {
      log(`\n❌ No content extracted`, colors.red);
      return { success: false, reason: "No content" };
    }
  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, colors.red);
    return { success: false, reason: error.message };
  }
}

async function runAllTests() {
  console.log("\n");
  log(
    "╔════════════════════════════════════════════════════════════╗",
    colors.cyan,
  );
  log(
    "║       Comprehensive Backend Streaming Test - LOCAL       ║",
    colors.cyan,
  );
  log(
    "╚════════════════════════════════════════════════════════════╝",
    colors.cyan,
  );
  console.log("\n");
  log(`Backend: ${BACKEND_URL}`, colors.blue);
  log(`Payload: ${JSON.stringify(testData, null, 2)}`, colors.gray);

  const results = {
    installers: await testEndpoint(
      "Installers API",
      "/api/v1/agents/installers",
    ),
    incentives: await testEndpoint(
      "Incentives API",
      "/api/v1/agents/incentives",
    ),
  };

  // Summary
  log(`\n\n${"═".repeat(60)}`, colors.cyan);
  log("Summary", colors.cyan);
  log("═".repeat(60), colors.cyan);

  log(
    `\nInstallers API: ${results.installers.success ? "✅ PASS" : "❌ FAIL"}`,
    results.installers.success ? colors.green : colors.red,
  );
  if (!results.installers.success) {
    log(`  Reason: ${results.installers.reason}`, colors.yellow);
  }

  log(
    `\nIncentives API: ${results.incentives.success ? "✅ PASS" : "❌ FAIL"}`,
    results.incentives.success ? colors.green : colors.red,
  );
  if (!results.incentives.success) {
    log(`  Reason: ${results.incentives.reason}`, colors.yellow);
  }

  console.log("\n");

  if (results.installers.success && results.incentives.success) {
    log("🎉 Both endpoints working correctly!", colors.green);
  } else {
    log("⚠️  Issues detected - see details above", colors.yellow);
  }

  console.log("\n");
}

runAllTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
