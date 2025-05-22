/**
 * CustomEdge Component
 * 
 * This component renders a custom edge for a React Flow diagram that visualizes connections between nodes.
 * Key features:
 * - Renders bezier curve paths between source and target nodes
 * - Supports hover interactions and click events
 * - Shows popup with edge details on hover when trace data exists
 * - Displays edge labels
 * - Handles active/inactive states with animations
 * - Integrates with trace data to show call counts and durations
 * - Automatically activates when connected nodes are in processing state
 * - Customizable styling based on edge state (active, hover, etc)
 * 
 * The component is used to visualize connections and data flow between different agents
 * in a system, with support for metrics and interactive features.
 */
import React, { useState, useEffect, useMemo } from 'react';
import './FlowComponents.css';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import EdgePopup from './EdgePopup';
import { TraceGroup } from '../../../utilities/traceParser';

interface CustomEdgeProps extends EdgeProps {
  data?: {
    label?: string;
    traceGroup?: TraceGroup;
    callCount?: number;
    avgDuration?: number;
    isActive?: boolean;
    agentName?: string;
  };
  onViewDetails?: (edgeId: string) => void;
}

const CustomEdge: React.FC<CustomEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  onViewDetails
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  
  // Reference to the path element for direct DOM manipulation
  const pathRef = React.useRef<SVGPathElement>(null);
  
  const edgePathParams = useMemo(() => {
    const params = {
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition
    };
    
    return params;
  }, [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]);
  
  // Get path coordinates for the flow edge
  const [edgePath, labelX, labelY] = getBezierPath(edgePathParams);
  
  // Extract target agent ID from edge ID
  const getAgentId = () => {
    // Extract from edge ID format e-supervisor-sa#
    if (id.startsWith('e-supervisor-sa')) {
      const agentNum = id.split('sa')[1];
      switch (agentNum) {
        case '1': return 'order-mgmt-agent';
        case '2': return 'product-rec-agent'; 
        case '3': return 'personalization-agent';
        case '4': return 'ts-agent';
        default: return '';
      }
    }
    
    // For other formats, extract from the target prop if available
    return '';
  };
  
  const agentId = getAgentId();
  const agentName = data?.agentName || (
    agentId === 'order-mgmt-agent' ? 'Order Management Agent' :
    agentId === 'product-rec-agent' ? 'Product Recommendation Agent' :
    agentId === 'personalization-agent' ? 'Personalization Agent' :
    agentId === 'ts-agent' ? 'Troubleshooting Agent' :
    'Agent'
  );
  
  // Enhanced styling for active or highlighted edges
  const edgeStyles = useMemo(() => {
    const baseStyles = {
      ...style,
      strokeWidth: data?.isActive || isHovered ? 3 : style.strokeWidth || 2,
      cursor: 'pointer',
      opacity: isHovered ? 0.9 : 0.75,
      stroke: data?.isActive ? '#2196F3' : style.stroke // Use blue color for active edges
    };

    return baseStyles;
  }, [style, data?.isActive, isHovered]);
  
  // Effect to force class application when isActive changes and ensure
  // animation is applied correctly
  useEffect(() => {
    if (pathRef.current) {
      if (data?.isActive) {
        // Add the animation class directly to DOM element
        pathRef.current.classList.add('active');
        console.log(`Applied active class to edge ${id}`);
      } else {
        // Remove the animation class
        pathRef.current.classList.remove('active');
      }
    }
    
    // Get the source and target node elements
    const sourceNode = document.getElementById(sourceX ? `${id}-source` : id.split('-')[1]);
    const targetNode = document.getElementById(targetX ? `${id}-target` : id.split('-')[2]);
    
    // Check if either connected node has the processing class
    if (sourceNode?.classList.contains('node-processing') || 
        targetNode?.classList.contains('node-processing')) {
      // If connected node is processing, ensure this edge is active
      if (pathRef.current && !pathRef.current.classList.contains('active')) {
        pathRef.current.classList.add('active');
        console.log(`Edge ${id} activated due to connected node in processing state`);
      }
    }
  }, [data?.isActive, id, sourceX, targetX]);
  
  const handleClick = () => {
    if (data?.callCount && data.callCount > 0) {
      onViewDetails?.(id);
    }
  };
  
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (data?.callCount && data.callCount > 0) {
      setShowPopup(true);
    }
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowPopup(false);
  };

  return (
    <>
      <path
        ref={pathRef}
        id={id}
        className={`react-flow__edge-path ${data?.isActive ? 'active' : ''}`}
        d={edgePath}
        markerEnd={markerEnd}
        style={edgeStyles}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        data-active={data?.isActive ? 'true' : 'false'} // Add data attribute for easier debugging
      />
      
      {/* Edge Label */}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              backgroundColor: style.stroke || '#555',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              opacity: 0.75,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              zIndex: 1000,
              textAlign: 'center',
              minWidth: '60px'
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
      
      {/* Popup on hover, only shown when there's trace data */}
      {showPopup && data?.callCount && data.callCount > 0 && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -100%) translate(${labelX}px,${labelY - 10}px)`,
              pointerEvents: 'all',
              zIndex: 1001
            }}
          >
            <EdgePopup
              edgeId={id}
              agentId={agentId}
              agentName={agentName}
              traceGroup={data?.traceGroup}
              isActive={!!data?.isActive}
              callCount={data.callCount}
              avgDuration={data.avgDuration}
              onViewDetails={() => onViewDetails?.(id)}
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default CustomEdge;
