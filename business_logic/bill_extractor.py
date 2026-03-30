"""Gemini-powered monthly bill amount extraction from electricity bill text."""
from __future__ import annotations

import re
from typing import Optional

import httpx

from core.config import settings

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/"
    f"v1beta/models/{GEMINI_MODEL}:generateContent"
)


class BillExtractionError(RuntimeError):
    """Raised when bill amount cannot be extracted."""


async def extract_monthly_bill(
    bill_text: str,
    *,
    http_client: Optional[httpx.AsyncClient] = None
) -> float:
    """
    Extract monthly bill amount from electricity bill text using Gemini.
    
    Args:
        bill_text: Raw extracted text from electricity bill PDF
        http_client: Optional injected HTTP client (used for testing)
        
    Returns:
        Monthly bill amount as float (USD)
        
    Raises:
        ValueError: If GEMINI_API_KEY is not configured
        BillExtractionError: If bill amount cannot be extracted
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured.")
    
    prompt = (
        "Extract the total monthly bill amount in USD from this electricity bill. "
        "Return ONLY the number (e.g., 150.50). If not found, return 0.\n\n"
        f"Bill text:\n{bill_text[:2000]}\n\n"
        "Amount:"
    )
    
    request_body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "topP": 0.8,
            "topK": 40,
        }
    }
    
    close_client = False
    client = http_client
    if client is None:
        client = httpx.AsyncClient(timeout=30.0)
        close_client = True
    
    try:
        response = await client.post(
            GEMINI_ENDPOINT,
            params={"key": api_key},
            json=request_body,
            timeout=30.0
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as http_err:
        raise BillExtractionError(
            f"Gemini API call failed: {http_err.response.status_code} "
            f"- {http_err.response.text}"
        ) from http_err
    except httpx.HTTPError as http_err:
        raise BillExtractionError(f"Gemini API request error: {http_err}") from http_err
    finally:
        if close_client:
            await client.aclose()
    
    data = response.json()
    candidates = data.get("candidates") or []
    if not candidates:
        raise BillExtractionError("Gemini API returned no candidates.")
    
    parts = candidates[0].get("content", {}).get("parts") or []
    text_chunks = [part.get("text", "") for part in parts if part.get("text")]
    response_text = "".join(text_chunks).strip()
    
    if not response_text:
        raise BillExtractionError("Gemini response did not include any text.")
    
    # Extract number from response (handle various formats)
    numbers = re.findall(r'\d+\.?\d*', response_text)
    if not numbers:
        raise BillExtractionError(f"Could not extract number from response: {response_text}")
    
    try:
        amount = float(numbers[0])
        if amount <= 0:
            raise BillExtractionError(f"Invalid bill amount extracted: {amount}")
        return round(amount, 2)
    except ValueError as exc:
        raise BillExtractionError(
            f"Could not parse number from response: {response_text}"
        ) from exc

