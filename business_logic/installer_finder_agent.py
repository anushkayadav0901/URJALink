"""
Installer Finder Agent - Uses Dedalus SDK to find local solar installers
"""
from typing import Dict
from dedalus_labs import AsyncDedalus, DedalusRunner
from core.config import settings


async def find_solar_installers(
    latitude: float,
    longitude: float,
    address: str,
    system_size_kw: float
) -> Dict[str, str]:
    """
    Find local solar installers using Dedalus agent
    
    Args:
        latitude: Location latitude
        longitude: Location longitude
        address: Full address string
        system_size_kw: System size to help with installer recommendations
        
    Returns:
        Dict with installers markdown and model name
    """
    if not settings.DEDALUS_API_KEY:
        raise ValueError("DEDALUS_API_KEY is not configured")
    
    try:
        client = AsyncDedalus(api_key=settings.DEDALUS_API_KEY)
        runner = DedalusRunner(client)
        
        prompt = f"""Find certified solar installers near:
Address: {address}
Coordinates: {latitude}, {longitude}
System Size: {system_size_kw} kW

CRITICAL INSTRUCTIONS - YOU MUST FOLLOW EXACTLY:

Generate ONLY a markdown table with these EXACT columns:
| Company Name | Contact Info + Website | Reviews | Address | Specializations + Certifications |

Find {settings.MAX_INSTALLERS_RETURNED} installers within {settings.INSTALLER_SEARCH_RADIUS_MILES} miles

TABLE REQUIREMENTS (MANDATORY):
- ONLY return the table - NO introduction, NO conclusion, NO recommendation text
- Start IMMEDIATELY with the table header: | Company Name | Contact Info + Website | Reviews | Address | Specializations + Certifications |
- Use proper markdown table format with pipes (|)
- Include separator row: |--------|--------|--------|--------|--------|
- Contact Info MUST include phone number and website as markdown link: [website](url)
- Reviews MUST include rating (e.g., "4.5/5 stars") or "Not available"
- Specializations MUST list residential/commercial and certifications (NABCEP, etc.)
- If information is missing for any cell, write "Not available"
- Each installer = one table row
- Focus on reputable, certified installers with good reviews
- End immediately after last table row - NO text after the table

STRICT: Your entire response must be ONLY the markdown table. Nothing before, nothing after."""

        # Run without streaming to get complete response
        result = runner.run(
            input=prompt,
            model=settings.DEDALUS_MODEL,
            mcp_servers=[
                "tsion/brave-search-mcp",
                "windsor/exa-search-mcp",
                "aakakak/sonar"
                #"joerup/exa-mcp"
            ],
            stream=False
        )
        
        # Await the result if it's a coroutine
        if hasattr(result, '__await__'):
            result = await result
        
        # Extract the complete response
        response_text = ""
        if isinstance(result, str):
            response_text = result
        elif hasattr(result, 'content'):
            response_text = result.content
        elif hasattr(result, 'choices') and result.choices:
            response_text = result.choices[0].message.content
        elif hasattr(result, 'text'):
            response_text = result.text
        else:
            response_text = str(result)
        
        if not response_text or len(response_text.strip()) < 50:
            raise RuntimeError(f"Dedalus returned invalid response: {response_text}")
        
        return {
            "installers_markdown": response_text.strip(),
            "model_name": settings.DEDALUS_MODEL,
        }
        
    except Exception as e:
        raise RuntimeError(f"Installer search failed: {str(e)}") from e
