"""
Incentive Agent - Uses Dedalus SDK to find solar incentives and rebates
"""

from typing import Dict
from dedalus_labs import AsyncDedalus, DedalusRunner
from core.config import settings


async def find_solar_incentives(
    latitude: float,
    longitude: float,
    address: str,
    system_size_kw: float,
    annual_generation_kwh: int,
    state: str = None,
    zip_code: str = None,
) -> Dict[str, str]:
    """
    Find solar incentives and rebates using Dedalus agent

    Args:
        latitude: Location latitude
        longitude: Location longitude
        address: Full address string
        system_size_kw: System size for calculating incentive values
        annual_generation_kwh: Annual generation for calculating incentive values
        state: State code (optional)
        zip_code: ZIP code (optional)

    Returns:
        Dict with incentives markdown and model name
    """
    if not settings.DEDALUS_API_KEY:
        raise ValueError("DEDALUS_API_KEY is not configured")

    try:
        client = AsyncDedalus(api_key=settings.DEDALUS_API_KEY)
        runner = DedalusRunner(client)

        # Build location context
        location_parts = [
            f"Address: {address}",
            f"Coordinates: {latitude}, {longitude}",
        ]
        if state:
            location_parts.append(f"State: {state}")
        if zip_code:
            location_parts.append(f"ZIP: {zip_code}")
        location_info = "\n".join(location_parts)

        prompt = f"""Find solar incentives, rebates, and tax credits for:

{location_info}

System Details:
- Size: {system_size_kw} kW
- Annual Generation: {annual_generation_kwh} kWh

CRITICAL INSTRUCTIONS - YOU MUST FOLLOW EXACTLY:

Generate ONLY a markdown table with these EXACT columns:
| Incentive Name | Type | Estimated Value | Eligibility & Requirements |

Include these incentive categories:
- Federal (Investment Tax Credit, etc.)
- State rebates and programs
- Local/municipal programs
- Utility programs (net metering, SREC, performance payments)

TABLE REQUIREMENTS (MANDATORY):
- ONLY return the table - NO introduction, NO summary, NO conclusion text
- Start IMMEDIATELY with the table header: | Incentive Name | Type | Estimated Value | Eligibility & Requirements |
- Use proper markdown table format with pipes (|)
- Include separator row: |--------|--------|--------|--------|
- Type column MUST be one of: Federal, State, Local, or Utility
- Estimated Value MUST include dollar amounts or percentages (e.g., "$7,650" or "30% of cost")
- If information is missing for any cell, write "Not available"
- Each incentive = one table row
- End immediately after last table row - NO text after the table

STRICT: Your entire response must be ONLY the markdown table. Nothing before, nothing after."""

        # Run without streaming to get complete response
        result = runner.run(
            input=prompt,
            model=settings.DEDALUS_MODEL,
            mcp_servers=[
                "tsion/brave-search-mcp",
                "windsor/exa-search-mcp",
                "aakakak/sonar",
            ],
            stream=False,
        )

        # Await the result if it's a coroutine
        if hasattr(result, "__await__"):
            result = await result

        # Extract the complete response
        response_text = ""
        if isinstance(result, str):
            response_text = result
        elif hasattr(result, "content"):
            response_text = result.content
        elif hasattr(result, "choices") and result.choices:
            response_text = result.choices[0].message.content
        elif hasattr(result, "text"):
            response_text = result.text
        else:
            response_text = str(result)

        if not response_text or len(response_text.strip()) < 50:
            raise RuntimeError(f"Dedalus returned invalid response: {response_text}")

        return {
            "incentives_markdown": response_text.strip(),
            "model_name": settings.DEDALUS_MODEL,
        }

    except Exception as e:
        raise RuntimeError(f"Incentive search failed: {str(e)}") from e
