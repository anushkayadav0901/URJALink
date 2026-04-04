/**
 * Full integration test for Installers and Incentives API endpoints
 * Creates a real analysis first, then tests the streaming endpoints
 *
 * Flow:
 * 1. POST /api/v1/analyze - Get analysis_id and solar data
 * 2. POST /api/v1/agents/installers - Stream installer recommendations (SSE)
 * 3. POST /api/v1/agents/incentives - Stream incentive information (SSE)
 *
 * Both agent endpoints return text/event-stream with token-by-token streaming
 */

const BACKEND_URL = "https://URJALINK-324600681483.us-central1.run.app";

// Test location data - matching API specification
const testLocation = {
  latitude: 37.7749,
  longitude: -122.4194,
  address: "San Francisco, CA",
  state: "CA",
  zip_code: "94102",
};

// ANSI color codes for terminal output
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

function logSection(title) {
  console.log("\n" + "=".repeat(60));
  log(title, colors.cyan);
  console.log("=".repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

/**
 * Step 1: Create a real analysis to get valid analysis_id
 */
async function createAnalysis() {
  logSection("Step 1: Creating Solar Analysis");

  const payload = {
    latitude: testLocation.latitude,
    longitude: testLocation.longitude,
    address: testLocation.address,
  };

  logInfo(`Requesting analysis for: ${testLocation.address}`);
  logInfo(`Payload: ${JSON.stringify(payload, null, 2)}`);

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    logInfo(`Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      logError(`Analysis API error: ${errorText}`);
      return null;
    }

    const data = await response.json();
    logSuccess("Analysis created successfully");

    logInfo(`\n📊 Analysis Results:`);
    logInfo(`  Analysis ID: ${data.analysis_id}`);
    logInfo(`  Location: ${data.location.address}`);
    logInfo(`  Solar Score: ${data.solar_score}`);
    logInfo(`  System Size: ${data.solar_potential.system_size_kw} kW`);
    logInfo(
      `  Annual Generation: ${Math.round(data.solar_potential.annual_generation_kwh)} kWh`,
    );
    logInfo(
      `  Total Roof Area: ${Math.round(data.roof_analysis.total_area_sqft)} sq ft`,
    );

    return {
      analysis_id: data.analysis_id,
      system_size_kw: data.solar_potential.system_size_kw,
      annual_generation_kwh: data.solar_potential.annual_generation_kwh,
      location: data.location,
    };
  } catch (error) {
    logError(`Exception creating analysis: ${error.message}`);
    console.error(error);
    return null;
  }
}

/**
 * Test the installers API endpoint with real analysis data
 */
async function testInstallersAPI(analysisData) {
  logSection("Step 2: Testing Installers API");

  const requestBody = {
    analysis_id: analysisData.analysis_id,
    latitude: analysisData.location.latitude,
    longitude: analysisData.location.longitude,
    address: analysisData.location.address,
    system_size_kw: analysisData.system_size_kw,
    annual_generation_kwh: analysisData.annual_generation_kwh,
    state: testLocation.state,
    zip_code: testLocation.zip_code,
  };

  logInfo("Endpoint: /api/v1/agents/installers");
  logInfo(`Request body: ${JSON.stringify(requestBody, null, 2)}`);

  // Generate curl command for debugging
  const curlCmd = `curl -X POST "${BACKEND_URL}/api/v1/agents/installers" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(requestBody)}'`;
  log(`\n🔧 Debug curl command:\n${curlCmd}\n`, colors.gray);

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/agents/installers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    logInfo(`Response Status: ${response.status} ${response.statusText}`);
    logInfo(`Content-Type: ${response.headers.get("content-type")}`);

    if (!response.ok) {
      logError(`API returned non-OK status: ${response.status}`);
      const errorText = await response.text();
      logError(`Error response: ${errorText}`);
      return false;
    }

    logSuccess("Successfully connected to Installers API");

    if (!response.body) {
      logError("No response body received");
      return false;
    }

    logInfo("📡 Streaming installers data...");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let chunkCount = 0;
    let totalCharacters = 0;
    let hasData = false;
    let fullContent = "";
    let startTime = Date.now();
    const maxWaitTime = 60000; // 60 seconds timeout

    const readTimeout = setTimeout(() => {
      logWarning("Stream timeout after 60 seconds");
      reader.cancel();
    }, maxWaitTime);

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        clearTimeout(readTimeout);
        logInfo("Stream completed");
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          chunkCount++;
          const chunk = line.slice(6);
          if (chunk.trim()) {
            hasData = true;
            totalCharacters += chunk.length;
            fullContent += chunk;

            // Show progress every 50 chunks
            if (chunkCount % 50 === 0) {
              process.stdout.write(".");
            }

            // Log first few chunks for inspection
            if (chunkCount <= 3) {
              log(
                `  Chunk ${chunkCount}: "${chunk.substring(0, 60)}${chunk.length > 60 ? "..." : ""}"`,
                colors.gray,
              );
            }
          }
        }
      }
    }

    if (chunkCount >= 50) {
      console.log(""); // New line after progress dots
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logSection("Installers API Results");
    logSuccess(`Stream completed in ${duration}s`);
    logInfo(`Total chunks received: ${chunkCount}`);
    logInfo(`Total characters: ${totalCharacters}`);
    logInfo(
      `Average chunk size: ${chunkCount > 0 ? Math.round(totalCharacters / chunkCount) : 0} chars`,
    );

    if (!hasData) {
      logWarning("No data chunks received from stream");
      logInfo(
        "This might indicate the API is working but returning empty results",
      );
      return false;
    }

    // Analyze content
    logInfo("\n📊 Content Analysis:");

    // Check for expected keywords
    const keywords = {
      installer: /installer/gi,
      solar: /solar/gi,
      company: /company/gi,
      contact: /contact/gi,
      phone: /phone/gi,
      email: /email/gi,
      rating: /rating|review/gi,
      certification: /certification|certified|license/gi,
      website: /website|www\.|\.com/gi,
    };

    let keywordMatches = 0;
    for (const [key, regex] of Object.entries(keywords)) {
      const matches = fullContent.match(regex);
      if (matches) {
        logSuccess(`  ✓ Found ${matches.length} mention(s) of "${key}"`);
        keywordMatches++;
      }
    }

    // Show sample of content
    log("\n📝 Sample Content (first 800 chars):", colors.cyan);
    log(
      fullContent.substring(0, 800) + (fullContent.length > 800 ? "..." : ""),
      colors.gray,
    );

    if (fullContent.length > 800) {
      log("\n📝 Last 400 chars:", colors.cyan);
      log("..." + fullContent.substring(fullContent.length - 400), colors.gray);
    }

    return keywordMatches >= 3; // At least 3 relevant keywords should be present
  } catch (error) {
    logError(`Exception occurred: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Test the incentives API endpoint with real analysis data
 */
async function testIncentivesAPI(analysisData) {
  logSection("Step 3: Testing Incentives API");

  const requestBody = {
    analysis_id: analysisData.analysis_id,
    latitude: analysisData.location.latitude,
    longitude: analysisData.location.longitude,
    address: analysisData.location.address,
    system_size_kw: analysisData.system_size_kw,
    annual_generation_kwh: analysisData.annual_generation_kwh,
    state: testLocation.state,
    zip_code: testLocation.zip_code,
  };

  logInfo("Endpoint: /api/v1/agents/incentives");
  logInfo(`Request body: ${JSON.stringify(requestBody, null, 2)}`);

  // Generate curl command for debugging
  const curlCmd = `curl -X POST "${BACKEND_URL}/api/v1/agents/incentives" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(requestBody)}'`;
  log(`\n🔧 Debug curl command:\n${curlCmd}\n`, colors.gray);

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/agents/incentives`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    logInfo(`Response Status: ${response.status} ${response.statusText}`);
    logInfo(`Content-Type: ${response.headers.get("content-type")}`);

    if (!response.ok) {
      logError(`API returned non-OK status: ${response.status}`);
      const errorText = await response.text();
      logError(`Error response: ${errorText}`);
      return false;
    }

    logSuccess("Successfully connected to Incentives API");

    if (!response.body) {
      logError("No response body received");
      return false;
    }

    logInfo("📡 Streaming incentives data...");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let chunkCount = 0;
    let totalCharacters = 0;
    let hasData = false;
    let fullContent = "";
    let startTime = Date.now();
    const maxWaitTime = 60000; // 60 seconds timeout

    const readTimeout = setTimeout(() => {
      logWarning("Stream timeout after 60 seconds");
      reader.cancel();
    }, maxWaitTime);

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        clearTimeout(readTimeout);
        logInfo("Stream completed");
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          chunkCount++;
          const chunk = line.slice(6);
          if (chunk.trim()) {
            hasData = true;
            totalCharacters += chunk.length;
            fullContent += chunk;

            // Show progress every 50 chunks
            if (chunkCount % 50 === 0) {
              process.stdout.write(".");
            }

            // Log first few chunks for inspection
            if (chunkCount <= 3) {
              log(
                `  Chunk ${chunkCount}: "${chunk.substring(0, 60)}${chunk.length > 60 ? "..." : ""}"`,
                colors.gray,
              );
            }
          }
        }
      }
    }

    if (chunkCount >= 50) {
      console.log(""); // New line after progress dots
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logSection("Incentives API Results");
    logSuccess(`Stream completed in ${duration}s`);
    logInfo(`Total chunks received: ${chunkCount}`);
    logInfo(`Total characters: ${totalCharacters}`);
    logInfo(
      `Average chunk size: ${chunkCount > 0 ? Math.round(totalCharacters / chunkCount) : 0} chars`,
    );

    if (!hasData) {
      logWarning("No data chunks received from stream");
      logInfo(
        "This might indicate the API is working but returning empty results",
      );
      return false;
    }

    // Analyze content
    logInfo("\n📊 Content Analysis:");

    // Check for expected keywords
    const keywords = {
      incentive: /incentive/gi,
      rebate: /rebate/gi,
      "tax credit": /tax credit/gi,
      federal: /federal/gi,
      state: /state/gi,
      ITC: /itc|investment tax credit/gi,
      savings: /savings/gi,
      discount: /discount/gi,
      program: /program/gi,
      utility: /utility/gi,
    };

    let keywordMatches = 0;
    for (const [key, regex] of Object.entries(keywords)) {
      const matches = fullContent.match(regex);
      if (matches) {
        logSuccess(`  ✓ Found ${matches.length} mention(s) of "${key}"`);
        keywordMatches++;
      }
    }

    // Show sample of content
    log("\n📝 Sample Content (first 800 chars):", colors.cyan);
    log(
      fullContent.substring(0, 800) + (fullContent.length > 800 ? "..." : ""),
      colors.gray,
    );

    if (fullContent.length > 800) {
      log("\n📝 Last 400 chars:", colors.cyan);
      log("..." + fullContent.substring(fullContent.length - 400), colors.gray);
    }

    return keywordMatches >= 3; // At least 3 relevant keywords should be present
  } catch (error) {
    logError(`Exception occurred: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runFullIntegrationTest() {
  console.log("\n");
  log(
    "╔════════════════════════════════════════════════════════════╗",
    colors.cyan,
  );
  log(
    "║   URJALINK Full Integration Test: Analysis → Agents      ║",
    colors.cyan,
  );
  log(
    "╚════════════════════════════════════════════════════════════╝",
    colors.cyan,
  );
  console.log("\n");

  logInfo(`Backend URL: ${BACKEND_URL}`);
  logInfo(`Test Location: ${testLocation.address}`);
  console.log("\n");

  const results = {
    analysis: false,
    installers: false,
    incentives: false,
  };

  try {
    // Step 1: Create analysis
    const analysisData = await createAnalysis();

    if (!analysisData) {
      logError("Failed to create analysis. Cannot proceed with agent tests.");
      results.analysis = false;
    } else {
      results.analysis = true;
      logSuccess("✅ Analysis step completed\n");

      // Step 2: Test installers
      results.installers = await testInstallersAPI(analysisData);

      // Step 3: Test incentives
      results.incentives = await testIncentivesAPI(analysisData);
    }
  } catch (error) {
    logError(`Test suite error: ${error.message}`);
    console.error(error);
  }

  // Summary
  logSection("Test Summary");

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  log(
    `\nAnalysis Creation:  ${results.analysis ? "✅ PASS" : "❌ FAIL"}`,
    results.analysis ? colors.green : colors.red,
  );
  log(
    `Installers API:     ${results.installers ? "✅ PASS" : "❌ FAIL"}`,
    results.installers ? colors.green : colors.red,
  );
  log(
    `Incentives API:     ${results.incentives ? "✅ PASS" : "❌ FAIL"}`,
    results.incentives ? colors.green : colors.red,
  );

  console.log("\n");
  log(
    `Overall: ${passed}/${total} tests passed`,
    passed === total ? colors.green : colors.yellow,
  );

  if (passed === total) {
    log(
      "\n🎉 All tests passed! Full integration is working correctly.",
      colors.green,
    );
  } else if (passed > 0) {
    log("\n⚠️  Some tests failed. Check the details above.", colors.yellow);
  } else {
    log(
      "\n❌ All tests failed. Check the backend status and logs.",
      colors.red,
    );
  }

  console.log("\n");

  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Run the tests
runFullIntegrationTest().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
