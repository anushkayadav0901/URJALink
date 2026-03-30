# <p align="center">URJALINK </p>

<p align="center">
  <img src="./urjalink_logo.png" alt="URJALINK Logo" width="250"/>
</p>

_An AI-driven sustainability platform that transforms rooftops into renewable power insights: revealing untapped solar potential, energy savings, and carbon reduction opportunities in seconds._

Built with satellite data, geospatial analytics, and computer vision, it empowers individuals, enterprises, and policymakers to understand their solar potential, financial savings, and environmental impact; with no middlemen or guesswork.

---

## Inspiration

We realized that while many people want to switch to clean energy, they often don’t know where to start. Reliable solar estimates usually involve weeks of outreach and technical evaluations, despite the fact that the necessary data already exists, just fragmented and inaccessible.

URJALINK was built to close this gap. Our goal: make sustainability _data-driven, transparent, and easy to act on._
If rooftops could speak, they’d tell us how much sunshine we’re wasting: URJALINK helps translate that into action.

---

## What It Does

URJALINK uses AI and satellite imagery to generate a full clean-energy report for any rooftop:

- **Solar Score:** AI-based performance rating for solar suitability.
- **Energy Forecasts:** Daily & annual generation estimates using NASA POWER irradiance and climate data.
- **System Insights:** Optimal panel layout, usable roof area, and system capacity.
- **Financial Outlook:** Installation cost, payback period, ROI, and lifetime savings.
- **Environmental Impact:** CO₂ reduction, carbon offset, and tree-equivalent savings.
- **Savings Mirror:** Upload your electricity bill to compare solar vs. utility costs with visual ROI timelines.
- **Energy Equity & Access Index:** A novel feature that quantifies disparities in solar adoption (0–100 score) using Census and zoning data to guide equitable policy recommendations.

The result is an **interactive, real-time dashboard** that transforms complex solar data into clear, actionable insights.

---

## How We Built It

- **Frontend:** React 18, TypeScript 5.8, Vite 5.4, modern, fast, and responsive.
- **Mapping:** Google Maps API for roof selection and coordinate capture.
- **Data Pipeline:** NASA POWER API for irradiance, temperature, and climate metrics.
- **AI Vision:** SegFormer-B0 (transformer-based model) fine-tuned for rooftop segmentation using PyTorch + OpenCV.
- **Insight Generation:** Google Gemini 2.5 Flash + Dedalus Labs SDK (Claude Sonnet 4) for dynamic analysis and localized incentive recommendations.

Together, these components form a unified pipeline: from map selection to data-rich, AI-generated reports, all in seconds.

---

## Installation

### Using `uv` (Recommended)

```bash
uv sync # Sets up the .venv and installs the deps
```

## Running the Application

```bash
uvicorn main:app --reload
```

## Configuration

Create a `.env` file (see `core/config.py`) and set at least:

- `GOOGLE_MAPS_API_KEY`, `DEDALUS_API_KEY`, `GEMINI_API_KEY`
- `EIA_API_KEY` (free key from https://www.eia.gov/opendata/; required for live financial metrics)

Without the EIA key the analysis endpoint returns `502 Economic data unavailable`.

## Testing

Most unit tests run without third-party dependencies. To exercise the FastAPI agent endpoints, install the API stack (`pip install -r requirements.txt`) and run:

```bash
RUN_AGENT_TESTS=1 pytest -vv tests/test_agents.py
```

Otherwise those slow streaming tests are skipped automatically so the suite finishes quickly.

## Core Analysis API

### Analyze Solar Potential

`POST /api/v1/analyze`

**Request body (excerpt):**

```json
{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "address": "123 Main St, San Francisco, CA",
    "state": "CA",
    "zip_code": "94102",
    "user_polygon": [
        [37.775, -122.419],
        [37.775, -122.4185],
        [37.7745, -122.4185]
    ]
}
```

- Supply `user_polygon` for highest-accuracy roof data; otherwise the service invokes CV detection/fallbacks.
- `state` (USPS code) is required for economic data lookups; `zip_code` further improves accuracy for future providers.

**Response highlights:**

- `roof_analysis`, `solar_data`, `solar_potential`, `solar_score`, `solar_score_breakdown`
- `financial_outlook`: derived via live `fetch_economic_inputs` lookups and `calculate_enhanced_financials`, containing system cost, savings, ROI, and payback metrics.

## Project Structure

See `AGENTS.md` for architecture guidelines and project organization.

---

## Agent API Documentation

### 1. Find Solar Installers

`POST /api/v1/agents/installers`

**Request:**

```json
{
    "analysis_id": "uuid",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "address": "123 Main St, San Francisco, CA",
    "system_size_kw": 8.5,
    "annual_generation_kwh": 12500,
    "state": "CA",
    "zip_code": "94102"
}
```

**Response:** Server-Sent Events (SSE) stream

```
data: token
data: by
data: token
```

---

### 2. Find Solar Incentives

`POST /api/v1/agents/incentives`

**Request:** Same as installers endpoint

**Response:** Server-Sent Events (SSE) stream

**Frontend Example:** Use same code as above, just change the URL

---

### 3. Generate Narrative Summary

`POST /api/v1/summary`

Use this endpoint once you have the structured metrics (location, solar potential, and financial outlook) and need a Gemini-generated, human-readable explanation for the UI.
The backend calls Google Gemini model `gemini-2.5-flash-latest`.

**Request:**

```json
{
    "analysis_id": "uuid",
    "location": {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "address": "123 Main St, San Francisco, CA"
    },
    "solar_potential": {
        "system_size_kw": 7.5,
        "annual_generation_kwh": 11000,
        "daily_generation_kwh": 30.1,
        "capacity_factor": 0.18,
        "energy_offset_percent": 95,
        "co2_offset_tons_yearly": 7.2,
        "co2_offset_tons_25year": 180,
        "equivalent_trees_planted": 8
    },
    "financial_outlook": {
        "system_cost_net": 18500,
        "total_net_savings_25_years": 42000,
        "net_profit_25_years": 23500,
        "payback_period_years": 7.5,
        "roi_25_years": 127.5,
        "first_year_savings_gross": 2650,
        "first_year_savings_net": 2450
    },
    "additional_context": "Optional helper text to steer tone."
}
```

**Response (`200 OK`):**

```json
{
    "analysis_id": "uuid",
    "generated_at": "2024-01-01T12:00:00Z",
    "summary_markdown": "## Overview\\nYour roof...",
    "model_name": "gemini-2.5-flash"
}
```

**Frontend Example (fetch):**

```ts
const response = await fetch("/api/v1/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload), // matches request structure above
});
const summary = await response.json();
renderMarkdown(summary.summary_markdown);
```

