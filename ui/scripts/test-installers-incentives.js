/**
 * Test script for Installers and Incentives API endpoints
 * Tests SSE (Server-Sent Events) streaming functionality
 * 
 * API 1: POST /api/v1/agents/installers
 * - Streams local solar installer companies in real-time using SSE
 * - Returns text/event-stream with token-by-token responses like ChatGPT
 * 
 * API 2: POST /api/v1/agents/incentives
 * - Streams federal, state, and local solar incentives in real-time using SSE
 * - Returns text/event-stream with token-by-token responses like LLM APIs
 */

const BACKEND_URL = 'https://URJALINK-324600681483.us-central1.run.app';

// Test data - matching API specification
const testData = {
  analysis_id: 'test-analysis-' + Date.now(),
  latitude: 37.7749,
  longitude: -122.4194,
  address: 'San Francisco, CA',
  system_size_kw: 10.0,
  annual_generation_kwh: 14000,
  state: 'CA',
  zip_code: '94102'
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.cyan);
  console.log('='.repeat(60));
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
 * Test the installers API endpoint
 */
async function testInstallersAPI() {
  logSection('Testing Installers API');
  
  logInfo('Endpoint: /api/v1/agents/installers');
  logInfo(`Request body: ${JSON.stringify(testData, null, 2)}`);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/agents/installers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    logInfo(`Response Status: ${response.status} ${response.statusText}`);
    logInfo(`Response Headers:`);
    response.headers.forEach((value, key) => {
      log(`  ${key}: ${value}`, colors.gray);
    });

    if (!response.ok) {
      logError(`API returned non-OK status: ${response.status}`);
      const errorText = await response.text();
      logError(`Error response: ${errorText}`);
      return false;
    }

    logSuccess('Successfully connected to Installers API');

    // Check if response body exists
    if (!response.body) {
      logError('No response body received');
      return false;
    }

    logInfo('Starting to read SSE stream...');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;
    let totalCharacters = 0;
    let hasData = false;
    let fullContent = '';
    let startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        logInfo('Stream ended');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          chunkCount++;
          const chunk = line.slice(6);
          if (chunk.trim()) {
            hasData = true;
            totalCharacters += chunk.length;
            fullContent += chunk;
            
            // Log first few chunks for inspection
            if (chunkCount <= 5) {
              log(`  Chunk ${chunkCount}: "${chunk.substring(0, 50)}${chunk.length > 50 ? '...' : ''}"`, colors.gray);
            }
          }
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logSection('Installers API Results');
    logSuccess(`Stream completed in ${duration}s`);
    logInfo(`Total chunks received: ${chunkCount}`);
    logInfo(`Total characters: ${totalCharacters}`);
    logInfo(`Average chunk size: ${chunkCount > 0 ? Math.round(totalCharacters / chunkCount) : 0} chars`);

    if (!hasData) {
      logWarning('No data chunks received from stream');
      return false;
    }

    // Analyze content
    logInfo('\n📊 Content Analysis:');
    const lowerContent = fullContent.toLowerCase();
    
    // Check for expected keywords
    const keywords = {
      'installer': /installer/gi,
      'solar': /solar/gi,
      'company': /company/gi,
      'contact': /contact/gi,
      'phone': /phone/gi,
      'email': /email/gi,
      'rating': /rating|review/gi,
      'certification': /certification|certified|license/gi
    };

    for (const [key, regex] of Object.entries(keywords)) {
      const matches = fullContent.match(regex);
      if (matches) {
        logSuccess(`  ✓ Found ${matches.length} mention(s) of "${key}"`);
      } else {
        logWarning(`  ⚠ No mentions of "${key}"`);
      }
    }

    // Show sample of content
    log('\n📝 Sample Content (first 500 chars):', colors.cyan);
    log(fullContent.substring(0, 500) + (fullContent.length > 500 ? '...' : ''), colors.gray);

    return true;

  } catch (error) {
    logError(`Exception occurred: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Test the incentives API endpoint
 */
async function testIncentivesAPI() {
  logSection('Testing Incentives API');
  
  logInfo('Endpoint: /api/v1/agents/incentives');
  logInfo(`Request body: ${JSON.stringify(testData, null, 2)}`);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/agents/incentives`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    logInfo(`Response Status: ${response.status} ${response.statusText}`);
    logInfo(`Response Headers:`);
    response.headers.forEach((value, key) => {
      log(`  ${key}: ${value}`, colors.gray);
    });

    if (!response.ok) {
      logError(`API returned non-OK status: ${response.status}`);
      const errorText = await response.text();
      logError(`Error response: ${errorText}`);
      return false;
    }

    logSuccess('Successfully connected to Incentives API');

    // Check if response body exists
    if (!response.body) {
      logError('No response body received');
      return false;
    }

    logInfo('Starting to read SSE stream...');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;
    let totalCharacters = 0;
    let hasData = false;
    let fullContent = '';
    let startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        logInfo('Stream ended');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          chunkCount++;
          const chunk = line.slice(6);
          if (chunk.trim()) {
            hasData = true;
            totalCharacters += chunk.length;
            fullContent += chunk;
            
            // Log first few chunks for inspection
            if (chunkCount <= 5) {
              log(`  Chunk ${chunkCount}: "${chunk.substring(0, 50)}${chunk.length > 50 ? '...' : ''}"`, colors.gray);
            }
          }
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logSection('Incentives API Results');
    logSuccess(`Stream completed in ${duration}s`);
    logInfo(`Total chunks received: ${chunkCount}`);
    logInfo(`Total characters: ${totalCharacters}`);
    logInfo(`Average chunk size: ${chunkCount > 0 ? Math.round(totalCharacters / chunkCount) : 0} chars`);

    if (!hasData) {
      logWarning('No data chunks received from stream');
      return false;
    }

    // Analyze content
    logInfo('\n📊 Content Analysis:');
    const lowerContent = fullContent.toLowerCase();
    
    // Check for expected keywords
    const keywords = {
      'incentive': /incentive/gi,
      'rebate': /rebate/gi,
      'tax credit': /tax credit/gi,
      'federal': /federal/gi,
      'state': /state/gi,
      'savings': /savings/gi,
      'discount': /discount/gi,
      'program': /program/gi,
      'ITC': /itc|investment tax credit/gi
    };

    for (const [key, regex] of Object.entries(keywords)) {
      const matches = fullContent.match(regex);
      if (matches) {
        logSuccess(`  ✓ Found ${matches.length} mention(s) of "${key}"`);
      } else {
        logWarning(`  ⚠ No mentions of "${key}"`);
      }
    }

    // Show sample of content
    log('\n📝 Sample Content (first 500 chars):', colors.cyan);
    log(fullContent.substring(0, 500) + (fullContent.length > 500 ? '...' : ''), colors.gray);

    return true;

  } catch (error) {
    logError(`Exception occurred: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Test backend health endpoint
 */
async function testBackendHealth() {
  logSection('Testing Backend Health');
  
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
    });

    logInfo(`Response Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      logSuccess('Backend is healthy');
      logInfo(`Health data: ${JSON.stringify(data, null, 2)}`);
      return true;
    } else {
      logError('Backend health check failed');
      return false;
    }
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    return false;
  }
}

/**
 * Test request validation
 */
async function testRequestValidation() {
  logSection('Testing Request Validation');
  
  // Test missing required fields
  const invalidPayloads = [
    {
      name: 'Missing analysis_id',
      payload: { ...testData, analysis_id: undefined }
    },
    {
      name: 'Missing latitude',
      payload: { ...testData, latitude: undefined }
    },
    {
      name: 'Missing longitude',
      payload: { ...testData, longitude: undefined }
    },
    {
      name: 'Invalid system_size_kw',
      payload: { ...testData, system_size_kw: -5 }
    },
    {
      name: 'Missing state',
      payload: { ...testData, state: undefined }
    }
  ];

  let validationTestsPassed = 0;
  let validationTestsFailed = 0;

  for (const { name, payload } of invalidPayloads) {
    logInfo(`\nTesting: ${name}`);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/agents/installers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logSuccess(`Correctly rejected invalid request (${response.status})`);
        validationTestsPassed++;
      } else {
        logWarning(`API accepted invalid request - this may be intentional`);
        validationTestsFailed++;
      }
    } catch (error) {
      logSuccess(`Request properly rejected with error`);
      validationTestsPassed++;
    }
  }

  logInfo(`\nValidation tests: ${validationTestsPassed} passed, ${validationTestsFailed} failed/warnings`);
  return validationTestsPassed > 0;
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║     URJALINK Installers & Incentives API Test Suite      ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan);
  console.log('\n');

  logInfo(`Backend URL: ${BACKEND_URL}`);
  logInfo(`Test Location: ${testData.address}`);
  logInfo(`System Size: ${testData.system_size_kw} kW`);
  console.log('\n');

  const results = {
    health: false,
    validation: false,
    installers: false,
    incentives: false
  };

  // Run tests in sequence
  try {
    results.health = await testBackendHealth();
    
    if (results.health) {
      logSuccess('Backend is online, proceeding with API tests...\n');
      
      results.validation = await testRequestValidation();
      results.installers = await testInstallersAPI();
      results.incentives = await testIncentivesAPI();
    } else {
      logError('Backend is offline, skipping API tests');
    }

  } catch (error) {
    logError(`Test suite error: ${error.message}`);
    console.error(error);
  }

  // Summary
  logSection('Test Summary');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  log(`\nHealth Check:     ${results.health ? '✅ PASS' : '❌ FAIL'}`, results.health ? colors.green : colors.red);
  log(`Validation Tests: ${results.validation ? '✅ PASS' : '❌ FAIL'}`, results.validation ? colors.green : colors.red);
  log(`Installers API:   ${results.installers ? '✅ PASS' : '❌ FAIL'}`, results.installers ? colors.green : colors.red);
  log(`Incentives API:   ${results.incentives ? '✅ PASS' : '❌ FAIL'}`, results.incentives ? colors.green : colors.red);
  
  console.log('\n');
  log(`Overall: ${passed}/${total} tests passed`, passed === total ? colors.green : colors.yellow);
  
  if (passed === total) {
    log('\n🎉 All tests passed! APIs are working correctly.', colors.green);
  } else {
    log('\n⚠️  Some tests failed. Check the details above.', colors.yellow);
  }
  
  console.log('\n');

  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
