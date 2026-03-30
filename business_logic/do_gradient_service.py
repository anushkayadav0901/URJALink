import base64
from typing import Dict, List, Tuple, Optional

import httpx
import numpy as np

from core.config import settings
from core.panels import calculate_panel_capacity


async def analyze_roof_with_gradient_ai(image_bytes: bytes) -> Dict:
    """
    Send satellite image to DigitalOcean Gradient AI for roof segmentation
    """
    if not settings.DO_GRADIENT_ENDPOINT or not settings.DO_GRADIENT_API_KEY:
        # Fallback to mock response if DO Gradient AI not configured
        return _generate_mock_cv_response()
    
    # Encode image to base64
    image_b64 = base64.b64encode(image_bytes).decode('utf-8')
    
    payload = {
        "image": image_b64,
        "params": {
            "confidence_threshold": 0.7,
            "mask_output": True,
            "return_polygons": True  # Request polygon coordinates
        }
    }
    
    headers = {
        "Authorization": f"Bearer {settings.DO_GRADIENT_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.DO_GRADIENT_ENDPOINT,
                json=payload,
                headers=headers,
                timeout=30.0
            )
        
        if response.status_code != 200:
            print(f"DO Gradient AI error: {response.status_code}, falling back to mock")
            return _generate_mock_cv_response()
        
        return response.json()
    
    except Exception as e:
        print(f"DO Gradient AI request failed: {e}, falling back to mock")
        return _generate_mock_cv_response()


def _generate_mock_cv_response() -> Dict:
    """
    Generate a mock CV response for development/testing
    Simulates a realistic roof detection result
    """
    return {
        "predictions": [
            {
                "class": "roof",
                "confidence": 0.87,
                "bounding_box": {
                    "x_min": 180,
                    "y_min": 120,
                    "x_max": 460,
                    "y_max": 520
                },
                "mask": _generate_mock_roof_mask(),
                "area_pixels": 78400,  # 280 x 280 pixel roof
                "polygon_pixels": [
                    [180, 120], [460, 120], [460, 320], 
                    [420, 520], [220, 520], [180, 320]
                ]  # Realistic house roof shape
            }
        ],
        "inference_time_ms": 234,
        "model_version": "v1.0"
    }


def _generate_mock_roof_mask() -> List[List[int]]:
    """Generate a mock binary mask for the roof area"""
    # Create a 640x640 mask with a roof-shaped area
    mask = np.zeros((640, 640), dtype=int)
    
    # Define roof polygon points (simplified house shape)
    roof_points = np.array([
        [180, 120], [460, 120], [460, 320], 
        [420, 520], [220, 520], [180, 320]
    ])
    
    # Fill the polygon area (simplified - in real implementation use cv2.fillPoly)
    for y in range(120, 521):
        for x in range(180, 461):
            # Simple rectangular approximation for mock
            if 120 <= y <= 320:  # Top rectangle
                if 180 <= x <= 460:
                    mask[y, x] = 1
            elif 320 < y <= 520:  # Bottom trapezoid
                # Linear interpolation for trapezoid shape
                left_x = 180 + (y - 320) * (220 - 180) // (520 - 320)
                right_x = 460 - (y - 320) * (460 - 420) // (520 - 320)
                if left_x <= x <= right_x:
                    mask[y, x] = 1
    
    return mask.tolist()


def extract_roof_data_from_cv_response(
    cv_response: Dict, 
    center_lat: float, 
    center_lng: float, 
    meters_per_pixel: float,
    zoom: int = 20
) -> Dict:
    """
    Extract roof area and polygon data from CV response
    Convert pixel coordinates to lat/lng for frontend display
    """
    if not cv_response.get('predictions'):
        raise Exception("No roof detected in image")
    
    prediction = cv_response['predictions'][0]  # Take the best prediction
    
    # Get roof area in pixels
    area_pixels = prediction['area_pixels']
    
    # Convert to square feet
    area_sqm = area_pixels * (meters_per_pixel ** 2)
    area_sqft = area_sqm * 10.764  # 1 sqm = 10.764 sqft
    
    # Calculate usable area (85% of total, accounting for edges/obstacles)
    usable_area_sqft = area_sqft * 0.85
    
    panel_capacity = calculate_panel_capacity(usable_area_sqft)
    
    # Convert polygon from pixel coordinates to lat/lng
    polygon_pixels = prediction.get('polygon_pixels', [])
    polygon_coords = []
    
    if polygon_pixels:
        from business_logic.google_maps_service import pixel_to_latlng
        
        for pixel_x, pixel_y in polygon_pixels:
            lat, lng = pixel_to_latlng(
                pixel_x, pixel_y, center_lat, center_lng, zoom
            )
            polygon_coords.append([lat, lng])
    
    # Estimate orientation (simplified - could be enhanced with edge detection)
    # For now, assume south-facing (best case)
    orientation_degrees = 180  # South
    orientation_cardinal = "south"
    
    # Estimate tilt (typical pitched roof)
    tilt_degrees = 25
    
    return {
        "total_area_sqft": round(area_sqft, 1),
        "usable_area_sqft": round(usable_area_sqft, 1),
        "roof_segments": [
            {
                "segment_id": 1,
                "area_sqft": round(area_sqft, 1),
                "orientation_degrees": orientation_degrees,
                "orientation_cardinal": orientation_cardinal,
                "tilt_degrees": tilt_degrees,
                "panel_capacity": panel_capacity,
                "polygon": {
                    "coordinates": polygon_coords,
                    "area_sqft": round(area_sqft, 1),
                    "confidence": prediction['confidence']
                } if polygon_coords else None
            }
        ],
        "obstacles": {
            "chimneys": 0,
            "skylights": 0,
            "trees_nearby": False,
            "hvac_units": 0
        },
        "confidence_score": prediction['confidence']
    }
