import boto3
import os
from typing import Dict
from core.config import settings


def detect_roof_obstacles(image_bytes: bytes) -> Dict:
    """
    Use AWS Rekognition to detect obstacles on the roof
    """
    try:
        # Initialize AWS Rekognition client
        rekognition = boto3.client(
            "rekognition",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

        # Detect labels in the image
        response = rekognition.detect_labels(
            Image={"Bytes": image_bytes},
            MaxLabels=30,
            MinConfidence=70,
            Features=["GENERAL_LABELS"],
        )

        return _process_rekognition_response(response)

    except Exception as e:
        print(f"AWS Rekognition error: {e}, returning default obstacles")
        return _get_default_obstacles()


def _process_rekognition_response(response: Dict) -> Dict:
    """
    Process AWS Rekognition response and map labels to roof obstacles
    """
    obstacles = {"chimneys": 0, "skylights": 0, "trees_nearby": False, "hvac_units": 0}

    # Label mapping for obstacle detection
    label_mapping = {
        "Chimney": "chimneys",
        "Skylight": "skylights",
        "Window": "skylights",  # Sometimes skylights labeled as windows
        "Glass": "skylights",  # Glass surfaces might be skylights
        "Tree": "trees_nearby",
        "Plant": "trees_nearby",
        "Vegetation": "trees_nearby",
        "Air Conditioner": "hvac_units",
        "HVAC": "hvac_units",
        "Machine": "hvac_units",
        "Equipment": "hvac_units",
        "Vent": "hvac_units",
        "Antenna": "hvac_units",  # Treat antennas as obstacles
        "Satellite Dish": "hvac_units",
    }

    for label in response.get("Labels", []):
        name = label["Name"]
        confidence = label["Confidence"]
        instances = label.get("Instances", [])

        if name in label_mapping and confidence >= 70:
            key = label_mapping[name]

            if isinstance(obstacles[key], bool):
                # For boolean fields (like trees_nearby)
                obstacles[key] = True
            else:
                # Count the number of instances detected
                count = max(len(instances), 1) if instances else 1
                obstacles[key] += count

    # Cap maximum counts to reasonable values
    obstacles["chimneys"] = min(obstacles["chimneys"], 5)
    obstacles["skylights"] = min(obstacles["skylights"], 10)
    obstacles["hvac_units"] = min(obstacles["hvac_units"], 5)

    return obstacles


def _get_default_obstacles() -> Dict:
    """
    Return default obstacle configuration when AWS Rekognition is unavailable
    """
    return {"chimneys": 0, "skylights": 0, "trees_nearby": False, "hvac_units": 0}


def get_enhanced_obstacle_analysis(image_bytes: bytes) -> Dict:
    """
    Enhanced obstacle detection that could incorporate additional analysis
    """
    obstacles = detect_roof_obstacles(image_bytes)

    # Add additional analysis here if needed
    # For example: shadow analysis, edge detection for precise obstacle placement

    # Calculate shading impact
    shading_percentage = calculate_shading_impact(obstacles)

    return {
        **obstacles,
        "total_obstacles": (
            obstacles["chimneys"]
            + obstacles["skylights"]
            + obstacles["hvac_units"]
            + (1 if obstacles["trees_nearby"] else 0)
        ),
        "estimated_shading_percentage": shading_percentage,
    }


def calculate_shading_impact(obstacles: Dict) -> float:
    """
    Calculate estimated shading percentage based on detected obstacles
    """
    base_shading = 5.0  # Base 5% shading from roof edges, etc.

    # Add shading from each obstacle type
    shading = base_shading
    shading += obstacles.get("chimneys", 0) * 2.0  # 2% per chimney
    shading += obstacles.get("skylights", 0) * 1.5  # 1.5% per skylight
    shading += obstacles.get("hvac_units", 0) * 2.5  # 2.5% per HVAC unit
    shading += 5.0 if obstacles.get("trees_nearby", False) else 0  # 5% if trees nearby

    # Cap at reasonable maximum
    return min(shading, 25.0)
