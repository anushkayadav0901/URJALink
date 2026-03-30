"""Numeric helpers to keep rounding deterministic across modules."""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP


def quantize(value: float, digits: int = 2) -> float:
    """Round using bankers-safe decimal quantization to avoid float drift."""
    if digits < 0:
        raise ValueError("digits must be non-negative")
    exponent = Decimal("1").scaleb(-digits)
    quantized = Decimal(str(value)).quantize(exponent, rounding=ROUND_HALF_UP)
    return float(quantized)
