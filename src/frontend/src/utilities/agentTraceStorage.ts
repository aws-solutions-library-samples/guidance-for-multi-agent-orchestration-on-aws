/**
 * Agent Trace Storage
 * 
 * This utility manages persistent storage of agent trace data
 * and provides methods to access and update it.
 * 
 * It also includes helper functions for consistent trace data formatting
 * across different display contexts (chat window, agent flow diagram).
 */

import { TraceGroup } from './traceParser';

// Define the interface for agent trace data stored in local storage
interface AgentTraceCache {
  [nodeId: string]: {
    traceGroup: TraceGroup;
    lastUpdated: number;
  };
}

// Keys for local storage
const TRACE_STORAGE_KEY = 'agent-trace-cache';
const SESSION_TRACE_KEY = 'current-session-traces';

/**
 * Initialize the agent trace storage, clearing existing data on page load/reload
 */
export const initAgentTraceStorage = (): void => {
  // Clear all existing storage on page load/reload to prevent stale data
  localStorage.setItem(TRACE_STORAGE_KEY, JSON.stringify({}));
  sessionStorage.setItem(SESSION_TRACE_KEY, JSON.stringify({}));
  
  // Reset the in-memory cache
  window.__agentTraceCache = {};
  
  console.log('🧹 Agent trace storage cleared on page load/reload');
};

// Add type declaration for global trace data storage
declare global {
  interface Window {
    __agentTraceCache?: AgentTraceCache;
    __lastTraceEventHash?: string;
  }
}

/**
 * Store trace data for an agent node
 * 
 * @param nodeId The ID of the agent node
 * @param traceGroup The trace group data to store
 * @param sessionId Optional session ID to associate with this trace
 */
export const storeAgentTrace = (
  nodeId: string, 
  traceGroup: TraceGroup, 
  sessionId?: string
): void => {
  try {
    // Update the in-memory cache first
    if (!window.__agentTraceCache) {
      window.__agentTraceCache = {};
    }

    // Add to the in-memory cache
    window.__agentTraceCache[nodeId] = {
      traceGroup,
      lastUpdated: Date.now()
    };

    // Also update local storage for persistence across page reloads
    const existingData = JSON.parse(localStorage.getItem(TRACE_STORAGE_KEY) || '{}');
    
    // Check if this trace is marked as complete to stop continuous processing
    if (traceGroup.isComplete) {
      console.log(`🛑 Storing completed trace for agent ${nodeId} - stopping further processing`);
    }
    
    existingData[nodeId] = {
      traceGroup,
      lastUpdated: Date.now(),
      sessionId,
      isComplete: traceGroup.isComplete || false
    };
    localStorage.setItem(TRACE_STORAGE_KEY, JSON.stringify(existingData));

    // For the current session, also store in sessionStorage
    if (sessionId) {
      const sessionData = JSON.parse(sessionStorage.getItem(SESSION_TRACE_KEY) || '{}');
      if (!sessionData[sessionId]) {
        sessionData[sessionId] = {};
      }
      sessionData[sessionId][nodeId] = {
        traceGroup,
        lastUpdated: Date.now()
      };
      sessionStorage.setItem(SESSION_TRACE_KEY, JSON.stringify(sessionData));
    }

    // Use a hash to identify this exact trace data to prevent redundant events
    const traceHash = `${nodeId}-${traceGroup.id}-${traceGroup.lastUpdateTime || Date.now()}`;
    
    // Check if we've already dispatched an event for this exact trace state
    if (!window.__lastTraceEventHash || window.__lastTraceEventHash !== traceHash) {
      window.__lastTraceEventHash = traceHash;
      // Only log for significant events, not routine updates
      if (traceGroup.isComplete) {
        console.log(`✅ Stored final trace data for agent node ${nodeId}`);
      }
      
      // Dispatch an event to notify components that trace data has been updated
      // Include the source property to help identify the origin of this event
      const traceUpdateEvent = new CustomEvent('agentTraceUpdated', {
        detail: {
          nodeId,
          traceGroup,
          timestamp: Date.now(),
          source: 'storage',
          traceHash
        }
      });
      
      // Use requestAnimationFrame to prevent rapid redundant updates
      window.requestAnimationFrame(() => {
        document.dispatchEvent(traceUpdateEvent);
      });
    } else {
      // Skip redundant event dispatch without logging
      // This reduces console spam for routine trace updates
    }
  } catch (error) {
    console.error('Error storing agent trace data:', error);
  }
};

/**
 * Get trace data for an agent node
 * 
 * @param nodeId The ID of the agent node
 * @returns The stored trace group data, or null if not found
 */
export const getAgentTrace = (nodeId: string): TraceGroup | null => {
  try {
    // First check the in-memory cache for the most up-to-date data
    if (window.__agentTraceCache && window.__agentTraceCache[nodeId]) {
      return window.__agentTraceCache[nodeId].traceGroup;
    }

    // Then check local storage
    const cachedData = JSON.parse(localStorage.getItem(TRACE_STORAGE_KEY) || '{}');
    if (cachedData[nodeId]) {
      // If found in local storage but not in memory, update the memory cache
      if (!window.__agentTraceCache) {
        window.__agentTraceCache = {};
      }
      window.__agentTraceCache[nodeId] = cachedData[nodeId];
      return cachedData[nodeId].traceGroup;
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving agent trace data:', error);
    return null;
  }
};

/**
 * Get all stored agent traces
 * 
 * @returns An object mapping node IDs to their trace groups
 */
export const getAllAgentTraces = (): { [nodeId: string]: TraceGroup } => {
  try {
    const traces: { [nodeId: string]: TraceGroup } = {};
    
    // First check in-memory cache
    if (window.__agentTraceCache) {
      Object.keys(window.__agentTraceCache).forEach(nodeId => {
        traces[nodeId] = window.__agentTraceCache[nodeId].traceGroup;
      });
    }
    
    // Then add any additional data from local storage
    const cachedData = JSON.parse(localStorage.getItem(TRACE_STORAGE_KEY) || '{}');
    Object.keys(cachedData).forEach(nodeId => {
      if (!traces[nodeId]) {
        traces[nodeId] = cachedData[nodeId].traceGroup;
      }
    });
    
    return traces;
  } catch (error) {
    console.error('Error retrieving all agent traces:', error);
    return {};
  }
};

/**
 * Clear trace data for an agent node
 * 
 * @param nodeId The ID of the agent node
 */
export const clearAgentTrace = (nodeId: string): void => {
  try {
    // Clear from in-memory cache
    if (window.__agentTraceCache && window.__agentTraceCache[nodeId]) {
      delete window.__agentTraceCache[nodeId];
    }
    
    // Clear from local storage
    const cachedData = JSON.parse(localStorage.getItem(TRACE_STORAGE_KEY) || '{}');
    if (cachedData[nodeId]) {
      delete cachedData[nodeId];
      localStorage.setItem(TRACE_STORAGE_KEY, JSON.stringify(cachedData));
    }
    
    // Dispatch an event to notify components
    const traceClearedEvent = new CustomEvent('agentTraceCleared', {
      detail: {
        nodeId,
        timestamp: Date.now()
      }
    });
    document.dispatchEvent(traceClearedEvent);
  } catch (error) {
    console.error('Error clearing agent trace data:', error);
  }
};

/**
 * Clear all stored agent traces
 * 
 * @param sessionId Optional session ID to only clear traces for a specific session
 */
export const clearAllAgentTraces = (sessionId?: string): void => {
  try {
    if (sessionId) {
      // Clear just for this session
      const sessionData = JSON.parse(sessionStorage.getItem(SESSION_TRACE_KEY) || '{}');
      if (sessionData[sessionId]) {
        delete sessionData[sessionId];
        sessionStorage.setItem(SESSION_TRACE_KEY, JSON.stringify(sessionData));
      }
      
      // Update the main storage to remove this session's traces
      const cachedData = JSON.parse(localStorage.getItem(TRACE_STORAGE_KEY) || '{}');
      Object.keys(cachedData).forEach(nodeId => {
        if (cachedData[nodeId].sessionId === sessionId) {
          delete cachedData[nodeId];
        }
      });
      localStorage.setItem(TRACE_STORAGE_KEY, JSON.stringify(cachedData));
      
      // Update in-memory cache
      if (window.__agentTraceCache) {
        Object.keys(window.__agentTraceCache).forEach(nodeId => {
          // We don't store sessionId in memory cache, so we'll have to rely on the clear event
          // to trigger components to update
        });
      }
    } else {
      // Clear everything
      localStorage.setItem(TRACE_STORAGE_KEY, JSON.stringify({}));
      sessionStorage.removeItem(SESSION_TRACE_KEY);
      window.__agentTraceCache = {};
    }
    
    // Dispatch an event to notify components
    const allClearedEvent = new CustomEvent('allAgentTracesCleared', {
      detail: {
        sessionId,
        timestamp: Date.now()
      }
    });
    document.dispatchEvent(allClearedEvent);
  } catch (error) {
    console.error('Error clearing all agent trace data:', error);
  }
};

/**
 * Helper function to ensure consistent trace data structure
 * This is used by both the chat window and agent flow diagram to
 * ensure trace dropdowns appear identical in both contexts.
 * 
 * @param traceGroup The trace group to normalize
 * @returns Normalized trace group with consistent structure
 */
export const normalizeTraceGroup = (traceGroup: TraceGroup): TraceGroup => {
  if (!traceGroup) return traceGroup;
  
  // Create a deep copy to avoid modifying the original
  const normalizedTraceGroup = JSON.parse(JSON.stringify(traceGroup)) as TraceGroup;
  
  // Process tasks - organize subtasks consistently
  if (normalizedTraceGroup.tasks && Array.isArray(normalizedTraceGroup.tasks)) {
    normalizedTraceGroup.tasks = normalizedTraceGroup.tasks.map(task => {
      // Group related subtasks under their parent tasks
      if (task.subTasks && task.subTasks.length > 0) {
        // Organize knowledge base subtasks
        if (task.title.includes('Knowledge Base')) {
          const kbInputTasks = task.subTasks.filter(st => 
            st.title.toLowerCase().includes('knowledge base query') || 
            st.title.toLowerCase().includes('knowledge base input'));
            
          const kbOutputTasks = task.subTasks.filter(st => 
            st.title.toLowerCase().includes('knowledge base results') || 
            st.title.toLowerCase().includes('knowledge base output'));
            
          // Ensure input tasks come before output tasks
          task.subTasks = [...kbInputTasks, ...kbOutputTasks];
        }
        
        // Organize action group subtasks
        else if (task.title.includes('Action Group')) {
          const agInputTasks = task.subTasks.filter(st => 
            st.title.toLowerCase().includes('action group input'));
            
          const agOutputTasks = task.subTasks.filter(st => 
            st.title.toLowerCase().includes('action group output') || 
            st.title.toLowerCase().includes('action group result'));
            
          // Ensure input tasks come before output tasks
          task.subTasks = [...agInputTasks, ...agOutputTasks];
        }
        
        // Organize model invocation subtasks
        else if (task.title.includes('Invoking Model')) {
          const modelInputTasks = task.subTasks.filter(st => 
            st.title.toLowerCase().includes('model input'));
            
          const modelOutputTasks = task.subTasks.filter(st => 
            st.title.toLowerCase().includes('model output'));
            
          // Ensure input tasks come before output tasks
          task.subTasks = [...modelInputTasks, ...modelOutputTasks];
        }
        
        // Sort subtasks by timestamp for other task types
        else {
          task.subTasks.sort((a, b) => a.timestamp - b.timestamp);
        }
      }
      
      return task;
    });
    
    // Identify Final Response tasks that should go at the very end
    const finalResponseTasks = normalizedTraceGroup.tasks.filter(task =>
      task.title?.includes('Final Response'));

    // Get all other tasks (including Rationale)
    const otherTasks = normalizedTraceGroup.tasks.filter(task =>
      !task.title?.includes('Final Response'));
    
    // Find any Rationale task
    const rationaleTasks = otherTasks.filter(task =>
      task.title?.includes('Rationale'));
    
    // Get regular processing tasks (excluding Rationale)
    const processingTasks = otherTasks.filter(task =>
      !task.title?.includes('Rationale'));
    
    // Sort processing tasks by step number and timestamp
    processingTasks.sort((a, b) => {
      // First sort by step number
      if (a.stepNumber !== b.stepNumber) {
        return a.stepNumber - b.stepNumber;
      }
      
      // If step numbers are the same, sort by timestamp
      return a.timestamp - b.timestamp;
    });

    // Position the Rationale task after Step 1
    // Find if we have a Step 1 task
    const step1Index = processingTasks.findIndex(task => 
      task.title?.includes('Step 1:') || 
      task.stepNumber === 1);

    // Create the properly ordered task list with Rationale after Step 1
    let orderedTasks = [];
    
    if (step1Index >= 0 && rationaleTasks.length > 0) {
      // Add Step 1
      orderedTasks = [
        ...processingTasks.slice(0, step1Index + 1),
        ...rationaleTasks, // Add Rationale after Step 1
        ...processingTasks.slice(step1Index + 1) // Add remaining steps
      ];
    } else {
      // If no Step 1 or no Rationale, just keep processing tasks in order
      orderedTasks = [...processingTasks, ...rationaleTasks];
    }
    
    // Put the tasks back together with Final Response at the end
    normalizedTraceGroup.tasks = [...orderedTasks, ...finalResponseTasks];
  }
  
  return normalizedTraceGroup;
};

/**
 * Update the display configuration and structure of the TraceGroup
 * before rendering to ensure consistent appearance across
 * all instances of trace data displays.
 * 
 * @param traceGroup The trace group to prepare for display
 * @returns Display-ready trace group
 */
export const prepareTraceGroupForDisplay = (traceGroup: TraceGroup): TraceGroup => {
  // First normalize the trace group structure
  const normalizedTraceGroup = normalizeTraceGroup(traceGroup);
  
  // Apply additional display formatting if needed
  // For example, we could update titles, arrange tasks in a specific order, etc.
  
  return normalizedTraceGroup;
};

/**
 * Map a collaborator name to a node ID
 * 
 * @param collaboratorName The name of the collaborator from trace data
 * @returns The corresponding node ID
 */
export const collaboratorToNodeId = (collaboratorName: string): string => {
  // Handle null or undefined case
  if (!collaboratorName) return 'supervisor-agent';

  // EXACT MATCHES - highest priority for specific values we need to ensure are detected
  if (collaboratorName === 'ROUTING_CLASSIFIER' || 
      collaboratorName === 'routing_classifier' ||
      collaboratorName === 'RoutingClassifier') {
    return 'routing-classifier';
  }
  
  if (collaboratorName === 'Supervisor' ||
      collaboratorName === 'SupervisorAgent' ||
      collaboratorName === 'SUPERVISOR') {
    return 'supervisor-agent';
  }
  
  if (collaboratorName === 'Unknown') {
    // Map "Unknown" to supervisor agent
    return 'supervisor-agent';
  }
  
  // Pattern-based matching for other cases
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

  // For any other collaborator, return supervisor agent as the fallback
  return 'supervisor-agent';
};

// Initialize the storage when this module is imported
initAgentTraceStorage();
