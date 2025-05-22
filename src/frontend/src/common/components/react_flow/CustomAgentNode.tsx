import React, { useState, useEffect, useRef, memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import TraceGroup from './TraceGroup';
import { TraceGroup as TraceGroupType } from '../../../utilities/traceParser';
import { getAgentTrace, storeAgentTrace } from '../../../utilities/agentTraceStorage';
import { getAgentColor } from './FlowUtils';
import './FlowComponents.css';

// Global map to track processing state across renders
const nodeProcessingStates = new Map<string, boolean>();

// Enhanced CustomAgentNode component with improved trace detection
const CustomAgentNode = memo(({ id, data, selected }: NodeProps) => {
  // Don't log every render to reduce console noise
  // console.log(`Rendering node ${id}, processing: ${data?.isProcessing}`, data);
  // We no longer need expanded state since we're removing the dropdown functionality
  const [showTrace, setShowTrace] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const initialRender = useRef(true);
  const lastTraceGroup = useRef<TraceGroupType | null>(null);
  
  // Get styling
  const nodeColor = getAgentColor(id);
  const isProcessing = data.isProcessing;
  const processingComplete = data.processingComplete;
  
  // Format node label nicely
  const formatNodeLabel = (id: string) => {
    // Extract just the base name
    const baseName = id.replace('-agent', '')
                     .replace('-', ' ')
                     .replace(/([a-z])([A-Z])/g, '$1 $2'); // add space between camelCase
                     
    // Capitalize each word
    return baseName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Get node label
  const formattedLabel = data.label || formatNodeLabel(id);
  
  // Effect to handle trace content visibility
  useEffect(() => {
    // Check for trace content
    if (data.traceGroup) {
      console.log(`CustomAgentNode: Received trace data for ${id}`);
      
      // Store current trace group for comparison
      lastTraceGroup.current = data.traceGroup;
      
      // Force animation class to be applied directly to DOM element
      // This is critical for making the node glow without requiring a click
      if (nodeRef.current) {
        nodeRef.current.classList.add('node-processing');
      }
      
      // If this is not already marked as processing, trigger the animation
      if (!isProcessing) {
        console.log(`CustomAgentNode: Triggering processing animation for ${id}`);
        const processingEvent = new CustomEvent('agentProcessingUpdate', {
          detail: {
            nodeId: id,
            isProcessing: true,
            processingComplete: false
          }
        });
        document.dispatchEvent(processingEvent);
      }
    }
    
    // Mark initial render as complete
    initialRender.current = false;
  }, [data.traceGroup, id, isProcessing]);
  
  // Effect to handle trace group updates
  useEffect(() => {
    // When trace group updates, check if it's different from the last one
    if (data.traceGroup) {
      // Check if we have a new trace group or updated content in existing one
      const isNewTrace = !lastTraceGroup.current || lastTraceGroup.current.id !== data.traceGroup.id;
      const hasNewTasks = lastTraceGroup.current && lastTraceGroup.current.tasks?.length !== data.traceGroup.tasks?.length;
      
      // Special logging for browser node to track task updates
      if (id === 'customer') {
        console.log(`Browser node trace update:`, {
          isNewTrace,
          hasNewTasks,
          taskCount: data.traceGroup.tasks?.length || 0,
          taskTitles: data.traceGroup.tasks?.map(t => t.title)
        });
      }
      
      if (isNewTrace || hasNewTasks) {
        console.log(`CustomAgentNode: Trace group updated for ${id}:`, 
          isNewTrace ? 'New trace ID' : 'Updated tasks');
        
        // Store the updated trace group both in our ref and in persistent storage
        lastTraceGroup.current = data.traceGroup;
        storeAgentTrace(id, data.traceGroup);
        
        // Make sure we're showing trace content
        setShowTrace(true);
        
        // Check if the trace is marked as complete before applying processing animation
        if (data.traceGroup.isComplete) {
          console.log(`🛑 Trace group for ${id} is marked as complete - applying complete style`);
          if (nodeRef.current) {
            nodeRef.current.classList.remove('node-processing');
            nodeRef.current.classList.add('node-complete');
            
            // Dispatch completion event to stop animations
            const completionEvent = new CustomEvent('agentProcessingUpdate', {
              detail: {
                nodeId: id,
                isProcessing: false,
                processingComplete: true
              }
            });
            document.dispatchEvent(completionEvent);
          }
        } else {
          // Force animation class to be applied directly
          if (nodeRef.current) {
            nodeRef.current.classList.add('node-processing');
          }
        }
      }
    }
  }, [data.traceGroup, id]);

  // Effect to animate processing state when receiving trace data or when isProcessing changes
  useEffect(() => {
    // Apply animation based on node state
    if (nodeRef.current) {
      if (isProcessing) {
        nodeRef.current.classList.add('node-processing');
      } else if (processingComplete) {
        nodeRef.current.classList.remove('node-processing');
        nodeRef.current.classList.add('node-complete');
      } else {
        nodeRef.current.classList.remove('node-processing');
        nodeRef.current.classList.remove('node-complete');
      }
    }

  // If we're receiving trace data, ensure the processing indicator is shown
  if (data.showTraceContent && data.traceGroup && !isProcessing && !processingComplete) {
    // Don't restart processing if trace is marked as complete
    if (data.traceGroup.isComplete) {
      console.log(`🛑 Not starting processing for ${id} - trace is marked as complete`);
      // Instead, mark it as complete
      const completionEvent = new CustomEvent('agentProcessingUpdate', {
        detail: {
          nodeId: id,
          isProcessing: false,
          processingComplete: true
        }
      });
      document.dispatchEvent(completionEvent);
    } else {
      console.log(`Setting processing state for ${id} due to trace data`);
      // We don't modify the prop directly, but dispatch an event to update it
      const processingEvent = new CustomEvent('agentProcessingUpdate', {
        detail: {
          nodeId: id,
          isProcessing: true,
          processingComplete: false
        }
      });
      document.dispatchEvent(processingEvent);
    }
  }
  }, [data.showTraceContent, data.traceGroup, id, isProcessing, processingComplete]);
  
  // Effect to listen for trace updates from other components
  useEffect(() => {
    const handleTraceUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.nodeId === id) {
        console.log(`Received trace update event for ${id}`);
        const updatedTraceGroup = customEvent.detail.traceGroup;
        
        if (updatedTraceGroup && 
            (!lastTraceGroup.current || 
             lastTraceGroup.current.id !== updatedTraceGroup.id)) {
          // Store the updated trace locally
          lastTraceGroup.current = updatedTraceGroup;
          
          // Update the node's state to show the new trace content
          setShowTrace(true);
          
          // Check if the trace is marked as complete
          if (updatedTraceGroup.isComplete) {
            console.log(`🛑 Received complete trace for ${id} - setting complete state`);
            if (nodeRef.current) {
              nodeRef.current.classList.remove('node-processing');
              nodeRef.current.classList.add('node-complete');
              
              // Dispatch completion event
              const completionEvent = new CustomEvent('agentProcessingUpdate', {
                detail: {
                  nodeId: id,
                  isProcessing: false,
                  processingComplete: true
                }
              });
              document.dispatchEvent(completionEvent);
            }
          } else {
            // Force animation class directly on DOM node
            if (nodeRef.current) {
              nodeRef.current.classList.add('node-processing');
            }
          }
        }
      }
    };
    
    // Listen for trace updates
    document.addEventListener('agentTraceUpdated', handleTraceUpdate);
    
    // Check local storage for any existing trace data on mount
    const existingTrace = getAgentTrace(id);
    if (existingTrace && (!data.traceGroup || data.traceGroup.id !== existingTrace.id)) {
      console.log(`Found existing trace data for ${id} in storage`);
      lastTraceGroup.current = existingTrace;
      
      // Dispatch an event to update the node data in the parent component
      const nodeUpdateEvent = new CustomEvent('agentNodeUpdate', {
        detail: {
          nodeId: id,
          traceGroup: existingTrace
        }
      });
      document.dispatchEvent(nodeUpdateEvent);
    }
    
    return () => {
      document.removeEventListener('agentTraceUpdated', handleTraceUpdate);
    };
  }, [id, data.traceGroup]);
  
  // Calculate animation class
  const animationClass = isProcessing ? 'node-processing' : 
                          processingComplete ? 'node-complete' : '';
  
  // Handle node click to show trace modal
  const handleNodeClick = () => {
    console.log(`Node ${id} clicked - showing modal with details`);
    // The parent component (AgentFlowPanel) will handle showing the modal
    const nodeClickEvent = new CustomEvent('agentNodeClicked', {
      detail: {
        nodeId: id,
        timestamp: Date.now()
      }
    });
    document.dispatchEvent(nodeClickEvent);
  };
  
  return (
    <div
      ref={nodeRef}
      id={id} // Add id for direct DOM access
      className={`custom-agent-node ${selected ? 'selected' : ''} ${animationClass}`}
      style={{
        border: `3px solid ${nodeColor}`, // Using 3px border as we updated in CSS
        boxShadow: selected ? `0 0 0 3px ${nodeColor}` : 'none',
        ...data.style
      }}
    >
      {/* Add top handle for connections from above */}
      <Handle 
        id="top"
        type="target" 
        position={Position.Top} 
        style={{ borderColor: nodeColor }} 
      />
      
      {/* Left handle for side connections */}
      <Handle 
        id="left"
        type="target" 
        position={Position.Left} 
        style={{ borderColor: nodeColor }} 
      />
      
      <div 
        className="custom-agent-header" 
        style={{ backgroundColor: nodeColor }}
        onClick={handleNodeClick}
      >
        <div className="agent-title">{formattedLabel}</div>
        {(isProcessing || processingComplete) && (
          <div className="agent-status">
            {isProcessing ? '●' : processingComplete ? '✓' : ''}
          </div>
        )}
      </div>
      
      {/* Right handle for side connections */}
      <Handle 
        id="right"
        type="source" 
        position={Position.Right} 
        style={{ borderColor: nodeColor }} 
      />

      {/* Bottom handle for connections from below */}
      <Handle 
        id="bottom"
        type="source" 
        position={Position.Bottom} 
        style={{ borderColor: nodeColor }} 
      />
    </div>
  );
});

export default CustomAgentNode;
