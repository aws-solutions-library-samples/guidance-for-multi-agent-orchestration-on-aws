
/**
 * TraceModal Component
 * 
 * This React component renders a modal dialog that displays detailed trace information for agents in a system.
 * It shows execution details like start time, duration, completion status, and step-by-step trace data.
 * The modal has different views for customer/browser traces vs agent traces, and includes both formatted
 * trace steps and raw data views. It uses Cloudscape Design System components for the UI.
 */
import React, { useState, useMemo } from 'react';
import Modal from '@cloudscape-design/components/modal';
import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import Tabs from '@cloudscape-design/components/tabs';
import Badge from '@cloudscape-design/components/badge';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import { TraceGroup as TraceGroupType } from '../../../utilities/traceParser';
import TraceGroup from './TraceGroup'; // Import the TraceGroup component
import './FlowComponents.css';

interface TraceModalProps {
  visible: boolean;
  onDismiss: () => void;
  traceGroup: TraceGroupType | null;
  nodeName: string;
  nodeId: string;
  nodeDescription?: string; // New prop for agent description
}

const TraceModal: React.FC<TraceModalProps> = ({
  visible,
  onDismiss,
  traceGroup,
  nodeName,
  nodeId,
  nodeDescription
}) => {
  // State for expanded tasks
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  
  // Toggle expanded state for a task
  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Get the formatted agent name
  const agentName = useMemo(() => {
    // If we have a trace group, try to use its original agent type
    if (traceGroup?.originalAgentType) {
      return traceGroup.originalAgentType;
    }
    
    // Otherwise use the node name or ID
    return nodeName || nodeId.replace(/-agent$/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, [nodeName, nodeId, traceGroup]);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // No longer need formatContent function since we're using the TraceGroup component

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header={
        <SpaceBetween direction="horizontal" size="xs">
          <div>Trace Details</div>
          {traceGroup?.isComplete ? (
            <Badge color="green">Complete</Badge>
          ) : (
            <Badge color="blue">Processing</Badge>
          )}
        </SpaceBetween>
      }
      size="large"
      closeAriaLabel="Close trace modal"
    >
      <div className="trace-modal-content">
        {!traceGroup ? (
          <Box color="text-status-inactive">
            No trace data available for this agent
          </Box>
        ) : nodeId === 'customer' ? (
          <SpaceBetween size="l">
            <div className="trace-overview">
              <SpaceBetween size="m">
                <Box>
                  <SpaceBetween direction="horizontal" size="l">
                    <div>
                      <Box variant="awsui-key-label">Browser</Box>
                      <Box variant="awsui-value-large">{nodeName || "Browser"}</Box>
                    </div>
                    {traceGroup.startTime && (
                      <div>
                        <Box variant="awsui-key-label">Start Time</Box>
                        <Box variant="awsui-value-large">{formatTime(traceGroup.startTime)}</Box>
                      </div>
                    )}
                    {traceGroup.finalElapsedTime && (
                      <div>
                        <Box variant="awsui-key-label">Duration</Box>
                        <Box variant="awsui-value-large">{traceGroup.finalElapsedTime}s</Box>
                      </div>
                    )}
                  </SpaceBetween>
                  <Box padding={{ top: 'l' }}>
                    <Box variant="awsui-key-label">Description</Box>
                    <Box variant="p">Shows both messages sent from the browser and responses received by the browser</Box>
                  </Box>
                </Box>
              </SpaceBetween>
            </div>
            
            <Tabs
              tabs={[
                {
                  id: "browser-messages",
                  label: "Browser Messages",
                  content: (
                    <div className="trace-steps">
                      {traceGroup.tasks?.length ? (
                        <TraceGroup 
                          traceGroup={traceGroup} 
                          hideTitle={true} 
                          autoExpand={true}
                        />
                      ) : (
                        <Box color="text-status-inactive" textAlign="center">
                          No trace steps available
                        </Box>
                      )}
                    </div>
                  ),
                },
                {
                  id: "raw-data",
                  label: "Raw Data",
                  content: (
                    <pre className="trace-raw-data">
                      {JSON.stringify(traceGroup, null, 2)}
                    </pre>
                  ),
                }
              ]}
            />
          </SpaceBetween>
        ) : (
          <SpaceBetween size="l">
            <div className="trace-overview">
              <SpaceBetween size="m">
                {/* Agent info section with name and description */}
                <Box>
                  <SpaceBetween direction="horizontal" size="l">
                    <div>
                      <Box variant="awsui-key-label">Agent</Box>
                      <Box variant="awsui-value-large">{agentName}</Box>
                    </div>
                    {traceGroup.startTime && (
                      <div>
                        <Box variant="awsui-key-label">Start Time</Box>
                        <Box variant="awsui-value-large">{formatTime(traceGroup.startTime)}</Box>
                      </div>
                    )}
                    {traceGroup.finalElapsedTime && (
                      <div>
                        <Box variant="awsui-key-label">Duration</Box>
                        <Box variant="awsui-value-large">{traceGroup.finalElapsedTime}s</Box>
                      </div>
                    )}
                    {traceGroup.isComplete !== undefined && (
                      <div>
                        <Box variant="awsui-key-label">Status</Box>
                        <Box variant="awsui-value-large">
                          <StatusIndicator type={traceGroup.isComplete ? "success" : "in-progress"}>
                            {traceGroup.isComplete ? "Complete" : "Processing"}
                          </StatusIndicator>
                        </Box>
                      </div>
                    )}
                  </SpaceBetween>

                  {/* Agent description displayed below the agent info */}
                  {nodeDescription && (
                    <Box padding={{ top: 'l' }}>
                      <Box variant="awsui-key-label">Description</Box>
                      <Box variant="p">{nodeDescription}</Box>
                    </Box>
                  )}
                </Box>
              </SpaceBetween>
            </div>

            <Tabs
              tabs={[
                {
                  id: "trace-steps",
                  label: "Trace Steps",
                  content: (
                    <div className="trace-steps">
                      {traceGroup.tasks?.length ? (
                        <TraceGroup 
                          traceGroup={traceGroup} 
                          hideTitle={true} 
                          autoExpand={true} 
                        />
                      ) : (
                        <Box color="text-status-inactive" textAlign="center">
                          No trace steps available
                        </Box>
                      )}
                    </div>
                  ),
                },
                {
                  id: "raw-data",
                  label: "Raw Data",
                  content: (
                    <pre className="trace-raw-data">
                      {JSON.stringify(traceGroup, null, 2)}
                    </pre>
                  ),
                }
              ]}
            />
          </SpaceBetween>
        )}
      </div>
    </Modal>
  );
};

export default TraceModal;
