declare module 'reactflow' {
  // Add minimal type definitions needed by your components
  export interface Node {
    id: string;
    data: any;
    type?: string;
    position: { x: number; y: number };
    [key: string]: any;
  }

  export interface Edge {
    id: string;
    source: string;
    target: string;
    [key: string]: any;
  }

  export type NodeTypes = Record<string, React.ComponentType<any>>;
  export type EdgeTypes = Record<string, React.ComponentType<any>>;

  export function ReactFlow(props: any): JSX.Element;
  export function useNodesState(initialNodes: any[]): [any[], (nodes: any) => void];
  export function useEdgesState(initialEdges: any[]): [any[], (edges: any) => void];
  export function MiniMap(props: any): JSX.Element;
  export function Controls(props: any): JSX.Element;
  export function Background(props: any): JSX.Element;
  export function Handle(props: any): JSX.Element;
  export function useReactFlow(): any;
  export function useKeyPress(keyCode: any): boolean;
  export const Position: {
    Left: string;
    Top: string;
    Right: string;
    Bottom: string;
  };
  export const MarkerType: {
    Arrow: string;
    ArrowClosed: string;
  };
  export const ConnectionLineType: {
    Bezier: string;
    Step: string;
    SmoothStep: string;
    Straight: string;
  };
}

declare module 'react-icons/fa' {
  export const FaCheck: React.ComponentType<any>;
  export const FaPause: React.ComponentType<any>;
  export const FaPlay: React.ComponentType<any>;
  export const FaStop: React.ComponentType<any>;
  export const FaRedo: React.ComponentType<any>;
}

declare module '../../utilities/multiWebsocket' {
  export function connectToWebSocket(url: string, onMessage: (data: any) => void): any;
  export function disconnectFromWebSocket(): void;
  export function sendMessageToWebSocket(message: any): void;
}

// This ensures the type augmentation is properly processed
export {};