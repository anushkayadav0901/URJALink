"""Manual integration test for the HTTP streaming endpoint."""

import asyncio
import os

import httpx
import pytest

RUN_STREAM_TESTS = os.getenv("RUN_STREAM_TESTS") == "1"


@pytest.mark.skipif(
    not RUN_STREAM_TESTS, reason="Requires running API server at localhost:8000"
)
@pytest.mark.asyncio
async def test_http_stream():
    """Test the actual HTTP streaming endpoint"""
    print("=" * 60)
    print("Testing HTTP Stream (What Frontend Sees)")
    print("=" * 60)

    url = "http://localhost:8000/api/v1/agents/installers"
    data = {
        "analysis_id": "test-123",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "address": "San Francisco, CA",
        "system_size_kw": 10.0,
        "annual_generation_kwh": 14000,
        "state": "CA",
        "zip_code": "94102",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            print(f"\nCalling: {url}")
            print(f"With data: {data}\n")

            async with client.stream("POST", url, json=data) as response:
                print(f"Status: {response.status_code}")
                print(f"Headers: {dict(response.headers)}")
                print("\n--- Raw Stream Output ---")

                chunk_count = 0
                total_bytes = 0

                async for chunk in response.aiter_bytes():
                    chunk_count += 1
                    total_bytes += len(chunk)
                    decoded = chunk.decode("utf-8", errors="replace")
                    print(decoded, end="", flush=True)

                print(f"\n\n--- Summary ---")
                print(f"Total chunks: {chunk_count}")
                print(f"Total bytes: {total_bytes}")

        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_http_stream())
