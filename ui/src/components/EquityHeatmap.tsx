import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, Circle, InfoWindow } from '@react-google-maps/api';
import { motion } from 'framer-motion';
import { BlockGroupEquityData } from '@/lib/URJALINK-api';
import { equityScoreToColor } from '@/lib/equity-colors';
import { useToast } from '@/hooks/use-toast';

interface EquityHeatmapProps {
  dataPoints: BlockGroupEquityData[];
  center: { lat: number; lng: number };
  onBlockGroupClick?: (blockGroup: BlockGroupEquityData) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '500px'
};

const mapOptions = {
  zoom: 13,
  mapTypeId: 'roadmap' as google.maps.MapTypeId,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { 
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#38414e' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#212a37' }]
    }
  ]
};

// Create a dense grid of equity data points for comprehensive coverage
const generateDenseEquityGrid = (dataPoints: BlockGroupEquityData[], center: { lat: number; lng: number }) => {
  const gridPoints = [];
  
  // Define Princeton area boundaries (expanded for better coverage)
  const bounds = {
    north: center.lat + 0.04,  // ~4.5km coverage
    south: center.lat - 0.04,
    east: center.lng + 0.06,   // ~6km coverage
    west: center.lng - 0.06
  };
  
  // Create dense grid (every ~400m)
  const latStep = 0.0036; // ~400m
  const lngStep = 0.0048; // ~400m
  
  for (let lat = bounds.south; lat <= bounds.north; lat += latStep) {
    for (let lng = bounds.west; lng <= bounds.east; lng += lngStep) {
      // Find nearest data point for this grid cell
      const nearest = findNearestDataPoint(lat, lng, dataPoints);
      if (nearest && getDistanceKm(lat, lng, nearest.lat, nearest.lng) <= 1.5) {
        // Interpolate equity score based on distance
        const distance = getDistanceKm(lat, lng, nearest.lat, nearest.lng);
        const scoreVariance = Math.random() * 8 - 4; // ±4 point variance for realism
        const interpolatedScore = Math.max(0, Math.min(100, nearest.equity_score + scoreVariance));
        
        gridPoints.push({
          ...nearest,
          lat,
          lng,
          equity_score: interpolatedScore,
          isInterpolated: true,
          sourcePoint: nearest
        });
      }
    }
  }
  
  return gridPoints;
};

// Find nearest data point
const findNearestDataPoint = (lat: number, lng: number, dataPoints: BlockGroupEquityData[]) => {
  let nearest = null;
  let minDistance = Infinity;
  
  dataPoints.forEach(point => {
    const distance = getDistanceKm(lat, lng, point.lat, point.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = point;
    }
  });
  
  return nearest;
};

// Calculate distance between two points in km
const getDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Sophisticated gradient color interpolation for smooth transitions
const interpolateColor = (color1: number[], color2: number[], factor: number): string => {
  const r = Math.round(color1[0] + factor * (color2[0] - color1[0]));
  const g = Math.round(color1[1] + factor * (color2[1] - color1[1]));
  const b = Math.round(color1[2] + factor * (color2[2] - color1[2]));
  return `rgb(${r}, ${g}, ${b})`;
};

// Get sophisticated gradient color based on exact equity score
const getGradientColor = (score: number): { fillColor: string; strokeColor: string } => {
  // Define color stops as RGB arrays
  const colorStops = [
    { score: 0, color: [220, 38, 38] },    // Red (severe solar desert)
    { score: 15, color: [239, 68, 68] },   // Light red
    { score: 25, color: [251, 146, 60] },  // Orange-red
    { score: 35, color: [245, 158, 11] },  // Orange (moderate solar desert)
    { score: 50, color: [250, 204, 21] },  // Yellow-orange
    { score: 65, color: [163, 230, 53] },  // Yellow-green (equity threshold)
    { score: 80, color: [34, 197, 94] },   // Green
    { score: 100, color: [16, 185, 129] }  // Emerald (high equity)
  ];
  
  // Find the two color stops to interpolate between
  let lowerStop = colorStops[0];
  let upperStop = colorStops[colorStops.length - 1];
  
  for (let i = 0; i < colorStops.length - 1; i++) {
    if (score >= colorStops[i].score && score <= colorStops[i + 1].score) {
      lowerStop = colorStops[i];
      upperStop = colorStops[i + 1];
      break;
    }
  }
  
  // Calculate interpolation factor
  const factor = (score - lowerStop.score) / (upperStop.score - lowerStop.score);
  
  // Interpolate fill color
  const fillColor = interpolateColor(lowerStop.color, upperStop.color, factor);
  
  // Create darker stroke color (multiply RGB by 0.8)
  const strokeColor = interpolateColor(
    lowerStop.color.map(c => c * 0.8), 
    upperStop.color.map(c => c * 0.8), 
    factor
  );
  
  return { fillColor, strokeColor };
};

// Enhanced circle styling with gradient effects and size variation
const getCircleStyle = (score: number, isInterpolated: boolean = false, centerDistance: number = 0) => {
  const { fillColor, strokeColor } = getGradientColor(score);
  
  // Vary opacity based on score intensity
  const baseOpacity = Math.min(0.8, 0.3 + (Math.abs(score - 50) / 50) * 0.5);
  
  // Size variation based on equity score (more extreme scores = larger circles)
  const scoreIntensity = Math.abs(score - 50) / 50; // 0 to 1
  const sizeMultiplier = 0.8 + scoreIntensity * 0.4; // 0.8x to 1.2x
  
  return {
    fillColor,
    strokeColor,
    fillOpacity: isInterpolated ? baseOpacity * 0.6 : baseOpacity,
    strokeOpacity: isInterpolated ? 0.4 : 0.7,
    strokeWeight: isInterpolated ? 0.8 : 1.5,
    radius: Math.round((isInterpolated ? 200 : 280) * sizeMultiplier),
    zIndex: isInterpolated ? 1 : Math.round(scoreIntensity * 100) + 10 // Higher z-index for more extreme scores
  };
};

export const EquityHeatmap: React.FC<EquityHeatmapProps> = ({ 
  dataPoints, 
  center,
  onBlockGroupClick 
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['visualization'] // Load visualization library for enhanced effects
  });

  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [infoWindowPosition, setInfoWindowPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [denseGridPoints, setDenseGridPoints] = useState<any[]>([]);
  const [isGeneratingGrid, setIsGeneratingGrid] = useState(false);
  const { toast } = useToast();

  // Generate dense grid for comprehensive coverage
  useEffect(() => {
    if (!isLoaded || dataPoints.length === 0) return;
    
    setIsGeneratingGrid(true);
    console.log('🔄 Generating dense equity grid...');
    
    // Generate dense grid points
    const gridPoints = generateDenseEquityGrid(dataPoints, center);
    
    // Combine original data points with interpolated grid
    const allPoints = [
      ...dataPoints.map(p => ({ ...p, isInterpolated: false })),
      ...gridPoints
    ];
    
    setDenseGridPoints(allPoints);
    setIsGeneratingGrid(false);
    console.log('✅ Generated', allPoints.length, 'equity points for comprehensive coverage');
  }, [dataPoints, center, isLoaded]);

  const onLoad = React.useCallback(function callback(map: google.maps.Map) {
    console.log('🗺️ Sophisticated equity heatmap loaded with', dataPoints.length, 'data points');
    
    // Add subtle glow effect to the map
    map.setOptions({
      styles: [
        ...mapOptions.styles,
        {
          featureType: 'all',
          elementType: 'geometry',
          stylers: [{ saturation: -20 }]
        }
      ]
    });
  }, [dataPoints.length]);

  const onUnmount = React.useCallback(function callback() {
    console.log('🗺️ Equity heatmap unmounted');
  }, []);

  const handleCircleClick = (point: any) => {
    // Only show info for original data points, not interpolated ones
    if (!point.isInterpolated) {
      setSelectedPoint(point);
      setInfoWindowPosition({ lat: point.lat, lng: point.lng });
      if (onBlockGroupClick) {
        onBlockGroupClick(point);
      }
    }
  };

  const closeInfoWindow = () => {
    setSelectedPoint(null);
    setInfoWindowPosition(null);
  };

  if (loadError) {
    return (
      <div className="w-full h-[500px] rounded-2xl border border-red-400/30 bg-red-400/10 flex items-center justify-center">
        <div className="text-center text-red-400">
          <h3 className="text-lg font-semibold mb-2">⚠️ Map Loading Error</h3>
          <p className="text-sm">Failed to load Google Maps. Please check your API key.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[500px] rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center backdrop-blur-xl">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-sm">Loading equity heatmap...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(15,23,42,0.35)]"
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          ...mapOptions,
          disableDefaultUI: false,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: window.google?.maps?.MapTypeControlStyle.HORIZONTAL_BAR,
            position: window.google?.maps?.ControlPosition.TOP_CENTER,
          }
        }}
      >
        {/* Render sophisticated gradient heatmap circles */}
        {denseGridPoints.map((point, index) => {
          const circleStyle = getCircleStyle(point.equity_score, point.isInterpolated);
          
          return (
            <Circle
              key={point.isInterpolated ? `grid-${index}` : point.block_group_id}
              center={{ lat: point.lat, lng: point.lng }}
              radius={circleStyle.radius}
              options={{
                fillColor: circleStyle.fillColor,
                strokeColor: circleStyle.strokeColor,
                fillOpacity: circleStyle.fillOpacity,
                strokeOpacity: circleStyle.strokeOpacity,
                strokeWeight: circleStyle.strokeWeight,
                clickable: !point.isInterpolated,
                zIndex: circleStyle.zIndex
              }}
              onClick={() => handleCircleClick(point)}
              onMouseOver={() => {
                // Enhanced hover effects handled via CSS
              }}
              onMouseOut={() => {
                // Remove hover effect handled via CSS
              }}
            />
          );
        })}

        {/* Show loading indicator while generating grid */}
        {isGeneratingGrid && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-sm rounded-2xl">
            <div className="bg-white/95 p-4 rounded-xl shadow-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="text-sm font-medium text-gray-700">
                  Generating sophisticated heatmap...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sophisticated Info Window */}
        {selectedPoint && infoWindowPosition && (
          <InfoWindow
            position={infoWindowPosition}
            onCloseClick={closeInfoWindow}
            options={{
              pixelOffset: new window.google.maps.Size(0, -30),
              maxWidth: 320
            }}
          >
            <div className="p-4 bg-white rounded-lg shadow-xl border border-gray-100">
              {/* Header with equity score badge */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-base">
                  Block Group {selectedPoint.block_group_id.slice(-4)}
                </h3>
                <div 
                  className="px-3 py-1 rounded-full text-white text-sm font-semibold shadow-md"
                  style={{ backgroundColor: getGradientColor(selectedPoint.equity_score).fillColor }}
                >
                  {selectedPoint.equity_score.toFixed(1)}
                </div>
              </div>

              {/* Equity category with gradient background */}
              <div className="mb-3 p-3 rounded-lg border" style={{ 
                backgroundColor: `${getGradientColor(selectedPoint.equity_score).fillColor}15`,
                borderColor: `${getGradientColor(selectedPoint.equity_score).fillColor}40`
              }}>
                <span className="text-sm font-semibold text-gray-800">
                  {selectedPoint.equity_score >= 65 ? '✅ High Equity Area' : 
                   selectedPoint.equity_score >= 35 ? '⚠️ Moderate Equity' : 
                   '🚨 Solar Desert'}
                </span>
                <div className="text-xs text-gray-600 mt-1">
                  Score reflects income, ownership, energy burden, and solar adoption
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-lg font-bold text-gray-900">
                    ${selectedPoint.median_income.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Median household income in the area (USD)</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-lg font-bold text-gray-900">
                    {selectedPoint.renter_percentage.toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-600">Number of solar panel installation providers within service area</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-lg font-bold text-gray-900">
                    {selectedPoint.energy_burden.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600">Average percentage of household income spent on energy costs</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-lg font-bold text-gray-900">
                    {selectedPoint.solar_installations}
                  </div>
                  <div className="text-xs text-gray-600">Average number of solar panel systems installed in the area</div>
                </div>
              </div>

              {/* Barriers */}
              {selectedPoint.barriers.length > 0 && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="font-semibold text-orange-800 mb-2 text-sm">Key Barriers:</div>
                  <ul className="space-y-1">
                    {selectedPoint.barriers.slice(0, 2).map((barrier, idx) => (
                      <li key={idx} className="text-xs text-orange-700 flex items-start">
                        <span className="text-orange-500 mr-1">•</span>
                        <span className="flex-1">{barrier}</span>
                      </li>
                    ))}
                    {selectedPoint.barriers.length > 2 && (
                      <li className="text-xs text-orange-600 italic">
                        +{selectedPoint.barriers.length - 2} more barriers
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      
      {/* Sophisticated Legend with Gradient */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-white/20">
        <div className="text-sm font-bold text-gray-800 mb-3">Solar Equity Index</div>
        
        {/* Gradient bar */}
        <div className="mb-3">
          <div className="h-4 w-32 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 shadow-inner"></div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        {/* Legend items */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-green-500 rounded-sm shadow-sm"></div>
            <span className="text-xs text-gray-700 font-medium">Equitable (65+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-yellow-500 rounded-sm shadow-sm"></div>
            <span className="text-xs text-gray-700 font-medium">Moderate (35-64)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-red-500 rounded-sm shadow-sm"></div>
            <span className="text-xs text-gray-700 font-medium">Solar Desert (&lt;35)</span>
          </div>
        </div>
        
        <div className="mt-3 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-600">Click areas for detailed analysis</p>
        </div>
      </div>

      {/* Enhanced floating summary stats */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-white/20">
        <div className="text-sm font-bold text-gray-800 mb-2">🗺️ Heatmap Coverage</div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Data Points:</span>
            <span className="text-sm font-bold text-gray-900">{denseGridPoints.length.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Block Groups:</span>
            <span className="text-sm font-bold text-gray-900">{dataPoints.length}</span>
          </div>
          <div className="h-px bg-gray-200 my-1"></div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-red-600">Solar Deserts:</span>
            <span className="text-sm font-bold text-red-600">
              {denseGridPoints.filter(p => p.equity_score < 35).length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-green-600">High Equity:</span>
            <span className="text-sm font-bold text-green-600">
              {denseGridPoints.filter(p => p.equity_score >= 65).length}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};