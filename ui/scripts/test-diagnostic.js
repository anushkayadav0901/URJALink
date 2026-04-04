/**
 * Diagnostic Test Script
 * Answers backend developer's questions about the streaming endpoints
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

async function diagnosticTest() {
  console.log("\n");
  log(
    "╔════════════════════════════════════════════════════════════╗",
    colors.cyan,
  );
  log(
    "║          Diagnostic Test for Backend Developer           ║",
    colors.cyan,
  );
  log(
    "╚════════════════════════════════════════════════════════════╝",
    colors.cyan,
  );
  console.log("\n");

  log("Testing Installers Endpoint:", colors.cyan);
  log(`URL: ${BACKEND_URL}/api/v1/agents/installers`, colors.gray);
  log(`Payload: ${JSON.stringify(testData, null, 2)}`, colors.gray);
  console.log("\n");

  try {
    // Test 1: Simple fetch to get full response as text
    log(
      "═══════════════════════════════════════════════════════════",
      colors.cyan,
    );
    log("Test 1: Fetch full response as text", colors.cyan);
    log(
      "═══════════════════════════════════════════════════════════",
      colors.cyan,
    );

    const response1 = await fetch(`${BACKEND_URL}/api/v1/agents/installers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData),
    });

    log(
      `\n✓ Status Code: ${response1.status} ${response1.statusText}`,
      colors.green,
    );
    log(
      `✓ Content-Type: ${response1.headers.get("content-type")}`,
      colors.green,
    );

    console.log("\n📋 All Response Headers:");
    response1.headers.forEach((value, key) => {
      log(`  ${key}: ${value}`, colors.gray);
    });

    const fullText = await response1.text();
    log(
      `\n✓ Response Body Length: ${fullText.length} characters`,
      colors.green,
    );

    if (fullText.length === 0) {
      log("⚠️  Response body is COMPLETELY EMPTY (0 bytes)", colors.yellow);
    } else {
      log(`✓ Response body contains data`, colors.green);
      log(`\nFull Response Body:`, colors.cyan);
      log("─".repeat(60), colors.gray);
      console.log(fullText);
      log("─".repeat(60), colors.gray);

      // Check for SSE format
      if (fullText.includes("data: ")) {
        log(`\n✓ Response contains SSE format "data: " prefix`, colors.green);
        const dataLines = fullText
          .split("\n")
          .filter((line) => line.startsWith("data: "));
        log(`✓ Found ${dataLines.length} SSE data lines`, colors.green);
      } else {
        log(`\n⚠️  Response does NOT contain "data: " prefix`, colors.yellow);
      }
    }

    // Test 2: Streaming test
    log(
      "\n\n═══════════════════════════════════════════════════════════",
      colors.cyan,
    );
    log("Test 2: Streaming with Reader", colors.cyan);
    log(
      "═══════════════════════════════════════════════════════════",
      colors.cyan,
    );

    const response2 = await fetch(`${BACKEND_URL}/api/v1/agents/installers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData),
    });

    if (!response2.body) {
      log("\n❌ No response.body available", colors.red);
      return;
    }

    const reader = response2.body.getReader();
    const decoder = new TextDecoder();
    let chunkCount = 0;
    let totalBytes = 0;
    let allContent = "";
    let dataLineCount = 0;

    log("\n📡 Reading stream...", colors.blue);
    console.log("");

    const startTime = Date.now();
    const timeout = setTimeout(() => {
      log("\n⏱️  Timeout after 30 seconds", colors.yellow);
      reader.cancel();
    }, 30000);

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        clearTimeout(timeout);
        log("\n✓ Stream ended normally", colors.green);
        break;
      }

      chunkCount++;
      totalBytes += value.length;
      const chunk = decoder.decode(value, { stream: true });
      allContent += chunk;

      // Count data lines in this chunk
      const lines = chunk.split("\n");
      const dataLinesInChunk = lines.filter((line) =>
        line.startsWith("data: "),
      ).length;
      dataLineCount += dataLinesInChunk;

      // Show progress
      if (chunkCount === 1) {
        log(`First chunk received (${value.length} bytes):`, colors.gray);
        log(chunk.substring(0, 200), colors.gray);
        if (chunk.length > 200) log("...", colors.gray);
      } else if (chunkCount % 10 === 0) {
        process.stdout.write(".");
      }
    }

    if (chunkCount >= 10) console.log("");

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log(`\n📊 Streaming Statistics:`, colors.cyan);
    log(`  ✓ Duration: ${duration} seconds`, colors.green);
    log(`  ✓ Total chunks received: ${chunkCount}`, colors.green);
    log(`  ✓ Total bytes: ${totalBytes}`, colors.green);
    log(`  ✓ Total characters: ${allContent.length}`, colors.green);
    log(`  ✓ SSE "data: " lines found: ${dataLineCount}`, colors.green);

    if (chunkCount === 0) {
      log("\n❌ PROBLEM: Stream ended immediately with no chunks", colors.red);
    } else if (totalBytes === 0) {
      log("\n❌ PROBLEM: Received chunks but all empty (0 bytes)", colors.red);
    } else if (dataLineCount === 0) {
      log(
        '\n⚠️  PROBLEM: Received data but no "data: " SSE format lines',
        colors.yellow,
      );
      log("\nSample of what we received:", colors.cyan);
      log(allContent.substring(0, 500), colors.gray);
    } else {
      log("\n✅ SUCCESS: Received streaming data in SSE format!", colors.green);

      // Extract actual content
      const contentLines = allContent
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.substring(6));

      const actualContent = contentLines.join("");

      log(
        `\n📝 Extracted Content (${actualContent.length} chars):`,
        colors.cyan,
      );
      log("─".repeat(60), colors.gray);
      log(actualContent.substring(0, 800), colors.gray);
      if (actualContent.length > 800) {
        log("\n...\n", colors.gray);
        log(actualContent.substring(actualContent.length - 200), colors.gray);
      }
      log("─".repeat(60), colors.gray);
    }
  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, colors.red);
    console.error(error);
  }

  console.log("\n");
}

// Run the diagnostic
diagnosticTest().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
