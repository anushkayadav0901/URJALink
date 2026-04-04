/**
 * SSE Chunk Inspector
 * Shows exactly what the backend is sending in each SSE chunk
 */

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const testData = {
  analysis_id: "chunk-test-" + Date.now(),
  latitude: 37.7749,
  longitude: -122.4194,
  address: "123 Market Street, San Francisco, CA 94102",
  system_size_kw: 10.5,
  annual_generation_kwh: 14500,
  state: "CA",
  zip_code: "94102",
};

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
  bright: "\x1b[1m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function inspectSSEChunks(endpoint, name) {
  log(`\n${"=".repeat(80)}`, colors.cyan);
  log(`INSPECTING: ${name}`, colors.cyan + colors.bright);
  log(`${"=".repeat(80)}`, colors.cyan);

  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(testData),
    });

    if (!response.ok) {
      log(`❌ API error: ${response.status}`, colors.red);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let chunkIndex = 0;
    let hasNewlines = false;
    let hasSpaces = false;
    let totalChars = 0;

    const specialChars = {
      newlines: 0,
      carriageReturns: 0,
      tabs: 0,
      spaces: 0,
    };

    log(`\n📦 Reading SSE Stream (showing first 20 chunks)...`, colors.blue);
    log(`${"─".repeat(80)}`, colors.gray);

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let eventBuffer = [];

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataLine = line.slice(6);
          eventBuffer.push(dataLine);
        } else if (line === "") {
          // Empty line indicates end of event - join data lines with \n per SSE spec
          if (eventBuffer.length > 0) {
            chunkIndex++;
            const chunk = eventBuffer.join("\n");
            eventBuffer = [];

            if (chunk.trim() && chunk.toUpperCase() !== "[DONE]") {
              totalChars += chunk.length;

              // Count special characters
              const newlineCount = (chunk.match(/\n/g) || []).length;
              const crCount = (chunk.match(/\r/g) || []).length;
              const tabCount = (chunk.match(/\t/g) || []).length;
              const spaceCount = (chunk.match(/ /g) || []).length;

              specialChars.newlines += newlineCount;
              specialChars.carriageReturns += crCount;
              specialChars.tabs += tabCount;
              specialChars.spaces += spaceCount;

              if (newlineCount > 0) hasNewlines = true;
              if (spaceCount > 0) hasSpaces = true;

              if (chunkIndex <= 20) {
                log(`\nChunk #${chunkIndex}:`, colors.cyan);
                log(`  Length: ${chunk.length} chars`, colors.gray);
                log(
                  `  Contains newlines: ${newlineCount > 0 ? "✅" : "❌"} (${newlineCount})`,
                  newlineCount > 0 ? colors.green : colors.red,
                );
                log(
                  `  Contains spaces: ${spaceCount > 0 ? "✅" : "❌"} (${spaceCount})`,
                  spaceCount > 0 ? colors.green : colors.red,
                );

                // Show raw chunk (escaped)
                const escaped = JSON.stringify(chunk);
                log(
                  `  Raw: ${escaped.substring(0, 100)}${escaped.length > 100 ? "..." : ""}`,
                  colors.yellow,
                );

                // Show visible representation
                const visible = chunk
                  .replace(/\n/g, "⏎\n")
                  .replace(/\r/g, "↵")
                  .replace(/\t/g, "→")
                  .replace(/ /g, "·");
                log(
                  `  Visual: ${visible.substring(0, 100)}${visible.length > 100 ? "..." : ""}`,
                  colors.magenta,
                );
              }
            }
          }
        }
      }
    }

    log(`\n${"─".repeat(80)}`, colors.gray);
    log(`📊 SUMMARY:`, colors.cyan + colors.bright);
    log(`  Total chunks: ${chunkIndex}`, colors.gray);
    log(`  Total characters: ${totalChars}`, colors.gray);
    log(
      `  Contains ANY newlines: ${hasNewlines ? "✅ YES" : "❌ NO"}`,
      hasNewlines ? colors.green : colors.red,
    );
    log(
      `  Contains ANY spaces: ${hasSpaces ? "✅ YES" : "❌ NO"}`,
      hasSpaces ? colors.green : colors.red,
    );

    log(`\n  Special Character Counts:`, colors.blue);
    log(
      `    Newlines (\\n): ${specialChars.newlines}`,
      specialChars.newlines > 0 ? colors.green : colors.red,
    );
    log(
      `    Carriage Returns (\\r): ${specialChars.carriageReturns}`,
      colors.gray,
    );
    log(`    Tabs (\\t): ${specialChars.tabs}`, colors.gray);
    log(
      `    Spaces: ${specialChars.spaces}`,
      specialChars.spaces > 0 ? colors.green : colors.red,
    );

    if (!hasNewlines) {
      log(`\n⚠️  PROBLEM IDENTIFIED:`, colors.yellow + colors.bright);
      log(
        `The backend is NOT sending newline characters in the response!`,
        colors.yellow,
      );
      log(
        `The LLM likely generates text with newlines, but they're being`,
        colors.yellow,
      );
      log(`stripped during streaming or SSE formatting.`, colors.yellow);
    }

    if (!hasSpaces) {
      log(`\n⚠️  CRITICAL PROBLEM:`, colors.red + colors.bright);
      log(
        `The backend is also stripping SPACES from the response!`,
        colors.red,
      );
      log(`This is why all words are concatenated together.`, colors.red);
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, colors.red);
    console.error(error);
  }
}

async function main() {
  log(
    "\n╔════════════════════════════════════════════════════════════════════════════╗",
    colors.cyan + colors.bright,
  );
  log(
    "║                    SSE Chunk Inspector - URJALINK                         ║",
    colors.cyan + colors.bright,
  );
  log(
    "╚════════════════════════════════════════════════════════════════════════════╝",
    colors.cyan + colors.bright,
  );

  log(`\nBackend URL: ${BACKEND_URL}`, colors.blue);
  log(`Test Location: ${testData.address}`, colors.blue);

  // Test only installers to save time (issue is same for both)
  await inspectSSEChunks("/api/v1/agents/installers", "Installers API");

  log(`\n${"=".repeat(80)}`, colors.cyan);
  log(`DIAGNOSTIC COMPLETE`, colors.cyan + colors.bright);
  log(`${"=".repeat(80)}`, colors.cyan);

  log(`\n💡 Next Steps:`, colors.yellow + colors.bright);
  log(`1. Check your backend SSE streaming code`, colors.yellow);
  log(
    `2. Verify the LLM response is not being modified before streaming`,
    colors.yellow,
  );
  log(`3. Ensure newlines are preserved in the 'data: ' field`, colors.yellow);
  log(
    `4. Check if there's any text cleaning/sanitization happening`,
    colors.yellow,
  );
  log(`\n`);
}

main().catch((error) => {
  log(`Fatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
