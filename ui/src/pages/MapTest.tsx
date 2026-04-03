import { useEffect, useState } from "react";
import { LoadScript, GoogleMap } from "@react-google-maps/api";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { getMapsApiKey } from "@/lib/maps-key";

const libraries: ("drawing" | "places")[] = ["drawing", "places"];

export default function MapTest() {
  const [apiKey, setApiKey] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const loadKey = async () => {
      const key = await getMapsApiKey();
      setApiKey(key || "NOT_FOUND");
      
      if (!key) {
        setStatus("error");
        setErrorMessage("No API key found in backend.");
      }
    };
    loadKey();
  }, []);

  const handleLoad = () => {
    console.log("✅ Google Maps loaded successfully");
    setStatus("success");
  };

  const handleError = (error: Error) => {
    console.error("❌ Google Maps error:", error);
    setStatus("error");
    setErrorMessage(error.message || "Failed to load Google Maps");
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Google Maps API Test</h1>
        
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">API Key Status</h2>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <strong>API Key:</strong>
              <code className="bg-muted px-2 py-1 rounded text-sm">
                {apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : "NOT FOUND"}
              </code>
            </div>
            
            <div className="flex items-center gap-2">
              <strong>Status:</strong>
              {status === "loading" && (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span>Loading Google Maps...</span>
                </>
              )}
              {status === "success" && (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-green-500">Google Maps loaded successfully!</span>
                </>
              )}
              {status === "error" && (
                <>
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span className="text-destructive">Error loading Google Maps</span>
                </>
              )}
            </div>
            
            {errorMessage && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
                <strong className="text-destructive">Error:</strong>
                <p className="text-sm mt-1">{errorMessage}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Map Test</h2>
          <div className="w-full h-[400px] border rounded-lg overflow-hidden">
            <LoadScript
              googleMapsApiKey={apiKey}
              libraries={libraries}
              onLoad={handleLoad}
              onError={handleError}
            >
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={{ lat: 28.6139, lng: 77.2090 }}
                zoom={10}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                }}
              />
            </LoadScript>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Troubleshooting</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Check that billing is enabled in Google Cloud Console</li>
            <li>Verify API key has no HTTP referrer restrictions, or includes *.lovable.app</li>
            <li>Ensure these APIs are enabled: Maps JavaScript API, Places API, Geocoding API</li>
            <li>Check the browser console for detailed error messages</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
