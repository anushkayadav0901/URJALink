from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from models.requests import (
    AnalyzeRequest,
    AgentsRequest,
    SummaryRequest,
    BillComparisonRequest,
    AreaAnalysisRequest,
)
from models.responses import (
    AnalysisResponse,
    Location,
    RoofAnalysis,
    RoofSegment,
    RoofPolygon,
    Obstacles,
    SolarData,
    SeasonalVariation,
    SolarPotential,
    SummaryResponse,
    InstallersResponse,
    IncentivesResponse,
    BillComparisonResponse,
    AreaAnalysisResponse,
)
from models.financial import FinancialOutlook
from business_logic.solar_data import get_nasa_data_cached
from business_logic.cv_roof_analysis import (
    analyze_roof_with_cv,
    get_estimated_roof_data_fallback,
)
from business_logic.roof_analysis import get_roof_data_from_polygon
from business_logic.solar_calculations import (
    calculate_solar_potential,
    calculate_solar_score,
    get_solar_score_breakdown,
)
from business_logic.financial_analysis import calculate_enhanced_financials
from business_logic.installer_finder_agent import find_solar_installers
from business_logic.incentive_agent import find_solar_incentives
from business_logic.summary_agent import generate_metrics_summary
from business_logic.equity_calculator import EquityScoreCalculator
from models.equity_models import (
    EquityMetrics,
    EquityAnalysisResponse,
    BlockGroupEquityData,
)
from data.precomputed_equity_data import (
    get_equity_data,
    get_block_group_by_location,
    get_solar_deserts,
)
from data_access.economic_data import fetch_economic_inputs, EconomicDataError
from data_access.country_detector import detect_country
from business_logic.pdf_parser import extract_text_from_pdf, PDFParseError
from business_logic.bill_extractor import extract_monthly_bill, BillExtractionError
from business_logic.bill_comparison import calculate_bill_comparison
from business_logic.area_analysis import analyze_area
import uuid
from datetime import datetime

router = APIRouter()


@router.post("/api/v1/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalyzeRequest):
    """
    Main analysis endpoint - supports both user-drawn polygons and CV analysis.
    Auto-detects country from coordinates for multi-country support.
    """
    try:
        # 0. Auto-detect country from coordinates
        country = request.country or detect_country(request.latitude, request.longitude)
        is_india = country == "IN"

        # 1. Get NASA solar data (with caching)
        solar_data_result = await get_nasa_data_cached(
            request.latitude, request.longitude
        )

        # 2. Get roof analysis
        # Priority: User polygon > CV analysis > Estimated fallback
        if request.user_polygon:
            # User drew their roof manually - highest accuracy
            try:
                roof_data = get_roof_data_from_polygon(
                    request.user_polygon, request.latitude, request.longitude
                )
            except ValueError as e:
                raise HTTPException(
                    status_code=400, detail=f"Invalid polygon: {str(e)}"
                )
        else:
            # Fall back to CV analysis (if available) or estimates
            try:
                roof_data = await analyze_roof_with_cv(
                    request.latitude, request.longitude
                )
            except Exception as cv_error:
                print(f"CV analysis failed: {cv_error}, falling back to estimated data")
                roof_data = get_estimated_roof_data_fallback(
                    request.latitude, request.longitude
                )

        # 3. Calculate solar potential
        solar_potential = calculate_solar_potential(
            roof_data, solar_data_result, roof_data["obstacles"]
        )

        # 4. Calculate solar score
        solar_score = calculate_solar_score(
            roof_data, solar_data_result, solar_potential, roof_data["obstacles"]
        )

        # 5. Get solar score breakdown for transparency
        score_breakdown = get_solar_score_breakdown(
            roof_data, solar_data_result, solar_potential, roof_data["obstacles"]
        )

        # 6. Add equity analysis
        user_block_group = get_block_group_by_location(
            lat=request.latitude, lng=request.longitude
        )

        user_metrics = EquityMetrics(
            median_income=user_block_group["median_income"],
            renter_percentage=user_block_group["renter_percentage"],
            energy_burden=user_block_group["energy_burden"],
            solar_installations=user_block_group["solar_installations"],
            total_households=user_block_group["total_households"],
        )
        user_equity_breakdown = EquityScoreCalculator.calculate_score(user_metrics)

        all_equity_data = get_equity_data()
        neighborhood_data = [BlockGroupEquityData(**bg) for bg in all_equity_data]
        solar_deserts_count = len(get_solar_deserts())

        equity_analysis = EquityAnalysisResponse(
            user_address_score=user_equity_breakdown,
            neighborhood_data=neighborhood_data,
            solar_deserts_count=solar_deserts_count,
            area_description=request.address or "Selected area",
        )

        # 7. Fetch economic inputs & calculate financial outlook
        # For India: state is auto-detected from coordinates
        # For US: state is required
        if not is_india and not request.state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="State code is required to compute live financial metrics for US locations.",
            )

        try:
            economic_inputs = await fetch_economic_inputs(
                latitude=request.latitude,
                longitude=request.longitude,
                state=request.state,
                zip_code=request.zip_code,
                country=country,
            )
        except EconomicDataError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Economic data unavailable: {exc}",
            ) from exc

        financial_outlook = FinancialOutlook(
            **calculate_enhanced_financials(
                system_size_kw=solar_potential["system_size_kw"],
                annual_generation_kwh=solar_potential["annual_generation_kwh"],
                economic_inputs=economic_inputs,
            )
        )

        # 8. Build response
        return AnalysisResponse(
            analysis_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            location=Location(
                latitude=request.latitude,
                longitude=request.longitude,
                address=request.address,
                country=country,
            ),
            roof_analysis=RoofAnalysis(
                total_area_sqft=roof_data["total_area_sqft"],
                usable_area_sqft=roof_data["usable_area_sqft"],
                roof_segments=[
                    RoofSegment(
                        segment_id=segment["segment_id"],
                        area_sqft=segment["area_sqft"],
                        orientation_degrees=segment["orientation_degrees"],
                        orientation_cardinal=segment["orientation_cardinal"],
                        tilt_degrees=segment["tilt_degrees"],
                        panel_capacity=segment["panel_capacity"],
                        polygon=RoofPolygon(**segment["polygon"])
                        if segment.get("polygon")
                        else None,
                    )
                    for segment in roof_data["roof_segments"]
                ],
                obstacles=Obstacles(**roof_data["obstacles"]),
                confidence_score=roof_data["confidence_score"],
            ),
            solar_data=SolarData(
                peak_sun_hours_daily=solar_data_result["peak_sun_hours_daily"],
                annual_irradiance_kwh_m2=solar_data_result["annual_irradiance_kwh_m2"],
                seasonal_variation=SeasonalVariation(
                    **solar_data_result["seasonal_variation"]
                ),
            ),
            solar_potential=SolarPotential(**solar_potential),
            solar_score=solar_score,
            solar_score_breakdown=score_breakdown,
            financial_outlook=financial_outlook,
            equity_analysis=equity_analysis,
        )

    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "solar-analysis-api"}


@router.post("/api/v1/agents/installers", response_model=InstallersResponse)
async def agents_installers(request: AgentsRequest):
    """
    Find solar installers using Dedalus agent
    """
    try:
        installer_payload = await find_solar_installers(
            latitude=request.latitude,
            longitude=request.longitude,
            address=request.address,
            system_size_kw=request.system_size_kw,
        )
        return InstallersResponse(
            analysis_id=request.analysis_id,
            generated_at=datetime.utcnow(),
            installers_markdown=installer_payload["installers_markdown"],
            model_name=installer_payload["model_name"],
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Installer search failed: {exc}",
        ) from exc


@router.post("/api/v1/agents/incentives", response_model=IncentivesResponse)
async def agents_incentives(request: AgentsRequest):
    """
    Find solar incentives using Dedalus agent
    """
    try:
        incentive_payload = await find_solar_incentives(
            latitude=request.latitude,
            longitude=request.longitude,
            address=request.address,
            system_size_kw=request.system_size_kw,
            annual_generation_kwh=request.annual_generation_kwh,
            state=request.state,
            zip_code=request.zip_code,
        )
        return IncentivesResponse(
            analysis_id=request.analysis_id,
            generated_at=datetime.utcnow(),
            incentives_markdown=incentive_payload["incentives_markdown"],
            model_name=incentive_payload["model_name"],
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Incentive search failed: {exc}",
        ) from exc


@router.post("/api/v1/summary", response_model=SummaryResponse)
async def summarize_metrics(request: SummaryRequest):
    """
    Generate a natural-language summary of solar metrics using Gemini.
    """
    try:
        summary_payload = await generate_metrics_summary(request)
        return SummaryResponse(
            analysis_id=request.analysis_id,
            generated_at=datetime.utcnow(),
            summary_markdown=summary_payload["summary_markdown"],
            model_name=summary_payload["model_name"],
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Summary generation failed: {exc}",
        ) from exc


@router.post("/api/v1/bill-comparison", response_model=BillComparisonResponse)
async def bill_comparison(
    file: UploadFile = File(..., description="Electricity bill PDF file"),
    first_year_savings_net: float = Form(..., gt=0),
    payback_period_years: float = Form(..., gt=0),
    monthly_savings: float = Form(..., gt=0),
):
    """
    Compare electricity bills before and after solar installation.

    Accepts a PDF electricity bill and extracts monthly bill amount using Gemini,
    then calculates comparison with solar savings.
    """
    try:
        # Validate file type
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="File must be a PDF"
            )

        # Read PDF bytes
        pdf_bytes = await file.read()
        if len(pdf_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="PDF file is empty"
            )

        # Extract text from PDF
        try:
            bill_text = extract_text_from_pdf(pdf_bytes)
        except PDFParseError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse PDF: {str(exc)}",
            ) from exc

        # Extract monthly bill amount using Gemini
        try:
            monthly_bill = await extract_monthly_bill(bill_text)
        except BillExtractionError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to extract bill amount: {str(exc)}",
            ) from exc
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
            ) from exc

        if monthly_bill <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract valid bill amount from PDF",
            )

        # Calculate comparison
        comparison = calculate_bill_comparison(
            monthly_bill=monthly_bill,
            monthly_savings=monthly_savings,
            payback_period_years=payback_period_years,
        )

        return BillComparisonResponse(**comparison)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bill comparison failed: {str(exc)}",
        ) from exc


@router.post("/api/v1/area-analysis", response_model=AreaAnalysisResponse)
async def area_analysis(request: AreaAnalysisRequest):
    """
    Analyse an area (e.g. "Dwarka Sector 3") and return solar sweet spots.

    Uses Google Geocoding API to find the area bounds, samples a grid of
    points, and calls the Google Solar API for each to identify the best
    locations for solar panel installation.
    """
    try:
        result = await analyze_area(
            query=request.query,
            grid_size=request.grid_size,
        )
        return AreaAnalysisResponse(**result)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Area analysis failed: {str(exc)}",
        ) from exc
