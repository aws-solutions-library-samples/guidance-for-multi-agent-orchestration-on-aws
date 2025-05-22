// This utility file provides functions for managing agent visualizations and animations
// in a graph-based UI. It includes:
//
// - Duration formatting utilities to convert milliseconds to human readable format
// - Color mapping for different agent types to ensure consistent styling
// - Node ID mapping to standardize agent names
// - Edge animation management including:
//   - Starting animations with automatic timeouts
//   - Stopping animations explicitly
//   - Cleaning up all animations
//   - Event listener registration for global cleanup
//
// The functions here are used to create interactive visualizations of agent
// interactions and message flows between different components of the system.
// Format a duration in milliseconds to a human-readable format
export const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
};

// Agent color mapping - exported for consistent use across components
export const agentColors: Record<string, string> = {
  'supervisor-agent': '#9C27B0', // Purple
  'routing-classifier': '#4CAF50', // Green
  'order-mgmt-agent': '#00BCD4', // Teal
  'product-rec-agent': '#2196F3', // Blue
  'personalization-agent': '#E91E63', // Pink
  'ts-agent': '#FF9800', // Orange
  'customer': '#607d8b', // Blue-Gray
  'response': '#009688', // Teal
  'action-group': '#795548', // Brown
  'default': '#2196F3' // Default Blue
};

// Get color for a node by ID
export const getAgentColor = (nodeId: string): string => {
  return agentColors[nodeId] || agentColors.default;
};

// Map collaborator name to a node ID
export const collaboratorToNodeId = (collaboratorName: string): string => {
  // Standardize collaborator name
  const normalizedName = collaboratorName.toLowerCase();

  // Map collaborator names to node IDs
  if (normalizedName.includes('order') || normalizedName === 'ordermanagement') {
    return 'order-mgmt-agent';
  } else if (normalizedName.includes('product') || normalizedName === 'productrecommendation') {
    return 'product-rec-agent';
  } else if (normalizedName.includes('personal') || normalizedName === 'personalization') {
    return 'personalization-agent';
  } else if (normalizedName.includes('trouble') || normalizedName === 'troubleshoot') {
    return 'ts-agent';
  } else if (normalizedName.includes('rout') || normalizedName.includes('class')) {
    return 'routing-classifier';
  } else if (normalizedName.includes('super')) {
    return 'supervisor-agent';
  }

  // For any other collaborator, return a fallback
  return 'unknown-agent';
};

// Track edge animation timeouts for proper cleanup
const edgeAnimationTimeouts: Record<string, NodeJS.Timeout> = {};

// Animate edge based on the relationship status with automatic cleanup
export function animateEdge(
  id: string, 
  source: string, 
  target: string, 
  edgeRef: React.RefObject<SVGGElement>,
  setProcessingEdges: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>,
  completedNodeIds: Set<string>,
  isAgentProcessing: (id: string) => boolean,
  setAgentsProcessing: (ids: string[], value: boolean) => void
) {
  console.log(`Activating edge ${source}->${target}`);
  
  // If we already have a timeout for this edge, clear it first
  if (edgeAnimationTimeouts[id]) {
    console.log(`Clearing previous animation timeout for edge ${id}`);
    clearTimeout(edgeAnimationTimeouts[id]);
    delete edgeAnimationTimeouts[id];
  }
  
  if (!edgeRef.current) {
    console.log(`Edge ${id} ref not ready`);
    return;
  }
  
  // For edge animation, animate the source node too if it's not already processing
  if (!isAgentProcessing(source)) {
    setAgentsProcessing([source], true);
    console.log(`Edge activated source node ${source}`);
  }
  
  // Add our edge animation class
  edgeRef.current.classList.add('edge-processing');
  console.log(`Edge ${id} animated`);
  
  // Mark this edge as processing
  setProcessingEdges(prev => ({ ...prev, [id]: true }));

  // We may want to add animation for completion too
  if (completedNodeIds.has(target)) {
    edgeRef.current.classList.add('edge-complete');
  }
  
  // Automatically stop the animation after a maximum timeout (15 seconds)
  edgeAnimationTimeouts[id] = setTimeout(() => {
    console.log(`🛑 Auto-completing edge animation for ${id} after timeout`);
    if (edgeRef.current) {
      // Remove processing class
      edgeRef.current.classList.remove('edge-processing');
      // Add complete class
      edgeRef.current.classList.add('edge-complete');
    }
    
    // Update processing state
    setProcessingEdges(prev => ({ ...prev, [id]: false }));
    
    // Remove the timeout reference
    delete edgeAnimationTimeouts[id];
  }, 15000); // 15 second maximum animation time
}

// Function to stop an edge animation explicitly
export function stopEdgeAnimation(
  id: string,
  edgeRef: React.RefObject<SVGGElement>,
  setProcessingEdges: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>,
  complete: boolean = true
) {
  console.log(`🛑 Explicitly stopping edge animation for ${id}`);
  
  // Clear the timeout if one exists
  if (edgeAnimationTimeouts[id]) {
    clearTimeout(edgeAnimationTimeouts[id]);
    delete edgeAnimationTimeouts[id];
  }
  
  if (edgeRef.current) {
    // Remove processing class
    edgeRef.current.classList.remove('edge-processing');
    
    // Add complete class if specified
    if (complete) {
      edgeRef.current.classList.add('edge-complete');
    } else {
      edgeRef.current.classList.remove('edge-complete');
    }
  }
  
  // Update processing state
  setProcessingEdges(prev => ({ ...prev, [id]: false }));
}

// Clean up all edge animations
export function cleanupAllEdgeAnimations() {
  console.log('🧹 Cleaning up all edge animations');
  
  // Clear all timeouts
  Object.keys(edgeAnimationTimeouts).forEach(id => {
    clearTimeout(edgeAnimationTimeouts[id]);
    delete edgeAnimationTimeouts[id];
  });
  
  // All animations should be removed by component unmounting,
  // but we could add DOM cleanup here if needed
}

// Register a global event listener to cleanup animations when response is complete
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('clearAllTimers', () => {
    cleanupAllEdgeAnimations();
  });
});
