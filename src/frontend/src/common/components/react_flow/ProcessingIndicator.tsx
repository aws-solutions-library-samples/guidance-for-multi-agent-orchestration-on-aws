/**
 * ProcessingIndicator Component
 * 
 * A React component that displays a visual indicator for processing/loading states between nodes.
 * Features:
 * - Shows an animated arrow between source and target nodes
 * - Displays a loading spinner with customizable message
 * - Tracks progress with a progress bar
 * - Shows elapsed time and current step
 * - Supports multiple active agents tracking
 * - Provides visual feedback for processing completion
 * - Positions itself dynamically between source and target nodes
 */
import React, { useEffect, useState } from 'react';
import Spinner from '@cloudscape-design/components/spinner';
import Box from '@cloudscape-design/components/box';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import StatusIndicator from '@cloudscape-design/components/status-indicator';

interface ProcessingIndicatorProps {
  targetNodeId: string | null;
  targetNodePosition: { x: number; y: number } | null;
  sourceNodeId: string | null;
  sourceNodePosition: { x: number; y: number } | null;
  message?: string;
  isVisible: boolean;
  // Optional progress tracking properties
  currentStep?: number;
  totalSteps?: number;
  processingStartTime?: number;
  isQueryActive?: boolean;
  // Active agents tracking
  activeAgents?: Set<string>;
}

const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
  targetNodeId,
  targetNodePosition,
  sourceNodeId,
  sourceNodePosition,
  message = 'Processing...',
  isVisible,
  currentStep = 0,
  totalSteps = 5,
  processingStartTime = 0,
  isQueryActive = true,
  activeAgents = new Set()
}) => {
  // If we're not visible or don't have positions, don't render
  if (!isVisible || !targetNodePosition || !sourceNodePosition) {
    return null;
  }

  // Use local state to ensure smooth animation and transitions
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (!isQueryActive || !processingStartTime) return;

    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - processingStartTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isQueryActive, processingStartTime]);

  // Calculate the position for the indicator, which should be between the source and target
  const midpointX = (sourceNodePosition.x + targetNodePosition.x) / 2;
  const midpointY = (sourceNodePosition.y + targetNodePosition.y) / 2;

  // Calculate the angle for the arrow
  const angle = Math.atan2(
    targetNodePosition.y - sourceNodePosition.y,
    targetNodePosition.x - sourceNodePosition.x
  ) * (180 / Math.PI);

  // Styling for the container - persist with no fadeout animation
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: midpointY,
    left: midpointX,
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 100,
    pointerEvents: 'none', // Don't interfere with interactions
    opacity: 1, // Stay fully visible
    transition: 'opacity 0.3s ease-in-out' // Smooth transition for any changes
  };

  // Styling for the arrow
  const arrowStyle: React.CSSProperties = {
    width: '30px',
    height: '20px',
    position: 'relative',
    transform: `rotate(${angle}deg)`,
    marginBottom: '8px',
  };

  // Styling for the indicator - enhanced visibility
  const indicatorStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // More opaque
    borderRadius: '16px',
    padding: '4px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)', // Enhanced shadow
    fontSize: '14px',
    color: '#333',
    border: '1px solid #eaeaea',
    minWidth: '230px', // More space for messages
    justifyContent: 'center'
  };

  // Generate a more detailed message with node IDs and active agents information
  let displayMessage = message;

  if (targetNodeId) {
    // Format the targetNodeId to be more readable
    const formattedNodeId = targetNodeId.replace('-agent', '');

    // If we're in the final step/completion
    if (!isQueryActive && currentStep >= totalSteps) {
      displayMessage = "Complete! Generating final response...";
    }
    // Regular processing message
    else {
      displayMessage = `${message} ${formattedNodeId}`;

      // Add active agent count if we have multiple agents
      if (activeAgents && activeAgents.size > 1) {
        displayMessage += ` (${activeAgents.size} active)`;
      }
    }
  }

  return (
    <div
      style={containerStyle}
      data-nodrag
      className="processing-indicator processing-indicator-persistent"
    >
      {/* Arrow pointing to the target node */}
      <div style={arrowStyle} className="processing-indicator-arrow">
        <svg width="30" height="20" viewBox="0 0 30 20">
          <defs>
            <marker
              id={`arrowhead-${targetNodeId}`} // Make ID unique
              markerWidth="10"
              markerHeight="7"
              refX="0"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#1890ff" />
            </marker>
          </defs>
          <line
            x1="0"
            y1="10"
            x2="30"
            y2="10"
            stroke="#1890ff"
            strokeWidth="2"
            markerEnd={`url(#arrowhead-${targetNodeId})`}
          />
        </svg>
      </div>

      {/* Loading indicator with message and progress info */}
      <div style={indicatorStyle}>
        <div className="processing-indicator-dot"></div>
        <Spinner size="normal" />
        <Box variant="small">{displayMessage}</Box>
      </div>

      {/* Progress info - enhanced with more details */}
      {totalSteps > 0 && (
        <div style={{
          marginTop: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 12px',
          borderRadius: '8px',
          boxShadow: '0 3px 10px rgba(0, 0, 0, 0.18)',
          width: '260px',
          border: '1px solid #eaeaea'
        }}>
          <ProgressBar
            value={Math.min(100, (currentStep / totalSteps) * 100)}
            status={!isQueryActive ? "success" : "in-progress"}
            description={`Processing step ${currentStep} of ${totalSteps}`}
            additionalInfo={
              !isQueryActive
                ? "Complete"
                : processingStartTime > 0
                  ? `Elapsed: ${elapsedTime}s`
                  : undefined
            }
          />

          {/* List active agents when there are multiple */}
          {activeAgents && activeAgents.size > 1 && (
            <div style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#555'
            }}>
              <Box variant="small">
                <StatusIndicator type="info">
                  {Array.from(activeAgents).map(agent =>
                    agent.replace('-agent', '')
                  ).join(', ')}
                </StatusIndicator>
              </Box>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProcessingIndicator;