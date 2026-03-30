"""Manual integration test to inspect raw agent streaming output."""
import asyncio
import os

import pytest

try:
    from business_logic.installer_finder_agent import find_solar_installers_stream
except ModuleNotFoundError as exc:
    pytest.skip(f"Installer agent dependencies missing: {exc}", allow_module_level=True)

RUN_STREAM_TESTS = os.getenv("RUN_STREAM_TESTS") == "1"


@pytest.mark.skipif(not RUN_STREAM_TESTS, reason="Requires live agent streaming dependencies.")
@pytest.mark.asyncio
async def test_raw_stream():
    """Test what the agent actually yields"""
    print("=" * 60)
    print("Testing Raw Stream Output")
    print("=" * 60)
    
    chunk_num = 0
    total_content = ""
    
    async for chunk in find_solar_installers_stream(
        latitude=37.7749,
        longitude=-122.4194,
        address="San Francisco, CA",
        system_size_kw=10.0
    ):
        chunk_num += 1
        print(f"\n--- Chunk {chunk_num} ---")
        print(f"Type: {type(chunk)}")
        print(f"Length: {len(chunk) if chunk else 0}")
        print(f"Content: {repr(chunk[:100] if len(chunk) > 100 else chunk)}")
        total_content += chunk
    
    print("\n" + "=" * 60)
    print(f"Total chunks: {chunk_num}")
    print(f"Total length: {len(total_content)}")
    print("\n--- Full Content ---")
    print(total_content)
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_raw_stream())
