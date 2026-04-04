import { useState, useEffect } from "react";
import { LoadScript } from "@react-google-maps/api";
import { Header } from "@/components/Header";
import { MapSearch } from "@/components/MapSearch";
import { FullscreenMap } from "@/components/FullscreenMap";
import { toast } from "sonner";
import { z } from "zod";
import { getMapsApiKey } from "@/lib/maps-key";

const libraries: ("drawing" | "places")[] = ["drawing", "places"];

type CoordinatePoint = {
  lat: number;
  lng: number;
};

const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const analysisDataSchema = z.object({
  address: z.string().trim().min(1).max(500),
  coordinates: z.array(coordinateSchema).min(3),
});

const Index = () => {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [isLoadingKey, setIsLoadingKey] = useState(true);

  useEffect(() => {
    const loadApiKey = async () => {
      const key = await getMapsApiKey();
      setApiKey(key);
      setIsLoadingKey(false);
    };
    loadApiKey();
  }, []);

  const handlePlaceSelect = (placeId: string, description: string) => {
    setSelectedPlaceId(placeId);
    setSelectedAddress(description);
  };

  const handleAnalyze = (data: {
    address: string;
    coordinates: CoordinatePoint[];
  }) => {
    const validation = analysisDataSchema.safeParse(data);

    if (!validation.success) {
      toast.error("Invalid data. Please try again.");
      return;
    }

    const validatedCoordinates: CoordinatePoint[] =
      validation.data.coordinates.map((coord) => ({
        lat: coord.lat,
        lng: coord.lng,
      }));

    const analysisData = {
      address: validation.data.address,
      coordinates: validatedCoordinates,
      area: calculatePolygonArea(validatedCoordinates),
      timestamp: new Date().toISOString(),
    };

    // Log sanitized data (no sensitive info)
    console.log("Analysis started:", {
      addressLength: analysisData.address.length,
      coordinateCount: analysisData.coordinates.length,
      area: analysisData.area,
    });
  };

  const calculatePolygonArea = (coordinates: CoordinatePoint[]): number => {
    if (coordinates.length < 3) return 0;

    let area = 0;
    const n = coordinates.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += coordinates[i].lng * coordinates[j].lat;
      area -= coordinates[j].lng * coordinates[i].lat;
    }

    return Math.abs(area / 2) * 111000 * 111000;
  };

  if (isLoadingKey) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={libraries}
      onLoad={() => console.log("✅ Google Maps loaded in Index")}
    >
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        <Header />

        {/* Search overlay */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-fade-in">
          <MapSearch onPlaceSelect={handlePlaceSelect} />
        </div>

        {/* Fullscreen map */}
        <div className="flex-1 relative">
          <FullscreenMap
            selectedPlaceId={selectedPlaceId}
            selectedAddress={selectedAddress}
            onAnalyze={handleAnalyze}
          />
        </div>
      </div>
    </LoadScript>
  );
};

export default Index;
