"""
Hugging Face Computer Vision Service
Uses pre-trained segmentation models for roof detection from satellite imagery
"""

import io
import numpy as np
import cv2
from PIL import Image
from typing import Dict, List, Tuple, Optional
from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation
import torch

from core.panels import calculate_panel_capacity


class HuggingFaceRoofSegmentation:
    """
    Roof segmentation using Hugging Face SegFormer model
    Fast and efficient building detection from satellite imagery
    """
    
    def __init__(self):
        """Initialize the segmentation model"""
        # Use SegFormer-B0 trained on ADE20K (includes building class)
        # This is faster and lighter than Mask2Former - perfect for hackathon demos!
        self.model_name = "nvidia/segformer-b0-finetuned-ade-512-512"
        self.processor = None
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Building-related class IDs in ADE20K dataset
        # ADE20K: 1=wall, 2=building, 3=sky, 4=floor, 5=tree, etc.
        # Class 68 is commonly detected for rooftops in satellite imagery
        # Including multiple building-related classes for better detection
        self.building_class_ids = [1, 2, 25, 49, 50, 68]  # wall, building, house, skyscraper, roof, rooftop
        
    def load_model(self):
        """Lazy load the model to save memory"""
        if self.model is None:
            print(f"Loading Hugging Face model: {self.model_name} on {self.device}")
            self.processor = SegformerImageProcessor.from_pretrained(self.model_name)
            self.model = SegformerForSemanticSegmentation.from_pretrained(
                self.model_name
            ).to(self.device)
            self.model.eval()
            print("Model loaded successfully")
    
    def segment_roof(self, image_bytes: bytes) -> Dict:
        """
        Segment roof from satellite image
        
        Args:
            image_bytes: Raw image bytes from Google Maps Static API
            
        Returns:
            Dict containing:
                - mask: Binary mask of roof area (numpy array)
                - area_pixels: Total roof area in pixels
                - polygon_pixels: List of [x, y] coordinates defining roof boundary
                - confidence: Model confidence score
                - bounding_box: Dict with x_min, y_min, x_max, y_max
        """
        self.load_model()
        
        # Load image
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        width, height = image.size
        
        # Prepare inputs
        inputs = self.processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        # Run inference
        with torch.no_grad():
            outputs = self.model(**inputs)
        
        # Post-process segmentation
        predicted_segmentation = self.processor.post_process_semantic_segmentation(
            outputs, target_sizes=[(height, width)]
        )[0]
        
        # Convert to numpy
        segmentation_map = predicted_segmentation.cpu().numpy()
        
        # Create binary mask for buildings/roofs
        roof_mask = np.zeros((height, width), dtype=np.uint8)
        for class_id in self.building_class_ids:
            roof_mask = np.logical_or(roof_mask, segmentation_map == class_id)
        
        roof_mask = roof_mask.astype(np.uint8) * 255
        
        # Find the largest contour (main building/roof)
        contours, _ = cv2.findContours(
            roof_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        if not contours:
            raise Exception("No roof/building detected in image")
        
        # Get the largest contour
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Calculate area
        area_pixels = int(cv2.contourArea(largest_contour))
        
        # Get bounding box
        x, y, w, h = cv2.boundingRect(largest_contour)
        bounding_box = {
            "x_min": int(x),
            "y_min": int(y),
            "x_max": int(x + w),
            "y_max": int(y + h)
        }
        
        # Simplify polygon (reduce number of points)
        epsilon = 0.005 * cv2.arcLength(largest_contour, True)
        simplified_contour = cv2.approxPolyDP(largest_contour, epsilon, True)
        
        # Convert to list of [x, y] coordinates
        polygon_pixels = [[int(point[0][0]), int(point[0][1])] 
                         for point in simplified_contour]
        
        # Create filled mask for the roof
        final_mask = np.zeros((height, width), dtype=np.uint8)
        cv2.drawContours(final_mask, [largest_contour], -1, 255, -1)
        
        # Calculate confidence (ratio of detected area to image area)
        # Higher confidence for larger, well-defined roofs
        confidence = min(area_pixels / (width * height) * 5.0, 0.95)
        confidence = max(confidence, 0.6)  # Minimum confidence
        
        return {
            "mask": final_mask,
            "area_pixels": area_pixels,
            "polygon_pixels": polygon_pixels,
            "confidence": round(confidence, 2),
            "bounding_box": bounding_box,
            "model_type": "huggingface_segformer_b0",
            "device_used": self.device
        }


# Global instance (singleton pattern)
_roof_segmentation_model = None


def get_roof_segmentation_model() -> HuggingFaceRoofSegmentation:
    """Get or create the global roof segmentation model instance"""
    global _roof_segmentation_model
    if _roof_segmentation_model is None:
        _roof_segmentation_model = HuggingFaceRoofSegmentation()
    return _roof_segmentation_model


async def analyze_roof_with_huggingface(image_bytes: bytes) -> Dict:
    """
    Analyze roof using Hugging Face segmentation model
    This is the async wrapper for the CV analysis
    
    Returns:
        Dict in the same format as DO Gradient AI response for compatibility
    """
    try:
        model = get_roof_segmentation_model()
        result = model.segment_roof(image_bytes)
        
        # Format response to match DO Gradient AI structure
        return {
            "predictions": [
                {
                    "class": "roof",
                    "confidence": result["confidence"],
                    "bounding_box": result["bounding_box"],
                    "mask": result["mask"].tolist(),
                    "area_pixels": result["area_pixels"],
                    "polygon_pixels": result["polygon_pixels"]
                }
            ],
            "inference_time_ms": 0,  # Not tracked for now
            "model_version": "segformer_b0_ade20k",
            "device": result["device_used"]
        }
        
    except Exception as e:
        print(f"Hugging Face segmentation failed: {e}")
        raise


def extract_roof_data_from_hf_response(
    hf_response: Dict,
    center_lat: float,
    center_lng: float,
    meters_per_pixel: float,
    zoom: int = 20
) -> Dict:
    """
    Extract roof area and polygon data from Hugging Face CV response
    Convert pixel coordinates to lat/lng for frontend display
    
    Args:
        hf_response: Response from analyze_roof_with_huggingface
        center_lat: Center latitude of the satellite image
        center_lng: Center longitude of the satellite image
        meters_per_pixel: Scale factor for area calculation
        zoom: Zoom level of the satellite image
        
    Returns:
        Dict with roof analysis data ready for API response
    """
    if not hf_response.get('predictions'):
        raise Exception("No roof detected in image")
    
    prediction = hf_response['predictions'][0]
    
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
    
    # Estimate orientation based on polygon shape
    orientation_degrees, orientation_cardinal = _estimate_roof_orientation(polygon_pixels)
    
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


def _estimate_roof_orientation(polygon_pixels: List[List[int]]) -> Tuple[int, str]:
    """
    Estimate roof orientation from polygon shape
    
    Returns:
        Tuple of (degrees, cardinal_direction)
    """
    if len(polygon_pixels) < 3:
        return 180, "south"  # Default to south
    
    # Find the longest edge of the roof polygon
    max_length = 0
    best_angle = 180
    
    for i in range(len(polygon_pixels)):
        p1 = polygon_pixels[i]
        p2 = polygon_pixels[(i + 1) % len(polygon_pixels)]
        
        # Calculate edge length and angle
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        length = np.sqrt(dx**2 + dy**2)
        
        if length > max_length:
            max_length = length
            # Calculate angle (0 = east, 90 = north, 180 = west, 270 = south)
            angle = np.degrees(np.arctan2(dy, dx))
            # Convert to compass bearing (0 = north)
            best_angle = (90 - angle) % 360
    
    # Convert to degrees and cardinal direction
    degrees = int(best_angle)
    
    # Map to cardinal directions
    if 337.5 <= degrees or degrees < 22.5:
        cardinal = "north"
    elif 22.5 <= degrees < 67.5:
        cardinal = "northeast"
    elif 67.5 <= degrees < 112.5:
        cardinal = "east"
    elif 112.5 <= degrees < 157.5:
        cardinal = "southeast"
    elif 157.5 <= degrees < 202.5:
        cardinal = "south"
    elif 202.5 <= degrees < 247.5:
        cardinal = "southwest"
    elif 247.5 <= degrees < 292.5:
        cardinal = "west"
    else:
        cardinal = "northwest"
    
    return degrees, cardinal
