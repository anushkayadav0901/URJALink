"""
Manual test script for streaming endpoints
Run this to test if the streaming endpoints are working correctly
"""
import asyncio

import httpx
import pytest


@pytest.mark.asyncio
async def test_installer_stream():
    """Test the installer streaming endpoint"""
    print("=" * 60)
    print("Testing Installer Stream Endpoint")
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
        "zip_code": "94102"
    }
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream('POST', url, json=data) as response:
                print(f"Status Code: {response.status_code}")
                print(f"Headers: {dict(response.headers)}")
                print("\nStreaming Response:")
                print("-" * 60)
                
                chunk_count = 0
                async for chunk in response.aiter_text():
                    if chunk:
                        chunk_count += 1
                        print(chunk, end='', flush=True)
                
                print("\n" + "-" * 60)
                print(f"Total chunks received: {chunk_count}")
                
                if chunk_count == 0:
                    print("⚠️ WARNING: No data received in stream!")
                else:
                    print("✅ Stream received data successfully")
                    
        except Exception as e:
            print(f"❌ Error: {e}")


@pytest.mark.asyncio
async def test_incentive_stream():
    """Test the incentive streaming endpoint"""
    print("\n\n" + "=" * 60)
    print("Testing Incentive Stream Endpoint")
    print("=" * 60)
    
    url = "http://localhost:8000/api/v1/agents/incentives"
    data = {
        "analysis_id": "test-123",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "address": "San Francisco, CA",
        "system_size_kw": 10.0,
        "annual_generation_kwh": 14000,
        "state": "CA",
        "zip_code": "94102"
    }
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream('POST', url, json=data) as response:
                print(f"Status Code: {response.status_code}")
                print(f"Headers: {dict(response.headers)}")
                print("\nStreaming Response:")
                print("-" * 60)
                
                chunk_count = 0
                async for chunk in response.aiter_text():
                    if chunk:
                        chunk_count += 1
                        print(chunk, end='', flush=True)
                
                print("\n" + "-" * 60)
                print(f"Total chunks received: {chunk_count}")
                
                if chunk_count == 0:
                    print("⚠️ WARNING: No data received in stream!")
                else:
                    print("✅ Stream received data successfully")
                    
        except Exception as e:
            print(f"❌ Error: {e}")


async def main():
    """Run both tests"""
    print("\n🚀 Starting Streaming API Tests")
    print("Make sure the server is running on http://localhost:8000\n")
    
    await test_installer_stream()
    await test_incentive_stream()
    
    print("\n\n" + "=" * 60)
    print("Tests Complete")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
