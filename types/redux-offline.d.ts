// Type definitions for @redux-offline/redux-offline
declare module '@redux-offline/redux-offline/lib/types' {
  export interface NetInfo {
    isConnected: boolean;
  }

  export type NetworkCallback = (result: boolean) => void;
}

// This ensures the type augmentation is properly processed
export {};