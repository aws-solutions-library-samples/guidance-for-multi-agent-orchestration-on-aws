declare module '../../utilities/multiWebsocket' {
  export function connectToWebSocket(url: string, onMessage: (data: any) => void): any;
  export function disconnectFromWebSocket(): void;
  export function sendMessageToWebSocket(message: any): void;
}

// This ensures the type augmentation is properly processed
export {};