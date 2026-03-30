import { useState, useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { z } from "zod";

const searchSchema = z.object({
  query: z.string().trim().min(1).max(500),
});

interface Prediction {
  description: string;
  place_id: string;
}

interface MapSearchProps {
  onPlaceSelect: (placeId: string, description: string) => void;
}

export const MapSearch = ({ onPlaceSelect }: MapSearchProps) => {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("🔍 MapSearch mounted, checking for Google Maps...");

    // Poll for google.maps.places to be available
    const checkGoogleLoaded = () => {
      if (window.google?.maps?.places?.AutocompleteService) {
        try {
          if (!autocompleteService.current) {
            autocompleteService.current = new window.google.maps.places.AutocompleteService();
            console.log("✅ Google Places Autocomplete Service initialized successfully");
          }
          setIsGoogleLoaded(true);
          return true;
        } catch (error) {
          console.error("❌ Error creating AutocompleteService:", error);
          return false;
        }
      }
      return false;
    };

    if (checkGoogleLoaded()) return;

    console.log("⏳ Waiting for Google Maps to load...");
    // Poll every 100ms for up to 10 seconds
    const interval = setInterval(() => {
      if (checkGoogleLoaded()) {
        clearInterval(interval);
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.error("❌ Google Maps Places API failed to load after 10 seconds");
      console.error("window.google exists:", !!window.google);
      console.error("window.google.maps exists:", !!(window.google?.maps));
      console.error("window.google.maps.places exists:", !!(window.google?.maps?.places));
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    console.log("🔄 Query changed:", query, "Google loaded:", isGoogleLoaded, "Focused:", isFocused);

    if (!isFocused) {
      setPredictions([]);
      setSelectedIndex(-1);
      setShowDropdown(false);
      return;
    }


    if (!query.trim() || !autocompleteService.current || !isGoogleLoaded) {
      setPredictions([]);
      setSelectedIndex(-1);
      setShowDropdown(false);
      return;
    }

    const validation = searchSchema.safeParse({ query });
    if (!validation.success) {
      console.log("❌ Query validation failed:", validation.error);
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    console.log("⏳ Fetching predictions for:", query);

    const timer = setTimeout(() => {
      autocompleteService.current?.getPlacePredictions(
        {
          input: query,
          types: ["geocode"], // Fixed: removed "address" to avoid INVALID_REQUEST
        },
        (predictions, status) => {
          setIsLoading(false);
          console.log("📡 API Response - Status:", status, "Predictions:", predictions?.length || 0);

          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setPredictions(predictions.slice(0, 5));
            setShowDropdown(true);
            console.log("✅ Found", predictions.length, "predictions for:", query);
            predictions.forEach((p, i) => console.log(`  ${i + 1}. ${p.description}`));
          } else {
            setPredictions([]);
            setShowDropdown(false);
            console.log(`⚠️ No predictions. Status: ${status}`);
          }
        }
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isGoogleLoaded]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        console.log("👆 Clicked outside, closing dropdown");
        setShowDropdown(false);
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (prediction: Prediction) => {
    console.log("🎯 Selected prediction:", prediction.description);
    setQuery(prediction.description);
    setPredictions([]);
    setShowDropdown(false);
    setIsFocused(false);
    setSelectedIndex(-1);
    onPlaceSelect(prediction.place_id, prediction.description);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    console.log("🧹 Clearing search");
    setQuery("");
    setPredictions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (predictions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && predictions[selectedIndex]) {
        console.log("⌨️ Enter pressed with selection:", selectedIndex);
        handleSelect(predictions[selectedIndex]);
      } else if (predictions.length > 0) {
        console.log("⌨️ Enter pressed, selecting first prediction");
        handleSelect(predictions[0]);
      }
    } else if (e.key === "Escape") {
      setPredictions([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    }
  }; return (
    <div className="relative w-full max-w-2xl" ref={containerRef}>
      <div
        className={`backdrop-blur-xl bg-glass-bg rounded-2xl border shadow-card transition-all duration-300 ${isFocused ? "border-primary shadow-glow" : "border-glass-border"
          }`}
      >
        <div className="flex items-center gap-3 p-4">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={isGoogleLoaded ? "Search for a location..." : "Loading Maps API..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              console.log("🎯 Input focused");
              setIsFocused(true);
              if (predictions.length > 0) {
                setShowDropdown(true);
              }
            }}
            className="flex-1 border-0 bg-transparent text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
            disabled={!isGoogleLoaded}
          />
          {isLoading && <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />}
          {query && !isLoading && (
            <button
              onClick={handleClear}
              className="flex-shrink-0 p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {showDropdown && predictions.length > 0 && (
        <div className="absolute top-full mt-2 w-full backdrop-blur-xl bg-glass-bg rounded-2xl border border-glass-border shadow-card overflow-hidden animate-scale-in z-50">
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur from firing
                handleSelect(prediction);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 border-b border-border/30 last:border-0 ${selectedIndex === index ? "bg-primary/10" : "hover:bg-muted/50"
                }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                <Search className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-foreground">{prediction.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
