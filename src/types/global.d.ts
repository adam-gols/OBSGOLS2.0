/**
 * Global type definitions for GOLS Widget
 */

// Environment variables
declare const __DEV__: boolean;
declare const __PROD__: boolean;

// Window extensions for OBS Browser Source
declare global {
  interface Window {
    obsstudio?: {
      pluginVersion: string;
    };
    
    // OBS-specific globals that may be available
    obsSourceWidth?: number;
    obsSourceHeight?: number;
  }
}

export {};
