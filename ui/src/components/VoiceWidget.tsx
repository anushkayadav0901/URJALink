import { useEffect, useMemo, useRef, useState } from "react";

interface VoiceWidgetProps {
  address: string;
  solarData: Record<string, any>;
  incentive: string;
  installerData: string;
}

type ElevenLabsWidgetElement = HTMLElement & {
  setAttribute: (qualifiedName: string, value: string) => void;
};

const AGENT_ID = "agent_7401k9jd9nwwft1snea2yt6nc634";

const buildDynamicVariables = (
  address: string,
  solarData: Record<string, any>,
  incentive: string,
  installerData: string,
) => {
  const solarDataStr = `System Size: ${solarData.systemSizeKw || 0}kW, Max Panels: ${solarData.maxPanels || 0}, Annual Energy: ${solarData.yearlyEnergyKwh || 0}kWh, Daily Energy: ${solarData.dailyEnergyKwh || 0}kWh, Usable Roof Area: ${solarData.usableAreaSqft || 0}sqft, Total Roof Area: ${solarData.roofAreaSqft || 0}sqft, System Cost: $${solarData.systemCost || 0}, Annual Savings: $${solarData.annualSavings || 0}, Payback Years: ${solarData.paybackYears || 0}, ROI: ${solarData.roi || 0}%, Carbon Offset: ${solarData.carbonOffset || 0}kg/year, Trees Equivalent: ${solarData.treesEquivalent || 0}, Solar Score: ${solarData.solarScore || 0}, Confidence: ${solarData.confidence || 0}%, Analysis Type: ${solarData.analysisType || "unknown"}, Orientation: ${solarData.orientation || "unknown"}`;

  return JSON.stringify({
    address: address || "",
    solar_data: solarDataStr,
    incentive: incentive || "",
    installer_data: installerData || "",
  });
};

export const VoiceWidget = ({
  address,
  solarData,
  incentive,
  installerData,
}: VoiceWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<ElevenLabsWidgetElement | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const dynamicVariables = useMemo(
    () => buildDynamicVariables(address, solarData, incentive, installerData),
    [address, solarData, incentive, installerData],
  );

  // Load ElevenLabs script
  useEffect(() => {
    // Check if custom element is already registered
    if (customElements.get("elevenlabs-convai")) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]',
    );

    if (existingScript) {
      // Script exists but element not registered yet, wait for load
      existingScript.addEventListener("load", () => setScriptLoaded(true));
      return;
    }

    // Load new script
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    script.async = true;
    script.type = "text/javascript";
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => console.error("❌ Failed to load ElevenLabs script");
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Create and mount widget only after script is loaded
  useEffect(() => {
    if (!containerRef.current || !scriptLoaded) {
      return;
    }

    const widgetEl = document.createElement(
      "elevenlabs-convai",
    ) as ElevenLabsWidgetElement;
    widgetEl.setAttribute("agent-id", AGENT_ID);
    widgetEl.setAttribute("variant", "full");
    widgetEl.setAttribute("placement", "bottom-right");
    widgetEl.setAttribute("text-input", "true");
    widgetEl.setAttribute("transcript", "true");
    widgetEl.setAttribute("dynamic-variables", dynamicVariables);

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(widgetEl);
    widgetRef.current = widgetEl;

    return () => {
      widgetRef.current = null;
      containerRef.current?.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded]);

  useEffect(() => {
    if (!widgetRef.current) {
      return;
    }

    widgetRef.current.setAttribute("dynamic-variables", dynamicVariables);
  }, [dynamicVariables]);

  return <div ref={containerRef} className="elevenlabs-widget-container" />;
};
