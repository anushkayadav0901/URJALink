import { useState, useRef, useEffect, useCallback } from "react";
import { LoadScript, GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { Search, Loader2, MapPin, Sun, Zap, Leaf, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMapsApiKey } from "@/lib/maps-key";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

interface SolarSpot {
  latitude: number;
  longitude: number;
  solar_score: number;
  max_panels: number;
  roof_area_m2: number;
  sunshine_hours_per_year: number;
  yearly_energy_kwh: number;
  carbon_offset_kg_per_year: number;
  imagery_quality: string | null;
}

interface AreaBounds {
  ne_lat: number;
  ne_lng: number;
  sw_lat: number;
  sw_lng: number;
}

interface AreaAnalysisResponse {
  query: string;
  bounds: AreaBounds;
  total_points_sampled: number;
  spots: SolarSpot[];
  best_spot: SolarSpot | null;
}

const mapContainerStyle = { width: "100%", height: "100%" };

const libraries: ("places")[] = ["places"];

function getScoreColor(score: number): string {
  if (score >= 75) return "text-green-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-500";
}

function getMarkerIcon(score: number, isBest: boolean): string {
  if (isBest) return "https://maps.google.com/mapfiles/ms/icons/green-dot.png";
  if (score >= 75) return "https://maps.google.com/mapfiles/ms/icons/green-dot.png";
  if (score >= 50) return "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
  return "https://maps.google.com/mapfiles/ms/icons/red-dot.png";
}

const AreaAnalysis = () => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AreaAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<SolarSpot | null>(null);
  const [suggestions, setSuggestions] = useState<{ description: string; placeId: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [placesReady, setPlacesReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const apiKey = getMapsApiKey();

  // Initialize Places API once loaded
  useEffect(() => {
    const init = async () => {
      const tryInit = async (): Promise<boolean> => {
        if (!window.google?.maps?.importLibrary) return false;
        try {
          const lib = (await window.google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
          if (lib.AutocompleteSuggestion && lib.AutocompleteSessionToken) {
            sessionTokenRef.current = new lib.AutocompleteSessionToken();
            setPlacesReady(true);
            return true;
          }
        } catch { /* retry */ }
        return false;
      };
      if (await tryInit()) return;
      // Poll until ready
      const interval = setInterval(async () => {
        if (await tryInit()) clearInterval(interval);
      }, 500);
      return () => clearInterval(interval);
    };
    init();
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!placesReady || input.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const request: google.maps.places.AutocompleteRequest = {
        input,
        sessionToken: sessionTokenRef.current!,
      };
      const { suggestions: results } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      const mapped = results
        .filter((s) => s.placePrediction)
        .map((s) => ({
          description: s.placePrediction!.text.toString(),
          placeId: s.placePrediction!.placeId,
        }));
      setSuggestions(mapped);
      setShowSuggestions(mapped.length > 0);
    } catch {
      setSuggestions([]);
    }
  }, [placesReady]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSelectSuggestion = (description: string) => {
    setQuery(description);
    setShowSuggestions(false);
    setSuggestions([]);
    // Refresh session token
    if (window.google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
  };

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSelectedSpot(null);

    try {
      const resp = await fetch(`${API_BASE}/api/v1/area-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), grid_size: 4 }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || `Request failed (${resp.status})`);
      }

      const data: AreaAnalysisResponse = await resp.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const mapCenter = result
    ? {
        lat: (result.bounds.ne_lat + result.bounds.sw_lat) / 2,
        lng: (result.bounds.ne_lng + result.bounds.sw_lng) / 2,
      }
    : { lat: 28.6139, lng: 77.209 };

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
      <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
        {/* Top bar */}
        <header className="shrink-0 h-16 z-50 backdrop-blur-lg bg-glass-bg border-b border-glass-border">
          <div className="container mx-auto px-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-2 animate-fade-in">
              <Link to="/" className="flex items-center gap-1 text-slate-500 hover:text-slate-700 mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <img src="/logo.png" alt="URJALINK logo" className="h-12 w-auto object-contain" />
              <h1 className="text-2xl font-bold text-slate-900">URJALINK</h1>
              <Badge variant="secondary" className="ml-2">IntelliSolar</Badge>
            </div>
          </div>
        </header>

        {/* Search bar — positioned over the map */}
        <div ref={containerRef} className="absolute top-[4.5rem] left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                className="bg-white/95 backdrop-blur-sm shadow-lg border-slate-200 w-full"
                placeholder="Search an area, e.g. Palo Alto, California"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setShowSuggestions(false);
                    handleAnalyze();
                  }
                }}
                disabled={isLoading}
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 max-h-64 overflow-y-auto z-50">
                  {suggestions.map((s, i) => (
                    <li
                      key={s.placeId + i}
                      className="px-4 py-2.5 text-sm hover:bg-slate-100 cursor-pointer flex items-center gap-2 border-b border-slate-50 last:border-b-0"
                      onMouseDown={() => handleSelectSuggestion(s.description)}
                    >
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{s.description}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button onClick={handleAnalyze} disabled={isLoading || !query.trim()} className="shadow-lg">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600 bg-white/90 rounded px-3 py-1.5 shadow">{error}</p>
          )}
        </div>

        {/* Main content — fills remaining height, no scroll */}
        <div className="flex-1 min-h-0 flex">
          {/* Map */}
          <div className="flex-1 min-w-0 relative">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={result ? 15 : 12}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                mapTypeId: "hybrid",
                tilt: 0,
              }}
            >
              {result?.spots.map((spot, i) => (
                <Marker
                  key={`${spot.latitude}-${spot.longitude}-${i}`}
                  position={{ lat: spot.latitude, lng: spot.longitude }}
                  icon={getMarkerIcon(spot.solar_score, result.best_spot?.latitude === spot.latitude && result.best_spot?.longitude === spot.longitude)}
                  onClick={() => setSelectedSpot(spot)}
                  title={`Score: ${spot.solar_score}`}
                />
              ))}

              {selectedSpot && (
                <InfoWindow
                  position={{ lat: selectedSpot.latitude, lng: selectedSpot.longitude }}
                  onCloseClick={() => setSelectedSpot(null)}
                >
                  <div className="p-1 min-w-[200px]">
                    <p className="font-bold text-base mb-1">Solar Score: {selectedSpot.solar_score}/100</p>
                    <p className="text-xs">Panels: {selectedSpot.max_panels}</p>
                    <p className="text-xs">Roof: {selectedSpot.roof_area_m2} m²</p>
                    <p className="text-xs">Energy: {Math.round(selectedSpot.yearly_energy_kwh).toLocaleString()} kWh/yr</p>
                    <p className="text-xs">Sunshine: {Math.round(selectedSpot.sunshine_hours_per_year)} hrs/yr</p>
                    <p className="text-xs">CO₂ offset: {Math.round(selectedSpot.carbon_offset_kg_per_year)} kg/yr</p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>

            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
                <div className="bg-white rounded-xl px-6 py-4 flex items-center gap-3 shadow-xl">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="font-medium">Analysing area with Google Solar API...</span>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!result && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 backdrop-blur rounded-xl px-8 py-6 text-center shadow-lg pointer-events-auto max-w-md">
                  <MapPin className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h2 className="text-xl font-semibold mb-2">IntelliSolar</h2>
                  <p className="text-slate-600 text-sm">
                    Enter an area name like <strong>"Palo Alto, California"</strong> to find the best locations for solar panel installation.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Results panel */}
          {result && result.spots.length > 0 && (
            <div className="w-[380px] shrink-0 border-l border-slate-200 bg-slate-50 overflow-y-auto p-4 space-y-3">
              <div>
                <h2 className="font-semibold text-lg">Solar Sweet Spots</h2>
                <p className="text-xs text-slate-500">
                  {result.spots.length} buildings found &middot; {result.total_points_sampled} points sampled
                </p>
              </div>

              {result.spots.map((spot, i) => {
                const isBest = result.best_spot?.latitude === spot.latitude && result.best_spot?.longitude === spot.longitude;
                return (
                  <Card
                    key={`${spot.latitude}-${spot.longitude}-${i}`}
                    className={`cursor-pointer transition hover:shadow-md ${isBest ? "ring-2 ring-green-500" : ""} ${selectedSpot?.latitude === spot.latitude && selectedSpot?.longitude === spot.longitude ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedSpot(spot)}
                  >
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          Spot #{i + 1}
                          {isBest && <Badge className="ml-1 bg-green-600">Best</Badge>}
                        </span>
                        <span className={`text-lg font-bold ${getScoreColor(spot.solar_score)}`}>
                          {spot.solar_score}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 pt-0">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <Sun className="h-3 w-3 text-yellow-500" />
                          {Math.round(spot.sunshine_hours_per_year)} hrs/yr
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-blue-500" />
                          {Math.round(spot.yearly_energy_kwh).toLocaleString()} kWh
                        </div>
                        <div>🔲 {spot.max_panels} panels</div>
                        <div>{spot.roof_area_m2} m² roof</div>
                        <div className="flex items-center gap-1 col-span-2">
                          <Leaf className="h-3 w-3 text-green-600" />
                          {Math.round(spot.carbon_offset_kg_per_year)} kg CO₂ offset/yr
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* No results */}
          {result && result.spots.length === 0 && !isLoading && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 bg-white/95 rounded-xl px-6 py-4 shadow-xl text-center pointer-events-none">
              <p className="text-slate-600">No solar-suitable buildings found in this area. Try a US location like "Palo Alto, California".</p>
            </div>
          )}
        </div>
      </div>
    </LoadScript>
  );
};

export default AreaAnalysis;
