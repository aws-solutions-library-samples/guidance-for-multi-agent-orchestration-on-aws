/**
 * Flow Reset Utilities
 * 
 * Functions to reset animations and states in the React Flow diagram.
 */

import { cleanupAllEdgeAnimations } from './FlowUtils';
import { clearAllAgentTraces } from '../../../utilities/agentTraceStorage';

/**
 * Public API function to reset active animations in the React Flow diagram
 * 
 * This is the main function that should be imported and used by other components
 * that need to reset animations in the flow diagram.
 * 
 * @example
 * // Import in your component
 * import { resetFlowAnimations } from './common/components/react_flow/FlowReset';
 * 
 * // Reset all animations including completed states
 * resetFlowAnimations();
 * 
 * // Reset only active animations, preserving completed states
 * resetFlowAnimations(false);
 * 
 * @param resetCompletedStates - Whether to also reset "completed" states (default: true)
 */
export function resetFlowAnimations(resetCompletedStates: boolean = true): void {
  console.log(`Resetting flow animations (resetCompleted=${resetCompletedStates})`);
  
  // Clear all agent trace data from local storage to prevent animations from reactivating
  clearAllAgentTraces();
  
  // Dispatch the reset event to notify the AgentFlowPanel
  dispatchFlowReset(resetCompletedStates);
  
  // Also directly call resetAllFlowAnimations for immediate DOM manipulation
  resetAllFlowAnimations(resetCompletedStates);
  
  // Reset window.__agentTraceCache to prevent animation reactivation
  if (window.__agentTraceCache) {
    window.__agentTraceCache = {};
    console.log('Reset agent trace cache in memory');
  }
  
  // Force remove any trace-related data from local storage
  try {
    localStorage.removeItem('agent-trace-cache');
    console.log('Removed agent trace data from local storage');
  } catch (e) {
    console.error('Failed to remove agent trace data from local storage', e);
  }
}

/**
 * Reset all active animations in the React Flow diagram
 * 
 * This function:
 * 1. Cleans up all edge animation timeouts
 * 2. Removes processing states from all nodes
 * 3. Resets edge animations
 * 4. Dispatches events to notify components of the reset
 * 
 * @param resetCompletedStates - Whether to also reset "completed" states (default: true)
 */
export function resetAllFlowAnimations(resetCompletedStates: boolean = true): void {
  console.log('🔄 Resetting all flow animations');
  
  // Step 1: Clean up all edge animation timeouts
  cleanupAllEdgeAnimations();
  
  // Step 2: Reset node processing states via DOM
  const processingNodes = document.querySelectorAll('.node-processing');
  processingNodes.forEach(node => {
    node.classList.remove('node-processing');
  });
  
  // Step 3: Reset completed states if requested
  if (resetCompletedStates) {
    const completedNodes = document.querySelectorAll('.node-complete');
    completedNodes.forEach(node => {
      node.classList.remove('node-complete');
    });
    
    // Also reset edge completed states
    const completedEdges = document.querySelectorAll('.edge-complete');
    completedEdges.forEach(edge => {
      edge.classList.remove('edge-complete');
    });
  }
  
  // Step 4: Reset edge animations
  const processingEdges = document.querySelectorAll('.edge-processing');
  processingEdges.forEach(edge => {
    edge.classList.remove('edge-processing');
  });
  
  // Step 5: Dispatch global reset event for components to respond to
  document.dispatchEvent(new CustomEvent('flowAnimationReset', {
    detail: {
      resetCompletedStates,
      timestamp: Date.now()
    }
  }));
  
  // Step 6: Dispatch the existing clearAllTimers event that components might already be listening for
  document.dispatchEvent(new Event('clearAllTimers'));
}

/**
 * Reset animations for a specific node
 * 
 * @param nodeId - The ID of the node to reset
 * @param resetCompletedState - Whether to also reset the "completed" state
 */
export function resetNodeAnimation(nodeId: string, resetCompletedState: boolean = true): void {
  console.log(`🔄 Resetting animation for node ${nodeId}`);
  
  // Find node elements by ID and data-id attribute
  const nodeElements = [
    document.getElementById(nodeId),
    ...Array.from(document.querySelectorAll(`[data-id="${nodeId}"]`))
  ].filter(Boolean) as HTMLElement[];
  
  if (nodeElements.length > 0) {
    nodeElements.forEach(el => {
      // Remove processing class
      el.classList.remove('node-processing');
      
      // Remove completed class if requested
      if (resetCompletedState) {
        el.classList.remove('node-complete');
      }
    });
    
    // Also dispatch event to update React state in components
    document.dispatchEvent(new CustomEvent('agentProcessingUpdate', {
      detail: {
        nodeId: nodeId,
        isProcessing: false,
        processingComplete: resetCompletedState ? false : undefined
      }
    }));
  }
}

/**
 * Dispatch a reset command to the AgentFlowPanel component
 * This can be called from outside the flow component to trigger a reset
 */
export function dispatchFlowReset(resetCompletedStates: boolean = true): void {
  document.dispatchEvent(new CustomEvent('resetReactFlow', {
    detail: {
      resetCompletedStates,
      timestamp: Date.now()
    }
  }));
}
