/**
 * Markdown Rendering Test Script
 *
 * Tests the normalizeMarkdown function with dummy data
 * and renders the output to HTML for visual inspection
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { marked } from "marked";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy the normalizeMarkdown function from SolarResultsOverlay.tsx
// Keep it simple - only fix essential issues to avoid breaking valid markdown
const normalizeMarkdown = (markdown) => {
  if (!markdown) return "";

  let normalized = markdown
    // Convert literal \n strings to actual newlines (API may send escaped newlines)
    .replace(/\\n/g, "\n")
    // Normalize line endings
    .replace(/\r\n/g, "\n")

    // Fix table separators that are too long (normalize to reasonable length)
    .replace(/\|[-]{100,}\|/g, "|---|---|---|---|---|---|---|")

    // Clean up excessive blank lines (more than 2)
    .replace(/\n{3,}/g, "\n\n")

    // Trim
    .trim();

  // Fix malformed table separators (e.g., "-----||" -> "|--------|--------|...")
  // Process line by line to fix separators
  const lines = normalized.split("\n");
  const fixedLines = lines.map((line, index) => {
    // Check if this line is a malformed separator (dashes with no/incorrect pipes)
    if (/^[-]{3,}\|{0,2}$/.test(line)) {
      // Find the previous line (header row)
      const prevLine = index > 0 ? lines[index - 1] : "";
      if (prevLine && prevLine.includes("|")) {
        // Count columns in header row (split by | and filter empty cells)
        const cells = prevLine.split("|").filter((cell) => cell.trim() !== "");
        const columnCount = cells.length;
        if (columnCount > 0) {
          return "|" + Array(columnCount).fill("--------").join("|") + "|";
        }
      }
    }
    return line;
  });

  return fixedLines.join("\n");
};

// Dummy markdown data - simulating what the API returns
// Note: Using literal \n strings as the API sends them
const dummyInstallersMarkdown = `| Company Name | Contact Info + Website | Reviews | Address | Specializations + Certifications |\\n|--------|--------|--------|--------|--------|\\n| Boston Solar | (617) 841-8484 Visit Website | 5/5 stars | 12 Gill St, Suite 5650, Woburn, MA 01801 | Residential & Commercial, NABCEP Certified |\\n| EnergySage | Not available | Not available | 125 Lincoln St, Boston, MA 02111 | Residential & Commercial, Certified Installer Marketplace |\\n| Brightstar Solar | Not available | Not available | Not available | Residential & Commercial, Not available |\\n| Team Sunshine | (978) 306-6888 Visit Website | 4.8/5 stars | Not available | Residential & Commercial, Not available |\\n| Revision Energy | (866) 202-7600 Visit Website | 4.9/5 stars | 3 Mill Brook Rd, Freeport, ME 04032 | Residential & Commercial, B Corp Certified |`;

const dummyIncentivesMarkdown = `### Federal Investment Tax Credit\\n- **Type:** Federal\\n- **Value:** 30% of installation cost\\n- **Eligibility:** Available for residential solar installations up to a certain limit; must be used for qualified solar equipment.\\n\\n### Massachusetts Smart (Solar Massachusetts Renewable Target) Program\\n- **Type:** State\\n- **Value:** Up to $1,000\\n- **Eligibility:** Must be a participant in the program; financial incentives tied to approved solar installations.\\n\\n### Massachusetts Sales Tax Exemption\\n- **Type:** State\\n- **Value:** 100% exemption\\n- **Eligibility:** No sales tax applies to solar panel installations; must meet specific criteria for renewable energy systems.`;

function analyzeMarkdown(name, rawMarkdown) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`ANALYZING: ${name}`);
  console.log("=".repeat(80));

  console.log(`\n📊 Raw Markdown Statistics:`);
  console.log(`  Length: ${rawMarkdown.length} characters`);
  console.log(
    `  Literal \\n count: ${(rawMarkdown.match(/\\n/g) || []).length}`,
  );
  console.log(`  Actual newlines: ${(rawMarkdown.match(/\n/g) || []).length}`);
  console.log(`  Lines: ${rawMarkdown.split("\n").length}`);

  console.log(`\n📝 Raw Markdown (first 500 chars):`);
  console.log(
    rawMarkdown.substring(0, 500) + (rawMarkdown.length > 500 ? "..." : ""),
  );

  // Apply normalization
  const normalized = normalizeMarkdown(rawMarkdown);

  console.log(`\n📊 Normalized Markdown Statistics:`);
  console.log(`  Length: ${normalized.length} characters`);
  console.log(`  Newlines: ${(normalized.match(/\n/g) || []).length}`);
  console.log(`  Lines: ${normalized.split("\n").length}`);
  console.log(
    `  Headers (###): ${(normalized.match(/^#{1,6}\s/gm) || []).length}`,
  );
  console.log(`  Lists (-): ${(normalized.match(/^[-*+]\s/gm) || []).length}`);
  console.log(`  Tables (|): ${(normalized.match(/\|/g) || []).length}`);
  console.log(`  Table rows: ${(normalized.match(/^\|.+\|$/gm) || []).length}`);

  console.log(`\n📝 Normalized Markdown (first 500 chars):`);
  console.log(
    normalized.substring(0, 500) + (normalized.length > 500 ? "..." : ""),
  );

  // Try to render with marked
  let htmlOutput = "";
  let renderError = null;

  try {
    // Configure marked for GitHub Flavored Markdown
    marked.setOptions({
      gfm: true,
      breaks: false,
    });

    htmlOutput = marked(normalized);
    console.log(`\n✅ Markdown rendered successfully!`);
    console.log(`  HTML length: ${htmlOutput.length} characters`);
  } catch (error) {
    renderError = error;
    console.log(`\n❌ Error rendering markdown: ${error.message}`);
    console.error(error);
  }

  // Save to HTML file for visual inspection
  const outputDir = path.join(__dirname, "..", "test-output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const htmlPath = path.join(
    outputDir,
    `test-${name.toLowerCase().replace(/\s/g, "-")}.html`,
  );
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Rendering Test - ${name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #667eea;
            margin-bottom: 30px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        .section {
            margin-bottom: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .section h2 {
            color: #764ba2;
            margin-bottom: 15px;
        }
        .raw-content {
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-all;
            margin: 10px 0;
        }
        .normalized-content {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 15px;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            overflow-x: auto;
            white-space: pre-wrap;
            margin: 10px 0;
        }
        .rendered-content {
            background: white;
            padding: 20px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            margin: 10px 0;
        }
        .rendered-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .rendered-content table th,
        .rendered-content table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .rendered-content table th {
            background-color: #667eea;
            color: white;
            font-weight: bold;
        }
        .rendered-content table tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        .rendered-content h1,
        .rendered-content h2,
        .rendered-content h3 {
            color: #667eea;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        .rendered-content ul,
        .rendered-content ol {
            margin-left: 30px;
            margin-bottom: 15px;
        }
        .rendered-content li {
            margin-bottom: 8px;
        }
        .rendered-content strong {
            color: #764ba2;
            font-weight: bold;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background: white;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
        }
        .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
        }
        .error {
            background: #fee;
            color: #c33;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #fcc;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Markdown Rendering Test - ${name}</h1>
        
        <div class="section">
            <h2>📊 Statistics</h2>
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-label">Raw Length</div>
                    <div class="stat-value">${rawMarkdown.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Normalized Length</div>
                    <div class="stat-value">${normalized.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Newlines</div>
                    <div class="stat-value">${(normalized.match(/\n/g) || []).length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Table Rows</div>
                    <div class="stat-value">${(normalized.match(/^\|.+\|$/gm) || []).length}</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>📝 Raw Markdown (as received from API)</h2>
            <div class="raw-content">${rawMarkdown.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        </div>
        
        <div class="section">
            <h2>🔧 Normalized Markdown (after processing)</h2>
            <div class="normalized-content">${normalized.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        </div>
        
        <div class="section">
            <h2>🎨 Rendered Output</h2>
            ${renderError ? `<div class="error"><strong>Error:</strong> ${renderError.message}</div>` : ""}
            <div class="rendered-content">${htmlOutput || "<p>No output generated</p>"}</div>
        </div>
    </div>
</body>
</html>`;

  fs.writeFileSync(htmlPath, htmlContent);
  console.log(`\n💾 HTML output saved to: ${htmlPath}`);
  console.log(
    `   Open this file in your browser to see the rendered markdown\n`,
  );

  return { rawMarkdown, normalized, htmlOutput, renderError };
}

// Run tests
console.log("\n🧪 Starting Markdown Rendering Tests...\n");

const installersResult = analyzeMarkdown("Installers", dummyInstallersMarkdown);
const incentivesResult = analyzeMarkdown("Incentives", dummyIncentivesMarkdown);

console.log("\n" + "=".repeat(80));
console.log("✅ Tests Complete!");
console.log("=".repeat(80));
console.log("\n📁 Check the test-output/ directory for HTML files");
console.log("   Open them in your browser to see the rendered markdown\n");
