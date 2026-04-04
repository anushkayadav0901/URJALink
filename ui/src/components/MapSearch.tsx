import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { z } from "zod";

const searchSchema = z.object({
  query: z.string().trim().min(1).max(500),
});

interface Prediction {
  description: string;
  placeId: string;
}

interface MapSearchProps {
  onPlaceSelect: (placeId: string, description: string) => void;
}

export const MapSearch = ({ onPlaceSelect }: MapSearchProps) => {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize the new Places API
  useEffect(() => {
    console.log("🔍 MapSearch mounted, initializing Places (New) API...");

    const initPlaces = async () => {
      try {
        // Wait for google.maps to be available
        if (!window.google?.maps?.importLibrary) {
          console.log("⏳ Waiting for Google Maps core...");
          return false;
        }

        // Import the places library using the new API
        const placesLib = (await window.google.maps.importLibrary(
          "places",
        )) as google.maps.PlacesLibrary;

        if (
          placesLib.AutocompleteSuggestion &&
          placesLib.AutocompleteSessionToken
        ) {
          // Create a session token for billing optimization
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
          setIsApiReady(true);
          setApiError(null);
          console.log(
            "✅ Places (New) API initialized with AutocompleteSuggestion",
          );
          return true;
        } else {
          console.error(
            "❌ AutocompleteSuggestion not available in places library",
          );
          setApiError(
            "AutocompleteSuggestion not available. Ensure Places API (New) is enabled.",
          );
          return false;
        }
      } catch (error) {
        console.error("❌ Error initializing Places API:", error);
        setApiError(`Failed to initialize Places API: ${error}`);
        return false;
      }
    };

    // Poll until google.maps is available
    const tryInit = async () => {
      if (await initPlaces()) return;

      const interval = setInterval(async () => {
        if (await initPlaces()) {
          clearInterval(interval);
        }
      }, 200);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (!isApiReady) {
          setApiError(
            "Google Places API failed to load after 15 seconds. Check API key and billing.",
          );
          console.error("❌ Places API timed out");
        }
      }, 15000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    };

    tryInit();
  }, []);

  const fetchPredictions = useCallback(
    async (searchQuery: string) => {
      if (!isApiReady) {
        console.warn("⚠️ Places API not ready yet");
        return;
      }

      setIsLoading(true);
      setApiError(null);
      console.log("⏳ Fetching suggestions for:", searchQuery);

      try {
        const request = {
          input: searchQuery,
          sessionToken: sessionTokenRef.current!,
        };

        const response =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
            request,
          );
        const suggestions = response.suggestions;

        console.log("📡 API Response - Suggestions:", suggestions?.length || 0);

        if (suggestions && suggestions.length > 0) {
          const mapped: Prediction[] = suggestions
            .filter((s) => s.placePrediction)
            .slice(0, 5)
            .map((s) => ({
              description: s.placePrediction!.text.toString(),
              placeId: s.placePrediction!.placeId,
            }));

          setPredictions(mapped);
          setShowDropdown(true);
          setApiError(null);
          console.log(
            "✅ Found",
            mapped.length,
            "suggestions for:",
            searchQuery,
          );
          mapped.forEach((p, i) => console.log(`  ${i + 1}. ${p.description}`));
        } else {
          setPredictions([]);
          setShowDropdown(false);
          console.log("ℹ️ No results found for:", searchQuery);
        }
      } catch (error) {
        console.error("❌ Autocomplete error:", error);
        setPredictions([]);
        setShowDropdown(false);
        setApiError(
          `Search failed: ${error instanceof Error ? error.message : error}`,
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isApiReady],
  );

  // Debounced query effect
  useEffect(() => {
    if (!isFocused) {
      setPredictions([]);
      setSelectedIndex(-1);
      setShowDropdown(false);
      return;
    }

    if (!query.trim() || !isApiReady) {
      setPredictions([]);
      setSelectedIndex(-1);
      setShowDropdown(false);
      return;
    }

    const validation = searchSchema.safeParse({ query });
    if (!validation.success) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      fetchPredictions(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isApiReady, isFocused, fetchPredictions]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (prediction: Prediction) => {
    console.log(
      "🎯 Selected:",
      prediction.description,
      "placeId:",
      prediction.placeId,
    );
    setQuery(prediction.description);
    setPredictions([]);
    setShowDropdown(false);
    setIsFocused(false);
    setSelectedIndex(-1);

    // Create a new session token for the next search session
    if (window.google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current =
        new google.maps.places.AutocompleteSessionToken();
    }

    onPlaceSelect(prediction.placeId, prediction.description);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery("");
    setPredictions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setApiError(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (predictions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < predictions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && predictions[selectedIndex]) {
        handleSelect(predictions[selectedIndex]);
      } else if (predictions.length > 0) {
        handleSelect(predictions[0]);
      }
    } else if (e.key === "Escape") {
      setPredictions([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative w-full max-w-2xl" ref={containerRef}>
      <div
        className={`backdrop-blur-xl bg-glass-bg rounded-2xl border shadow-card transition-all duration-300 ${
          isFocused ? "border-primary shadow-glow" : "border-glass-border"
        }`}
      >
        <div className="flex items-center gap-3 p-4">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={
              isApiReady ? "Search for a location..." : "Loading Maps API..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              if (predictions.length > 0) {
                setShowDropdown(true);
              }
            }}
            className="flex-1 border-0 bg-transparent text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
            disabled={!isApiReady}
          />
          {isLoading && (
            <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
          )}
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

      {/* Error banner */}
      {apiError && (
        <div className="absolute top-full mt-2 w-full backdrop-blur-xl bg-red-500/10 rounded-xl border border-red-500/30 shadow-card px-4 py-3 z-50 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300">{apiError}</span>
        </div>
      )}

      {showDropdown && predictions.length > 0 && (
        <div className="absolute top-full mt-2 w-full backdrop-blur-xl bg-glass-bg rounded-2xl border border-glass-border shadow-card overflow-hidden animate-scale-in z-50">
          {predictions.map((prediction, index) => (
            <button
              key={prediction.placeId}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(prediction);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 border-b border-border/30 last:border-0 ${
                selectedIndex === index ? "bg-primary/10" : "hover:bg-muted/50"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                <Search className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-foreground">
                {prediction.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
