"""Tests for bill comparison API endpoint."""

from __future__ import annotations

import importlib.util
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

if importlib.util.find_spec("pydantic_settings") is None:
    pytest.skip("pydantic_settings is required for API tests.", allow_module_level=True)

from main import app


def create_sample_pdf(text_content: str) -> bytes:
    """Create a simple PDF with text content for testing."""
    # Create a minimal valid PDF with text
    minimal_pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 << /Type /Font "
        b"/Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n"
        b"4 0 obj\n<< /Length 100 >>\nstream\n"
        b"BT\n/F1 12 Tf\n100 700 Td\n("
        + text_content.encode("latin-1", errors="ignore")
        + b") Tj\nET\n"
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


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def sample_pdf():
    """Create sample PDF for testing."""
    return create_sample_pdf("Electricity Bill\nTotal Amount Due: $150.50")


@pytest.mark.asyncio
async def test_bill_comparison_endpoint_success(client, sample_pdf, monkeypatch):
    """Bill comparison endpoint returns correct response."""
    monkeypatch.setattr(
        "business_logic.bill_extractor.settings.GEMINI_API_KEY", "test-key"
    )

    def mock_extract_monthly_bill(bill_text: str, **kwargs):
        return 150.50

    with patch(
        "api.routes.extract_monthly_bill", side_effect=mock_extract_monthly_bill
    ):
        response = client.post(
            "/api/v1/bill-comparison",
            files={"file": ("bill.pdf", sample_pdf, "application/pdf")},
            data={
                "first_year_savings_net": "3504.0",
                "payback_period_years": "23.0",
                "monthly_savings": "292.0",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["current_monthly_bill"] == 150.50
    # Minimum bill is 46.8% of current bill
    minimum_bill = 150.50 * 0.468
    # Savings (292.0) exceed reducible portion, so new bill equals minimum
    assert data["new_monthly_bill"] == pytest.approx(minimum_bill, abs=0.1)


def test_bill_comparison_endpoint_invalid_file_type(client):
    """Bill comparison endpoint rejects non-PDF files."""
    response = client.post(
        "/api/v1/bill-comparison",
        files={"file": ("bill.txt", b"not a pdf", "text/plain")},
        data={
            "first_year_savings_net": "3504.0",
            "payback_period_years": "23.0",
            "monthly_savings": "292.0",
        },
    )

    assert response.status_code == 400
    assert "PDF" in response.json()["detail"]


def test_bill_comparison_endpoint_empty_file(client):
    """Bill comparison endpoint rejects empty files."""
    response = client.post(
        "/api/v1/bill-comparison",
        files={"file": ("bill.pdf", b"", "application/pdf")},
        data={
            "first_year_savings_net": "3504.0",
            "payback_period_years": "23.0",
            "monthly_savings": "292.0",
        },
    )

    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_bill_comparison_endpoint_missing_fields(client, sample_pdf):
    """Bill comparison endpoint requires all form fields."""
    response = client.post(
        "/api/v1/bill-comparison",
        files={"file": ("bill.pdf", sample_pdf, "application/pdf")},
        data={
            "first_year_savings_net": "3504.0"
            # Missing payback_period_years and monthly_savings
        },
    )

    assert response.status_code == 422


def test_bill_comparison_endpoint_invalid_negative_values(
    client, sample_pdf, monkeypatch
):
    """Bill comparison endpoint rejects negative values."""
    monkeypatch.setattr(
        "business_logic.bill_extractor.settings.GEMINI_API_KEY", "test-key"
    )

    def mock_extract_monthly_bill(bill_text: str, **kwargs):
        return 150.50

    with patch(
        "api.routes.extract_monthly_bill", side_effect=mock_extract_monthly_bill
    ):
        response = client.post(
            "/api/v1/bill-comparison",
            files={"file": ("bill.pdf", sample_pdf, "application/pdf")},
            data={
                "first_year_savings_net": "-100.0",  # Negative value
                "payback_period_years": "23.0",
                "monthly_savings": "292.0",
            },
        )

    assert response.status_code == 422


def test_bill_comparison_endpoint_pdf_parse_error(client, monkeypatch):
    """Bill comparison endpoint handles PDF parsing errors."""
    invalid_pdf = b"not a valid pdf"

    response = client.post(
        "/api/v1/bill-comparison",
        files={"file": ("bill.pdf", invalid_pdf, "application/pdf")},
        data={
            "first_year_savings_net": "3504.0",
            "payback_period_years": "23.0",
            "monthly_savings": "292.0",
        },
    )

    assert response.status_code == 400
    assert "parse" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_bill_comparison_endpoint_bill_extraction_error(
    client, sample_pdf, monkeypatch
):
    """Bill comparison endpoint handles bill extraction errors."""
    monkeypatch.setattr(
        "business_logic.bill_extractor.settings.GEMINI_API_KEY", "test-key"
    )

    from business_logic.bill_extractor import BillExtractionError

    def mock_extract_monthly_bill(bill_text: str, **kwargs):
        raise BillExtractionError("Could not extract bill amount")

    with patch(
        "api.routes.extract_monthly_bill", side_effect=mock_extract_monthly_bill
    ):
        response = client.post(
            "/api/v1/bill-comparison",
            files={"file": ("bill.pdf", sample_pdf, "application/pdf")},
            data={
                "first_year_savings_net": "3504.0",
                "payback_period_years": "23.0",
                "monthly_savings": "292.0",
            },
        )

    assert response.status_code == 502
    assert "extract" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_bill_comparison_endpoint_zero_bill_amount(
    client, sample_pdf, monkeypatch
):
    """Bill comparison endpoint rejects zero bill amount."""
    monkeypatch.setattr(
        "business_logic.bill_extractor.settings.GEMINI_API_KEY", "test-key"
    )

    def mock_extract_monthly_bill(bill_text: str, **kwargs):
        return 0.0

    with patch(
        "api.routes.extract_monthly_bill", side_effect=mock_extract_monthly_bill
    ):
        response = client.post(
            "/api/v1/bill-comparison",
            files={"file": ("bill.pdf", sample_pdf, "application/pdf")},
            data={
                "first_year_savings_net": "3504.0",
                "payback_period_years": "23.0",
                "monthly_savings": "292.0",
            },
        )

    assert response.status_code == 400
    assert "valid" in response.json()["detail"].lower()
