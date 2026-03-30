"""
Agent Orchestrator - Coordinates multiple agents running in parallel
"""

import asyncio
import uuid
from datetime import datetime

from models.requests import AgentsRequest
from models.responses import AgentsResponse
from business_logic.installer_finder_agent import find_solar_installers
from business_logic.incentive_agent import find_solar_incentives


async def run_agents(request: AgentsRequest) -> AgentsResponse:
    """
    Orchestrate both agents to run in parallel

    Args:
        request: AgentsRequest with location and system details

    Returns:
        AgentsResponse with results from both agents
    """
    agents_id = str(uuid.uuid4())
    timestamp = datetime.now(datetime.UTC)
    errors = []

    # Run both agents in parallel using asyncio.gather
    # Use return_exceptions=True to handle partial failures
    results = await asyncio.gather(
        _run_installer_finder(request),
        _run_incentive_agent(request),
        return_exceptions=True,
    )

    installer_result, incentive_result = results

    # Handle installer finder result
    if isinstance(installer_result, Exception):
        errors.append(f"Installer Finder Agent: {str(installer_result)}")
        installer_response = "No installer information available due to agent failure."
    else:
        installer_response = installer_result

    # Handle incentive agent result
    if isinstance(incentive_result, Exception):
        errors.append(f"Incentive Agent: {str(incentive_result)}")
        incentive_response = "No incentive information available due to agent failure."
    else:
        incentive_response = incentive_result

    # Determine overall status
    if len(errors) == 2:
        status = "failed"
    elif errors:
        status = "partial"
    else:
        status = "success"

    return AgentsResponse(
        agents_id=agents_id,
        timestamp=timestamp,
        analysis_id=request.analysis_id,
        installer_results=installer_response,
        incentive_results=incentive_response,
        status=status,
        errors=errors if errors else None,
    )


async def _run_installer_finder(request: AgentsRequest) -> str:
    """
    Run installer finder agent with error handling

    Args:
        request: AgentsRequest

    Returns:
        Agent response text

    Raises:
        Exception: If agent fails
    """
    try:
        return await find_solar_installers(
            latitude=request.latitude,
            longitude=request.longitude,
            address=request.address,
            system_size_kw=request.system_size_kw,
        )
    except Exception as e:
        raise Exception(f"Failed to find installers: {str(e)}")


async def _run_incentive_agent(request: AgentsRequest) -> str:
    """
    Run incentive agent with error handling

    Args:
        request: AgentsRequest

    Returns:
        Agent response text

    Raises:
        Exception: If agent fails
    """
    try:
        return await find_solar_incentives(
            latitude=request.latitude,
            longitude=request.longitude,
            address=request.address,
            system_size_kw=request.system_size_kw,
            annual_generation_kwh=request.annual_generation_kwh,
            state=request.state,
            zip_code=request.zip_code,
        )
    except Exception as e:
        raise Exception(f"Failed to find incentives: {str(e)}")
