"""
Gemini-powered electricity bill savings calculator.
Analyzes user's electricity bill against solar potential to calculate realistic savings.
"""

from __future__ import annotations

import json
from typing import Dict, Optional

import httpx

from core.config import settings

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/"
    f"v1beta/models/{GEMINI_MODEL}:generateContent"
)


def _build_prompt(bill_text: str, solar_metrics: Dict, location_data: Dict) -> str:
    """
    Create a focused prompt for Gemini to calculate electricity savings.

    Args:
        bill_text: Raw extracted text from user's electricity bill PDF.
        solar_metrics: Solar production and financial data.
        location_data: Address and location information.

    Returns:
        Structured prompt for the LLM.
    """
    solar_blob = json.dumps(solar_metrics, indent=2)
    location_blob = json.dumps(location_data, indent=2)

    return (
        "Analyze the electricity bill and solar potential below. Calculate savings ONLY using data provided.\n"
        "Do NOT make assumptions or hallucinate numbers. If data is missing, state that explicitly.\n\n"
        "Output Structure (use ONLY provided numbers):\n"
        "1. Current Electricity Costs:\n"
        "   - Monthly average: $X\n"
        "   - Annual total: $Y\n"
        "   - Rate per kWh: $Z (extract from bill)\n\n"
        "2. Solar Production vs Consumption:\n"
        "   - Current monthly usage: X kWh (from bill)\n"
        "   - Projected solar production: Y kWh (from solar metrics)\n"
        "   - Coverage percentage: Z%\n\n"
        "3. Short-Term Savings (Year 1-5):\n"
        "   - Monthly savings: $X\n"
        "   - Annual savings: $Y\n"
        "   - 5-year total savings: $Z\n\n"
        "4. Long-Term Savings (System Lifetime):\n"
        "   - Total system cost: $X (from solar metrics)\n"
        "   - Break-even year: Year Y\n"
        "   - 25-year net savings: $Z\n\n"
        "5. Key Assumptions:\n"
        "   - List any assumptions made (e.g., rate escalation, degradation)\n"
        "   - Flag any missing data that affects accuracy\n\n"
        "Use Markdown formatting. Be precise and data-driven. No fluff.\n\n"
        f"Electricity Bill:\n{bill_text}\n\n"
        f"Solar Metrics:\n{solar_blob}\n\n"
        f"Location Data:\n{location_blob}\n"
    )


async def calculate_electricity_savings(
    bill_text: str,
    solar_metrics: Dict,
    location_data: Dict,
    *,
    http_client: Optional[httpx.AsyncClient] = None,
) -> Dict[str, str]:
    """
    Call Gemini to calculate realistic electricity savings based on bill and solar data.

    Args:
        bill_text: Extracted text from user's electricity bill PDF.
        solar_metrics: Dictionary containing solar production and financial projections.
        location_data: Dictionary with address and location details.
        http_client: Optional injected HTTP client (used for testing).

    Returns:
        Dict with calculated savings analysis and model metadata.

    Raises:
        ValueError: If GEMINI_API_KEY is not configured.
        RuntimeError: If Gemini API call fails or returns invalid data.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured.")

    prompt = _build_prompt(bill_text, solar_metrics, location_data)
    request_body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,  # Lower temperature for more deterministic calculations
            "topP": 0.8,
            "topK": 40,
        },
    }

    close_client = False
    client = http_client
    if client is None:
        client = httpx.AsyncClient(timeout=30.0)
        close_client = True

    try:
        response = await client.post(
            GEMINI_ENDPOINT, params={"key": api_key}, json=request_body, timeout=30.0
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as http_err:
        raise RuntimeError(
            f"Gemini API call failed: {http_err.response.status_code} "
            f"- {http_err.response.text}"
        ) from http_err
    except httpx.HTTPError as http_err:
        raise RuntimeError(f"Gemini API request error: {http_err}") from http_err
    finally:
        if close_client:
            await client.aclose()

    data = response.json()
    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini API returned no candidates.")

    parts = candidates[0].get("content", {}).get("parts") or []
    text_chunks = [part.get("text", "") for part in parts if part.get("text")]
    savings_analysis = "".join(text_chunks).strip()

    if not savings_analysis:
        raise RuntimeError("Gemini response did not include any text.")

    model_name = candidates[0].get("model") or data.get("model", GEMINI_MODEL)

    return {
        "savings_analysis": savings_analysis,
        "model_name": model_name or GEMINI_MODEL,
    }
