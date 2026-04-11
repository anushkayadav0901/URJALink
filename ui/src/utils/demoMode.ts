/**
 * Demo Mode Utilities
 * 
 * Helper functions to simulate API delays and handle demo mode logic
 */

import { APP_CONFIG } from "@/config/app.config";

/**
 * Simulate API delay in demo mode
 * Returns immediately in production mode
 */
export const simulateApiDelay = async (): Promise<void> => {
  if (!APP_CONFIG.DEMO_MODE) return;
  
  return new Promise((resolve) => {
    setTimeout(resolve, APP_CONFIG.DEMO_DELAY_MS);
  });
};

/**
 * Check if we're in demo mode
 */
export const isDemoMode = (): boolean => {
  return APP_CONFIG.DEMO_MODE;
};

/**
 * Log demo mode status (for debugging)
 */
export const logDemoStatus = (action: string): void => {
  if (APP_CONFIG.DEMO_MODE) {
    console.log(`🎭 [DEMO MODE] ${action} - Using mock data`);
  } else {
    console.log(`🚀 [PRODUCTION] ${action} - Calling real API`);
  }
};
