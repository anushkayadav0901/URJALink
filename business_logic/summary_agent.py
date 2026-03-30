"""
Gemini-powered narrative summary generator for solar analyses.
"""

from __future__ import annotations

import json
from typing import Dict, Optional

import httpx

from core.config import settings
from models.requests import SummaryRequest

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/"
    f"v1beta/models/{GEMINI_MODEL}:generateContent"
)


def _build_prompt(payload: SummaryRequest) -> str:
    """Create a crisp prompt for Gemini to generate a direct summary."""
    metrics: Dict[str, Dict] = {
        "location": payload.location.model_dump(),
        "solar_potential": payload.solar_potential.model_dump(),
        "financial_outlook": payload.financial_outlook.model_dump(),
    }

    if payload.additional_context:
        metrics["additional_context"] = payload.additional_context

    metrics_blob = json.dumps(metrics, indent=2)

    return (
        "Generate a solar analysis summary from the metrics below. Output ONLY the summary content.\n"
        "No greetings, no closings, no introductory phrases. Start directly with the content.\n\n"
        "Structure:\n"
        "- Two-sentence overview of projected production and fit\n"
        "- Section: 'Environmental Impact' (CO₂ offsets and tree equivalents)\n"
        "- Section: 'Financial Outlook' (system cost, payback period, ROI, lifetime savings)\n"
        "- Section: 'What To Do Next' (2-3 actionable bullet points)\n\n"
        "Use Markdown for headings and bullets. Tone: optimistic but objective. "
        "Only use numbers from the provided metrics.\n\n"
        f"Metrics:\n{metrics_blob}\n"
    )


async def generate_metrics_summary(
    payload: SummaryRequest, *, http_client: Optional[httpx.AsyncClient] = None
) -> Dict[str, str]:
    """
    Call Gemini to translate solar metrics into a narrative summary.

    Args:
        payload: Validated summary request containing structured metrics.
        http_client: Optional injected HTTP client (used for testing).

    Returns:
        Dict with Markdown summary text and model metadata.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured.")

    prompt = _build_prompt(payload)
    request_body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ]
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
    summary_text = "".join(text_chunks).strip()

    if not summary_text:
        raise RuntimeError("Gemini response did not include any text.")

    model_name = candidates[0].get("model") or data.get("model", GEMINI_MODEL)

    return {
        "summary_markdown": summary_text,
        "model_name": model_name or GEMINI_MODEL,
    }
