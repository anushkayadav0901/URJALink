"""PDF text extraction utility."""
from __future__ import annotations

from io import BytesIO
from typing import Optional

from pypdf import PdfReader


class PDFParseError(Exception):
    """Raised when PDF parsing fails."""


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract raw text from PDF bytes.
    
    Args:
        pdf_bytes: Raw PDF file bytes
        
    Returns:
        Extracted text content as string
        
    Raises:
        PDFParseError: If PDF cannot be parsed or is invalid
    """
    try:
        pdf_file = BytesIO(pdf_bytes)
        reader = PdfReader(pdf_file)
        
        if len(reader.pages) == 0:
            raise PDFParseError("PDF contains no pages")
        
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        
        if not text_parts:
            raise PDFParseError("No text content found in PDF")
        
        return "\n".join(text_parts)
    
    except Exception as exc:
        raise PDFParseError(f"Failed to parse PDF: {str(exc)}") from exc

