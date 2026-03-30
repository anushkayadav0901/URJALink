"""Tests for bill comparison functionality."""
from __future__ import annotations

import importlib.util
from unittest.mock import AsyncMock

import httpx
import pytest

if importlib.util.find_spec("pydantic_settings") is None:
    pytest.skip("pydantic_settings is required for bill comparison tests.", allow_module_level=True)

from business_logic.bill_comparison import calculate_bill_comparison
from business_logic.bill_extractor import extract_monthly_bill, BillExtractionError
from business_logic.pdf_parser import extract_text_from_pdf, PDFParseError
from core.config import settings


def create_sample_pdf(text_content: str) -> bytes:
    """Create a simple PDF with text content for testing."""
    # Create a minimal valid PDF structure with text
    minimal_pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 << /Type /Font "
        b"/Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n"
        b"4 0 obj\n<< /Length 100 >>\nstream\n"
        b"BT\n/F1 12 Tf\n100 700 Td\n(" + text_content.encode('latin-1', errors='ignore') + b") Tj\nET\n"
        b"endstream\nendobj\n"
        b"xref\n0 5\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"0000000300 00000 n \n"
        b"trailer\n<< /Size 5 /Root 1 0 R >>\n"
        b"startxref\n400\n%%EOF"
    )
    return minimal_pdf


@pytest.mark.asyncio
async def test_extract_text_from_pdf_success():
    """PDF parser extracts text correctly."""
    test_text = "Electricity Bill\nTotal Amount Due: $150.50"
    pdf_bytes = create_sample_pdf(test_text)
    
    result = extract_text_from_pdf(pdf_bytes)
    
    assert "Electricity Bill" in result
    assert "150.50" in result


@pytest.mark.asyncio
async def test_extract_text_from_pdf_empty():
    """PDF parser raises error for empty PDF."""
    pdf_bytes = b""
    
    with pytest.raises(PDFParseError):
        extract_text_from_pdf(pdf_bytes)


@pytest.mark.asyncio
async def test_extract_text_from_pdf_invalid():
    """PDF parser raises error for invalid PDF."""
    pdf_bytes = b"not a pdf"
    
    with pytest.raises(PDFParseError):
        extract_text_from_pdf(pdf_bytes)


@pytest.mark.asyncio
async def test_extract_monthly_bill_success(monkeypatch):
    """Gemini extracts monthly bill amount correctly."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    
    bill_text = "Electricity Bill\nTotal Amount Due: $150.50"
    
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            status_code=200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": "150.50"}]
                        }
                    }
                ]
            }
        )
    
    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        result = await extract_monthly_bill(bill_text, http_client=client)
    
    assert result == 150.50


@pytest.mark.asyncio
async def test_extract_monthly_bill_with_text(monkeypatch):
    """Gemini extracts number even when response has extra text."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    
    bill_text = "Electricity Bill\nTotal: $200.75"
    
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            status_code=200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": "The bill amount is 200.75 dollars"}]
                        }
                    }
                ]
            }
        )
    
    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        result = await extract_monthly_bill(bill_text, http_client=client)
    
    assert result == 200.75


@pytest.mark.asyncio
async def test_extract_monthly_bill_missing_key(monkeypatch):
    """Missing API key raises ValueError."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    
    with pytest.raises(ValueError):
        await extract_monthly_bill("test bill text")


@pytest.mark.asyncio
async def test_extract_monthly_bill_empty_response(monkeypatch):
    """Empty Gemini response raises BillExtractionError."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            status_code=200,
            json={"candidates": []}
        )
    
    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(BillExtractionError):
            await extract_monthly_bill("test", http_client=client)


@pytest.mark.asyncio
async def test_extract_monthly_bill_no_number(monkeypatch):
    """Response without number raises BillExtractionError."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            status_code=200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": "No amount found"}]
                        }
                    }
                ]
            }
        )
    
    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(BillExtractionError):
            await extract_monthly_bill("test", http_client=client)


def test_calculate_bill_comparison():
    """Bill comparison calculates correctly."""
    result = calculate_bill_comparison(
        monthly_bill=200.0,
        monthly_savings=50.0,
        payback_period_years=10.5
    )
    
    assert result["current_monthly_bill"] == 200.0
    # New bill = 200 - 50 = 150, but minimum is 200 * 0.468 = 93.6, so bill = 150
    assert result["new_monthly_bill"] == 150.0


def test_calculate_bill_comparison_zero_savings():
    """Bill comparison handles zero savings."""
    result = calculate_bill_comparison(
        monthly_bill=200.0,
        monthly_savings=0.0,
        payback_period_years=25.0
    )
    
    assert result["current_monthly_bill"] == 200.0
    assert result["new_monthly_bill"] == 200.0


def test_calculate_bill_comparison_rounding():
    """Bill comparison rounds values correctly."""
    result = calculate_bill_comparison(
        monthly_bill=199.999,
        monthly_savings=49.999,
        payback_period_years=10.99
    )
    
    assert result["current_monthly_bill"] == 200.0
    assert result["new_monthly_bill"] == 150.0


def test_calculate_bill_comparison_excess_generation():
    """Bill comparison handles excess generation (savings exceed reducible portion)."""
    result = calculate_bill_comparison(
        monthly_bill=52.04,
        monthly_savings=279.0,
        payback_period_years=24.0
    )
    
    assert result["current_monthly_bill"] == 52.04
    # Minimum bill is 46.8% of current bill (accounts for fixed charges)
    minimum_bill = 52.04 * 0.468
    assert result["new_monthly_bill"] == pytest.approx(minimum_bill, abs=0.1)

