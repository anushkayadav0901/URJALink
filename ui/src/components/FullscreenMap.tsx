import { useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, Polygon, Polyline } from "@react-google-maps/api";
import { Layers, Pencil, Trash2, Undo2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Point, calculatePolygonArea } from "@/lib/roof-detection";
import { URJALINKPolygonToGoogleMaps, formatURJALINKStats } from "@/lib/URJALINK-api";
import { useAnalyzeApiV1AnalyzePost } from "@/lib/api/hooks/useAnalyzeApiV1AnalyzePost";
import { useAgentsInstallersApiV1AgentsInstallersPost } from "@/lib/api/hooks/useAgentsInstallersApiV1AgentsInstallersPost";
import { useAgentsIncentivesApiV1AgentsIncentivesPost } from "@/lib/api/hooks/useAgentsIncentivesApiV1AgentsIncentivesPost";
import { apiClientConfig } from "@/lib/api-config";
import { SolarResultsOverlay } from "./SolarResultsOverlay";
import type { SolarStats } from "@/types/solar";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

type CoordinatePoint = {
  lat: number;
  lng: number;
};

const mapTypeLabels: Record<"roadmap" | "satellite" | "hybrid", string> = {
  roadmap: "Map View",
  satellite: "Satellite View",
  hybrid: "Hybrid View",
};

const getPolygonCentroid = (points: CoordinatePoint[]): CoordinatePoint => {
  if (points.length === 0) {
    return { lat: 0, lng: 0 };
  }

  const sums = points.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat,
      lng: acc.lng + point.lng,
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: sums.lat / points.length,
    lng: sums.lng / points.length,
  };
};

// Extract 2-character state code from address
const extractStateCode = (address: string): string | null => {
  const stateRegex = /\b([A-Z]{2})\s+\d{5}/; // Matches "CA 12345" or "NY 10001"
  const match = address.match(stateRegex);
  return match ? match[1] : null;
};

interface FullscreenMapProps {
  selectedPlaceId: string | null;
  selectedAddress: string | null;
  onAnalyze: (data: { address: string; coordinates: CoordinatePoint[] }) => void;
}

export const FullscreenMap = ({ selectedPlaceId, selectedAddress, onAnalyze }: FullscreenMapProps) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState({ lat: 28.6139, lng: 77.2090 });
  const [markerPosition, setMarkerPosition] = useState<CoordinatePoint | null>(null);
  const [mapTypeId, setMapTypeId] = useState<"roadmap" | "satellite" | "hybrid">("hybrid");
  const [roofPolygon, setRoofPolygon] = useState<CoordinatePoint[] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<CoordinatePoint[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<SolarStats | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Kubb-generated mutation hooks
  const analyzeMutation = useAnalyzeApiV1AnalyzePost({ client: apiClientConfig });
  const installersMutation = useAgentsInstallersApiV1AgentsInstallersPost({ client: apiClientConfig });
  const incentivesMutation = useAgentsIncentivesApiV1AgentsIncentivesPost({ client: apiClientConfig });
  const isAnalyzing = analyzeMutation.isPending;

  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    mapTypeId: mapTypeId,
    gestureHandling: isDrawing ? "none" : "greedy", // Disable pan/zoom while drawing
    tilt: 0,
    styles: mapTypeId === "roadmap" ? [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
    ] : undefined,
  };

  type ToastVariant = "success" | "info" | "error";

  const toastFnMap = {
    success: toast.success,
    info: toast.info,
    error: toast.error,
  } as const;

  const showToast = (variant: ToastVariant, title: string, description?: string, id?: string) => {
    const toastId = id ?? `${variant}-${Date.now()}`;
    toastFnMap[variant](title, {
      id: toastId,
      description,
      position: "top-right",
      action: {
        label: "✕",
        onClick: () => toast.dismiss(toastId),
      },
    });
    return toastId;
  };

  useEffect(() => {
    if (!selectedPlaceId || !window.google?.maps) return;

    const fetchPlaceDetails = async () => {
      try {
        // Use the new Place class (Places API New)
        const { Place } = await window.google.maps.importLibrary("places") as google.maps.PlacesLibrary;
        const place = new Place({ id: selectedPlaceId });
        
        await place.fetchFields({ fields: ["location", "formattedAddress"] });
        
        if (place.location) {
          const location = {
            lat: place.location.lat(),
            lng: place.location.lng(),
          };
          setCenter(location);
          setMarkerPosition(location);
          
          // Smooth zoom and pan to the location
          map?.panTo(location);
          
          // Zoom in very close to see roof details
          setTimeout(() => {
            map?.setZoom(21);
          }, 300);
          
          // Switch to hybrid view (satellite + labels)
          setMapTypeId("hybrid");
          
          console.log("📍 Zoomed to address:", place.formattedAddress, "at zoom level 21");
          
          if (place.formattedAddress) {
            setResolvedAddress(place.formattedAddress);
          }
          
          // Show tutorial card
          setShowTutorial(true);
        }
      } catch (error) {
        console.error("❌ Error fetching place details:", error);
      }
    };

    fetchPlaceDetails();
  }, [selectedPlaceId, map]);

  useEffect(() => {
    if (selectedAddress) {
      setResolvedAddress(selectedAddress);
    }
  }, [selectedAddress]);

  const getGeocoder = () => {
    if (!window.google?.maps?.Geocoder) {
      return null;
    }
    if (!geocoderRef.current) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
    return geocoderRef.current;
  };

  const reverseGeocode = async (location: CoordinatePoint): Promise<string | null> => {
    const geocoder = getGeocoder();
    if (!geocoder) {
      return null;
    }

    return new Promise(resolve => {
      geocoder.geocode({ location }, (results, status) => {
        if (status === "OK" && results && results[0]?.formatted_address) {
          resolve(results[0].formatted_address);
        } else {
          resolve(null);
        }
      });
    });
  };

  const formatCoordinateLabel = (point: CoordinatePoint | null) => {
    if (!point) return "Selected location";
    return `Lat ${point.lat.toFixed(5)}, Lng ${point.lng.toFixed(5)}`;
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!isDrawing || !e.latLng) return;
    
    const point = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };
    
    const updatedPoints = [...drawingPoints, point];
    setDrawingPoints(updatedPoints);
    
    // Auto-complete after 4 points
    if (updatedPoints.length === 4) {
      const centroid = getPolygonCentroid(updatedPoints);
      setRoofPolygon(updatedPoints);
      setIsDrawing(false);
      setDrawingPoints([]);
      setMarkerPosition(centroid);

      const area = calculatePolygonArea(updatedPoints);
      const areaSqFt = (area * 10.7639).toFixed(2);
      showToast("success", "Roof outline complete!", `Area: ${areaSqFt} sq ft (${area.toFixed(2)} m²)`);
      
      console.log("✅ Roof drawn:", {
        points: updatedPoints.length,
        area: `${areaSqFt} sq ft`
      });
    }
  };

  const undoLastPoint = () => {
    if (drawingPoints.length === 0) return;
    
    const newPoints = drawingPoints.slice(0, -1);
    setDrawingPoints(newPoints);
    showToast("info", "Point removed", `${newPoints.length}/4 points selected`);
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setDrawingPoints([]);
    setRoofPolygon(null);
    setAnalysisResults(null);
    setShowResults(false);
    setResolvedAddress(null);
    showToast("success", "Drawing mode activated", "Click 4 corners of the roof to outline it");
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
    showToast("info", "Drawing cancelled");
  };

  const clearRoof = () => {
    setRoofPolygon(null);
    setDrawingPoints([]);
    setIsDrawing(false);
    setAnalysisResults(null);
    setShowResults(false);
    setResolvedAddress(null);
    showToast("info", "Roof outline cleared");
  };

  const analyzeRoofWithAI = async () => {
    const centroid = roofPolygon ? getPolygonCentroid(roofPolygon) : null;
    const referencePosition = centroid ?? markerPosition;
    const usingUserPolygon = !!roofPolygon?.length;

    if (!referencePosition) {
      showToast("error", "Select a roof outline first");
      return;
    }

    if (!markerPosition && referencePosition) {
      setMarkerPosition(referencePosition);
    }

    const toastId = 'analyzing-roof';
    
    try {
      let addressToUse = resolvedAddress ?? null;
      if (!addressToUse && referencePosition) {
        addressToUse = await reverseGeocode(referencePosition);
      }
      if (!addressToUse && selectedAddress) {
        addressToUse = selectedAddress;
      }
      const fallbackAddress = addressToUse || formatCoordinateLabel(referencePosition);

      // Determine analysis method
      const method = usingUserPolygon ? "user-drawn polygon" : "AI detection";
      toast.loading(`🔍 Analyzing with ${method}...`, {
        id: toastId,
        position: "top-right",
        action: {
          label: "✕",
          onClick: () => toast.dismiss(toastId),
        },
      });

      // Extract state from address
      const stateCode = extractStateCode(fallbackAddress);

      // Convert Google Maps polygon to backend format [[lat, lng], …]
      const user_polygon = roofPolygon
        ? roofPolygon.map((p) => [p.lat, p.lng])
        : undefined;

      // Extract zip from address
      const zipMatch = fallbackAddress.match(/\b\d{5}\b/);
      const zip_code = zipMatch ? zipMatch[0] : undefined;

      // Call via Kubb-generated mutation hook
      const result = await analyzeMutation.mutateAsync({
        data: {
          latitude: referencePosition.lat,
          longitude: referencePosition.lng,
          address: fallbackAddress,
          state: stateCode || "NJ",
          zip_code,
          user_polygon,
        },
      });

      // Extract polygon from roof segments (first segment contains the main polygon)
      const polygonCoords = result.roof_analysis.roof_segments[0]?.polygon?.coordinates || [];
      const polygon = URJALINKPolygonToGoogleMaps(polygonCoords);
      
      // Format stats for display
      const stats = formatURJALINKStats(result);
      const normalizedAddress = result.location?.address || fallbackAddress;
      setResolvedAddress(normalizedAddress);

      // Update map with polygon
      setRoofPolygon(polygon);

      // Success toast with stats
      toast.dismiss('analyzing-roof');
      showToast(
        "success",
        "✅ Analysis complete!",
        `${stats.maxPanels} panels • ${stats.roofAreaSqft.toLocaleString()} sqft • ${stats.confidence}% confidence • ${usingUserPolygon ? 'User-defined' : 'AI-detected'}`
      );

      // Store results and show panel
      setAnalysisResults(stats);
      setShowResults(true);
      
      // Pass to parent
      onAnalyze({
        address: normalizedAddress,
        coordinates: polygon,
      });

      // Prefetch installers and incentives data asynchronously (fire and forget)
      if (stats.analysisId && stateCode) {
        const zipCode = zipMatch ? zipMatch[0] : '00000';
        
        installersMutation.mutate({
          data: {
            analysis_id: stats.analysisId,
            latitude: referencePosition.lat,
            longitude: referencePosition.lng,
            address: normalizedAddress,
            system_size_kw: stats.systemSizeKw,
            annual_generation_kwh: stats.yearlyEnergyKwh,
            state: stateCode,
            zip_code: zipCode,
          },
        }, { onError: (err) => console.warn('Prefetch installers failed:', err) });
        
        incentivesMutation.mutate({
          data: {
            analysis_id: stats.analysisId,
            latitude: referencePosition.lat,
            longitude: referencePosition.lng,
            address: normalizedAddress,
            system_size_kw: stats.systemSizeKw,
            annual_generation_kwh: stats.yearlyEnergyKwh,
            state: stateCode,
            zip_code: zipCode,
          },
        }, { onError: (err) => console.warn('Prefetch incentives failed:', err) });
        
        console.log('🚀 Prefetching installers and incentives data...');
      }

      // Log full stats for debugging
      console.log("URJALINK Analysis Results:", {
        roof: result.roof_analysis,
        solar: result.solar_potential,
        stats: stats
      });

    } catch (error) {
      console.error("URJALINK analysis error:", error);
      showToast("error", "Failed to analyze roof", error instanceof Error ? error.message : "Unknown error");
    } finally {
      toast.dismiss('analyzing-roof');
    }
  };

  const toggleMapType = () => {
    setMapTypeId(prev => {
      const types: ("roadmap" | "satellite" | "hybrid")[] = ["roadmap", "satellite", "hybrid"];
      const currentIndex = types.indexOf(prev);
      return types[(currentIndex + 1) % types.length];
    });
  };

  const overlayAddress = resolvedAddress || selectedAddress || formatCoordinateLabel(markerPosition);

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={13}
        options={mapOptions}
        onLoad={setMap}
        onClick={handleMapClick}
      >
        {markerPosition && (
          <Marker
            position={markerPosition}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#FF8C00",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            }}
          />
        )}
        
        {/* Drawing in progress - show polyline */}
        {isDrawing && drawingPoints.length > 0 && (
          <>
            <Polyline
              path={drawingPoints}
              options={{
                strokeColor: "#FF8C00",
                strokeWeight: 3,
                strokeOpacity: 0.8,
              }}
            />
            {/* Show dots for each point */}
            {drawingPoints.map((point, index) => (
              <Marker
                key={index}
                position={point}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 5,
                  fillColor: "#FF8C00",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                }}
              />
            ))}
          </>
        )}
        
        {/* Completed roof polygon */}
        {roofPolygon && !isDrawing && (
          <Polygon
            paths={roofPolygon}
            options={{
              fillColor: "#FF8C00",
              fillOpacity: 0.3,
              strokeColor: "#FF8C00",
              strokeWeight: 3,
              strokeOpacity: 0.8,
            }}
          />
        )}
      </GoogleMap>

      {/* Drawing instructions */}
      {isDrawing && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 backdrop-blur-xl bg-glass-bg rounded-2xl border border-glass-border shadow-card px-6 py-4 animate-fade-in">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-center">
              Click 4 corners of the roof
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {drawingPoints.length}/4 points selected
            </div>
            <div className="flex justify-center gap-2 mt-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i < drawingPoints.length
                      ? "bg-orange-500 scale-125"
                      : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Map controls */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-3 items-start">
        {/* AI Analyze button - requires completed roof polygon */}
        {!isDrawing && roofPolygon && (
          <button
            onClick={analyzeRoofWithAI}
            disabled={isAnalyzing}
            className={`backdrop-blur-xl rounded-xl border shadow-card p-3 transition-all hover:scale-105 flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500 hover:from-green-500/30 hover:to-emerald-500/30 ${
              isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Analyze your drawn roof"
          >
            <Sparkles className={`w-5 h-5 text-green-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium text-green-300">
              {isAnalyzing ? 'Analyzing...' : '✨ Analyze Drawn Roof'}
            </span>
          </button>
        )}

        {/* Drawing controls */}
        {!isDrawing && !roofPolygon && (
          <button
            onClick={startDrawing}
            className="backdrop-blur-xl bg-glass-bg rounded-xl border border-glass-border shadow-card p-3 hover:bg-muted/50 transition-all hover:scale-105 flex items-center gap-2"
            title="Draw roof outline"
          >
            <Pencil className="w-5 h-5 text-foreground" />
            <span className="text-sm font-medium">Draw Roof</span>
          </button>
        )}
        
        {isDrawing && (
          <div className="flex flex-col gap-2">
            {drawingPoints.length > 0 && (
              <button
                onClick={undoLastPoint}
                className="backdrop-blur-xl bg-blue-500/20 rounded-xl border border-blue-500 shadow-card p-3 hover:bg-blue-500/30 transition-all hover:scale-105 flex items-center gap-2"
                title="Undo last point"
              >
                <Undo2 className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-blue-500">Undo</span>
              </button>
            )}
            <button
              onClick={cancelDrawing}
              className="backdrop-blur-xl bg-red-500/20 rounded-xl border border-red-500 shadow-card p-3 hover:bg-red-500/30 transition-all hover:scale-105 flex items-center gap-2"
              title="Cancel drawing"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-red-500">Cancel</span>
            </button>
          </div>
        )}
        
        {roofPolygon && !isDrawing && (
          <div className="flex flex-col gap-2">
            <button
              onClick={clearRoof}
              className="backdrop-blur-xl bg-red-500/20 rounded-xl border border-red-500 shadow-card p-3 hover:bg-red-500/30 transition-all hover:scale-105 flex items-center gap-2"
              title="Clear roof outline"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-red-500">Clear</span>
            </button>
            <button
              onClick={startDrawing}
              className="backdrop-blur-xl bg-glass-bg rounded-xl border border-glass-border shadow-card p-3 hover:bg-muted/50 transition-all hover:scale-105 flex items-center gap-2"
              title="Redraw roof outline"
            >
              <Pencil className="w-5 h-5 text-foreground" />
              <span className="text-sm font-medium">Redraw</span>
            </button>
          </div>
        )}
        
        {/* Map type toggle */}
        <button
          onClick={toggleMapType}
          className="backdrop-blur-xl bg-glass-bg rounded-xl border border-glass-border shadow-card px-3 py-2 hover:bg-muted/50 transition-all hover:scale-105 flex items-center gap-2"
          title="Change map type"
        >
          <Layers className="w-5 h-5 text-foreground" />
          <span className="text-sm font-medium text-foreground">
            {mapTypeLabels[mapTypeId]}
          </span>
        </button>
      </div>

      {/* Tutorial Card */}
      <AnimatePresence>
        {showTutorial && !isDrawing && !roofPolygon && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed top-36 left-1/2 -translate-x-1/2 z-30 max-w-sm"
          >
            <div className="backdrop-blur-xl bg-gradient-to-r from-blue-600/95 to-purple-600/95 rounded-xl border border-white/30 shadow-2xl px-5 py-3">
              <button
                onClick={() => setShowTutorial(false)}
                className="absolute -top-2 -right-2 p-1.5 rounded-full bg-white/90 hover:bg-white transition-all shadow-lg"
              >
                <X className="w-3.5 h-3.5 text-gray-700" />
              </button>
              
              <div className="flex items-center gap-3 text-white">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Pencil className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-0.5">👇 Click "Draw Roof" to start</p>
                  <p className="text-xs opacity-90">Outline your building for accurate analysis</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Solar Results Overlay */}
      <SolarResultsOverlay
        stats={analysisResults}
        address={overlayAddress}
        onClose={() => setShowResults(false)}
        isVisible={showResults}
        latitude={markerPosition?.lat}
        longitude={markerPosition?.lng}
      />
    </div>
  );
};
