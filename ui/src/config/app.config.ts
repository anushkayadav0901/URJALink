/**
 * Application Configuration
 * 
 * Toggle between demo mode and production mode
 * 
 * DEMO_MODE = true:  No API calls, uses mock data
 * DEMO_MODE = false: Real API calls to backend
 */

export const APP_CONFIG = {
  // Set to false when backend is ready
  DEMO_MODE: true,
  
  // API base URL (used only when DEMO_MODE = false)
  API_BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:8080",
  
  // Demo mode settings
  DEMO_DELAY_MS: 1500, // Simulate API delay in demo mode
} as const;

// Type-safe config access
export const isDemoMode = () => APP_CONFIG.DEMO_MODE;
export const getApiBaseUrl = () => APP_CONFIG.API_BASE_URL;
export const getDemoDelay = () => APP_CONFIG.DEMO_DELAY_MS;
