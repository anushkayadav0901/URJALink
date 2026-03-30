from typing import Dict

from core.panels import calculate_panel_capacity
from business_logic.google_maps_service import (
    fetch_satellite_image,
    calculate_meters_per_pixel,
)
from business_logic.aws_rekognition_service import get_enhanced_obstacle_analysis
from business_logic.do_gradient_service import (
    analyze_roof_with_gradient_ai,
    extract_roof_data_from_cv_response,
)

try:
    from business_logic.huggingface_cv_service import (
        analyze_roof_with_huggingface,
        extract_roof_data_from_hf_response,
    )

    HUGGINGFACE_AVAILABLE = True
    HUGGINGFACE_IMPORT_ERROR = None
except ImportError as hf_error:
    HUGGINGFACE_AVAILABLE = False
    HUGGINGFACE_IMPORT_ERROR = hf_error


async def analyze_roof_with_cv(lat: float, lng: float) -> Dict:
    """
    Complete roof analysis pipeline using real CV models:
    1. Fetch satellite image from Google Maps
    2. Analyze roof with Hugging Face segmentation model
    3. Detect obstacles with AWS Rekognition
    4. Convert pixel coordinates to lat/lng for frontend
    """
    
    # 1. Fetch satellite image
    zoom = 20  # High resolution for detailed roof analysis
    image_bytes = await fetch_satellite_image(lat, lng, zoom)
    
    # 2. Calculate meters per pixel for area calculations
    meters_per_pixel = calculate_meters_per_pixel(lat, zoom)
    
    roof_data = None
    using_huggingface = False
    
    if HUGGINGFACE_AVAILABLE:
        try:
            cv_response = await analyze_roof_with_huggingface(image_bytes)
            roof_data = extract_roof_data_from_hf_response(
                cv_response, lat, lng, meters_per_pixel, zoom
            )
            using_huggingface = True
        except Exception as hf_error:
            print(f"Hugging Face CV analysis failed, falling back to Gradient AI: {hf_error}")
    else:
        if HUGGINGFACE_IMPORT_ERROR:
            print(
                f"Hugging Face dependencies missing "
                f"({HUGGINGFACE_IMPORT_ERROR}); using Gradient AI fallback"
            )
    
    if roof_data is None:
        gradient_response = await analyze_roof_with_gradient_ai(image_bytes)
        roof_data = extract_roof_data_from_cv_response(
            gradient_response, lat, lng, meters_per_pixel, zoom
        )
        gradient_model = gradient_response.get("model_version", "gradient_ai_mock")
    else:
        gradient_model = None
    
    # 5. Detect obstacles with AWS Rekognition
    obstacle_data = get_enhanced_obstacle_analysis(image_bytes)
    
    # 6. Update roof data with obstacle information
    roof_data['obstacles'] = {
        "chimneys": obstacle_data.get('chimneys', 0),
        "skylights": obstacle_data.get('skylights', 0),
        "trees_nearby": obstacle_data.get('trees_nearby', False),
        "hvac_units": obstacle_data.get('hvac_units', 0)
    }
    
    analysis_type = (
        "huggingface_segformer_b0"
        if using_huggingface
        else "gradient_ai"
    )
    model_name = (
        "nvidia/segformer-b0-finetuned-ade-512-512"
        if using_huggingface
        else gradient_model or "gradient_ai_mock"
    )
    
    # 7. Add metadata for frontend and debugging
    roof_data['cv_metadata'] = {
        "image_zoom": zoom,
        "meters_per_pixel": meters_per_pixel,
        "total_obstacles_detected": obstacle_data.get('total_obstacles', 0),
        "estimated_shading_percentage": obstacle_data.get('estimated_shading_percentage', 5.0),
        "model_confidence": roof_data['confidence_score'],
        "analysis_type": analysis_type,
        "model_name": model_name
    }
    
    return roof_data


def get_estimated_roof_data_fallback(lat: float, lng: float) -> Dict:
    """
    Fallback to estimated roof data if CV analysis fails
    Enhanced with more realistic estimates based on location
    """
    # Adjust estimates based on geographic region
    if 30 <= lat <= 50:  # Continental US
        if lat >= 40:  # Northern US - larger houses
            total_area_sqft = 1400
        else:  # Southern US - medium houses
            total_area_sqft = 1200
    else:
        total_area_sqft = 1000  # International/other regions
    
    usable_area_sqft = total_area_sqft * 0.85
    panel_capacity = calculate_panel_capacity(usable_area_sqft)
    
    return {
        "total_area_sqft": total_area_sqft,
        "usable_area_sqft": usable_area_sqft,
        "roof_segments": [
            {
                "segment_id": 1,
                "area_sqft": total_area_sqft,
                "orientation_degrees": 180,  # South-facing (optimal)
                "orientation_cardinal": "south",
                "tilt_degrees": 25,
                "panel_capacity": panel_capacity,
                "polygon": None  # No polygon data for estimated
            }
        ],
        "obstacles": {
            "chimneys": 0,
            "skylights": 0,
            "trees_nearby": False,
            "hvac_units": 0
        },
        "confidence_score": 0.6,  # Lower confidence for estimates
        "cv_metadata": {
            "analysis_type": "estimated",
            "note": "Fallback to estimated data - CV analysis unavailable"
        }
    }
