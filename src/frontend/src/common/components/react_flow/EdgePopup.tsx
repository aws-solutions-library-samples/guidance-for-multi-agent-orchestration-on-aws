/**
 * EdgePopup Component
 * 
 * This component renders a popup overlay for edges in a graph visualization.
 * It displays information about agent interactions and processing status.
 * 
 * Key features:
 * - Shows agent details like name, call count, and average duration
 * - Displays latest activity and processing status
 * - Renders a processing indicator with progress bar when an edge is active
 * - Provides a "View Details" button to see full trace information
 * - Handles both static display and active processing states
 * - Includes visual feedback like glowing effects for active agents
 * 
 * The component integrates with Cloudscape Design System components and
 * supports real-time updates for processing status, elapsed time tracking,
 * and multi-agent coordination visualization.
 */


import React, { useState, useEffect } from 'react';
import Popover from '@cloudscape-design/components/popover';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import Spinner from '@cloudscape-design/components/spinner';
import { formatDuration, getAgentColor} from './FlowUtils';
import { TraceGroup as TraceGroupType } from '../../../utilities/traceParser';

interface EdgePopupProps {
  edgeId: string;
  agentId: string;
  agentName: string;
  traceGroup?: TraceGroupType;
  isActive: boolean;
  callCount: number;
  avgDuration?: number;
  onViewDetails: () => void;
  // Processing indicator related props
  showProcessingIndicator?: boolean;
  targetNodePosition?: { x: number; y: number } | null;
  sourceNodePosition?: { x: number; y: number } | null;
  processingMessage?: string;
  currentStep?: number;
  totalSteps?: number;
  processingStartTime?: number;
  activeAgents?: Set<string>;
}

const EdgePopup: React.FC<EdgePopupProps> = ({
  edgeId,
  agentId,
  agentName,
  traceGroup,
  isActive,
  callCount,
  avgDuration,
  onViewDetails,
  // Processing indicator properties with defaults
  showProcessingIndicator = false,
  targetNodePosition = null,
  sourceNodePosition = null,
  processingMessage = 'Processing...',
  currentStep = 0,
  totalSteps = 5,
  processingStartTime = 0,
  activeAgents = new Set()
}) => {
  const agentColor = getAgentColor(agentId);

  // Add detailed console logging to diagnose edge ID issues
  console.log(`Rendering EdgePopup for edgeId: ${edgeId}, agentId: ${agentId}`);

  // For processing indicator - elapsed time tracking
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second for processing indicator
  useEffect(() => {
    if (!showProcessingIndicator || !isActive || !processingStartTime) return;

    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - processingStartTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, processingStartTime, showProcessingIndicator]);

  // Store trace data reference on component mount for debugging
  useEffect(() => {
    // Save reference to available trace data
    if (traceGroup && edgeId) {
      console.log(`EdgePopup mounted with trace data for edge ${edgeId}`, {
        edgeId,
        agentId,
        traceGroup: traceGroup ? {
          id: traceGroup.id,
          taskCount: traceGroup.tasks?.length || 0
        } : null,
        hasContent: !!traceGroup?.tasks?.some(t => t.content)
      });

      // Store a debug attribute for browser inspection
      document.documentElement.setAttribute(`data-debug-popup-${edgeId}`,
        `agent:${agentId},tasks:${traceGroup.tasks?.length || 0}`);
    }
  }, [edgeId, agentId, traceGroup]);

  const extractLatestActivity = () => {
    if (!traceGroup || !traceGroup.tasks || traceGroup.tasks.length === 0) {
      return 'No recent activity';
    }

    // Get the most recent task with content
    const recentTasks = traceGroup.tasks
      .filter(task => task.content)
      .sort((a, b) => {
        // Sort by timestamp if available, otherwise by task order
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

    if (recentTasks.length === 0) {
      return 'No content in recent tasks';
    }

    const latestTask = recentTasks[0];
    let content = '';

    if (typeof latestTask.content === 'string') {
      content = latestTask.content.substring(0, 150);
      if (latestTask.content.length > 150) content += '...';
    } else if (latestTask.content) {
      content = JSON.stringify(latestTask.content).substring(0, 150);
      if (JSON.stringify(latestTask.content).length > 150) content += '...';
    }

    return content || 'No text content available';
  };
  
  const getStepCount = () => {
    if (!traceGroup || !traceGroup.tasks) return 0;
    
    // Count all subtasks across all tasks
    let totalSteps = 0;
    traceGroup.tasks.forEach(task => {
      if (task.subTasks) {
        totalSteps += task.subTasks.length;
      }
    });
    
    return totalSteps;
  };
  
  const stepCount = getStepCount();
  const latestActivity = extractLatestActivity();
  
  // Render processing indicator if needed
  const renderProcessingIndicator = () => {
    // If we're not visible or don't have positions, don't render
    if (!showProcessingIndicator || !isActive || !targetNodePosition || !sourceNodePosition) {
      return null;
    }

    // Calculate the position for the indicator, which should be between the source and target
    const midpointX = (sourceNodePosition.x + targetNodePosition.x) / 2;
    const midpointY = (sourceNodePosition.y + targetNodePosition.y) / 2;

    // Calculate the angle for the arrow
    const angle = Math.atan2(
      targetNodePosition.y - sourceNodePosition.y,
      targetNodePosition.x - sourceNodePosition.x
    ) * (180 / Math.PI);

    // Generate a more detailed message with node IDs and active agents information
    let displayMessage = processingMessage;

    if (agentId) {
      // Format the agentId to be more readable
      const formattedNodeId = agentId.replace('-agent', '');

      // If we're in the final step/completion
      if (!isActive && currentStep >= totalSteps) {
        displayMessage = "Complete! Generating final response...";
      }
      // Regular processing message
      else {
        displayMessage = `${processingMessage} ${formattedNodeId}`;

        // Add active agent count if we have multiple agents
        if (activeAgents && activeAgents.size > 1) {
          displayMessage += ` (${activeAgents.size} active)`;
        }
      }
    }

    return (
      <div
        style={{
          position: 'absolute',
          top: midpointY,
          left: midpointX,
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 100,
          pointerEvents: 'none',
          opacity: 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
        data-nodrag
        className="processing-indicator processing-indicator-persistent"
      >
        {/* Arrow pointing to the target node */}
        <div style={{
          width: '30px',
          height: '20px',
          position: 'relative',
          transform: `rotate(${angle}deg)`,
          marginBottom: '8px',
        }} className="processing-indicator-arrow">
          <svg width="30" height="20" viewBox="0 0 30 20">
            <defs>
              <marker
                id={`arrowhead-${agentId}`}
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
              markerEnd={`url(#arrowhead-${agentId})`}
            />
          </svg>
        </div>

        {/* Loading indicator with message and progress info */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '4px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          fontSize: '14px',
          color: '#333',
          border: '1px solid #eaeaea',
          minWidth: '230px',
          justifyContent: 'center'
        }}>
          <div className="processing-indicator-dot"></div>
          <Spinner size="normal" />
          <Box variant="small">{displayMessage}</Box>
        </div>

        {/* Progress info */}
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
              status={!isActive ? "success" : "in-progress"}
              description={`Processing step ${currentStep} of ${totalSteps}`}
              additionalInfo={
                !isActive
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

  return (
    <React.Fragment>
      {/* Render processing indicator if needed */}
      {renderProcessingIndicator()}

      <Popover
        dismissButton={false}
        position="top"
        size="large"
        triggerType="custom"
        content={
        <Box padding="s">
          <SpaceBetween direction="vertical" size="s">
            <Box
              variant="h4"
              color={agentColor}
              padding={{ bottom: 'xxs' }}
              style={isActive ? { textShadow: `0 0 5px ${agentColor}80` } : {}}
            >
              {agentName}
              {isActive && (
                <StatusIndicator type="loading">
                  Processing {agentName}...
                </StatusIndicator>
              )}
            </Box>
            
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <span style={{ 
                backgroundColor: agentColor,
                color: 'white',
                fontSize: '12px',
                padding: '2px 6px',
                borderRadius: '50px',
                fontWeight: 'bold'
              }}>
                {callCount} call{callCount !== 1 ? 's' : ''}
              </span>
              
              {stepCount > 0 && (
                <span style={{
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  fontSize: '12px',
                  padding: '2px 6px',
                  borderRadius: '50px'
                }}>
                  {stepCount} step{stepCount !== 1 ? 's' : ''}
                </span>
              )}
              
              {avgDuration && (
                <span style={{
                  backgroundColor: '#e3f2fd',
                  color: '#1565c0',
                  fontSize: '12px',
                  padding: '2px 6px',
                  borderRadius: '50px'
                }}>
                  {formatDuration(avgDuration)}
                </span>
              )}
            </div>
            
            <div style={{
              padding: '8px',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px',
              fontSize: '13px',
              maxHeight: '120px',
              overflow: 'auto',
              border: '1px solid #eaeaea',
              marginBottom: '8px',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace'
            }}>
              {latestActivity}
            </div>
            
            <Button
              variant="primary"
              onClick={() => {
                console.log(`View details clicked for edgeId: ${edgeId}`);
                onViewDetails();
              }}
              iconName="external"
              fullWidth
              data-edge-id={edgeId} // Add data attribute for edge ID
            >
              View Full Trace Details
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          cursor: 'pointer',
          zIndex: 5
        }}
        data-edge-id={edgeId}
        aria-label={`Agent trace for ${agentName}`}
      />
    </Popover>
    </React.Fragment>
  );
};

export default EdgePopup;