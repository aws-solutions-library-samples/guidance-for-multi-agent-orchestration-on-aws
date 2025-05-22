import React, { useEffect, useState } from 'react';
import { Spinner } from "@cloudscape-design/components";
import Box from "@cloudscape-design/components/box";
import { TraceGroup as TraceGroupType } from '../../../utilities/traceParser';
import { getSafeTraceGroups, getNewestTraceGroup } from '../../../utilities/safeTraceUtils';

interface ActivityStatusLoaderProps {
  traceState: any;
  isLoading: boolean;
}

/**
 * A component that displays a loading spinner with the latest agent activity
 * Updates continuously as new trace data is received
 */
const ActivityStatusLoader: React.FC<ActivityStatusLoaderProps> = ({ traceState, isLoading }) => {
  const [statusText, setStatusText] = useState("Analyzing your question and preparing a response...");
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  useEffect(() => {
    // Update the status text based on the latest trace activity
    if (!isLoading || !traceState?.messages) return;

    // Force update every 300ms to ensure the UI always shows the latest activity
    // This is more responsive than the default 500ms, ensuring we catch all trace updates
    const updateTimer = setInterval(() => {
      setLastUpdated(Date.now());
      console.log('🔄 Activity status refresh: Agent status refreshed');
    }, 300);

    // Cleanup
    return () => {
      clearInterval(updateTimer);
    };
  }, [isLoading, traceState]);

  const getActivityStatus = () => {
    if (!traceState?.messages?.length) {
      return "Analyzing your question and preparing a response...";
    }

    // Use our type-safe utility to get the newest trace group
    const latestGroup = getNewestTraceGroup(traceState.messages);
    
    if (!latestGroup) {
      return "Processing your request...";
    }
    
    // Get the latest task from the group
    const tasks = latestGroup.tasks || [];
    const latestTask = tasks.length > 0 ? tasks[tasks.length - 1] : null;
    
    // Format agent name nicely
    const agentName = latestGroup.originalAgentType || latestGroup.dropdownTitle?.split(' ')[0] || 'Agent';
    
    // If we have a task, show agent -> task info
    if (latestTask) {
      // Check if this is a final response task
      const isFinalResponse = 
          latestTask.title.includes("Final Response") ||
          (latestTask.content && typeof latestTask.content === 'string' && 
          (latestTask.content.includes("Can I help you with anything else?") ||
           latestTask.content.includes("Is there anything else") ||
           latestTask.content.includes("In conclusion") ||
           latestTask.content.includes("To summarize")));
      
      if (isFinalResponse) {
        // If it's a final response, show a generic message instead
        return `${agentName} → Finalizing response...`;
      }
      
      // Extract step number if present
      const stepMatch = latestTask.title.match(/Step (\d+(?:\.\d+)?)/);
      const stepInfo = stepMatch ? stepMatch[0] : '';
      
      // Create a more readable task description
      let taskDesc = latestTask.title
          .replace(/Step \d+(?:\.\d+)?/, '')  // Remove step number
          .replace(/\([^)]*\)/g, '')          // Remove anything in parentheses
          .trim();
          
      // If task description is too long, truncate it
      if (taskDesc.length > 40) {
          taskDesc = taskDesc.substring(0, 37) + '...';
      }
      
      return `${agentName} → ${stepInfo}${stepInfo ? ': ' : ''}${taskDesc}`;
    }
                                        
    // Fallback if no specific task info is available
    return `${agentName} → Processing...`;
  };

  if (!isLoading) return null;

  return (
    <Box padding="s" textAlign="center" margin={{ top: "l" }}>
      <Spinner size="normal" />
      <Box padding="s" color="text-status-inactive" fontSize="body-s">
        {getActivityStatus()}
        <div style={{ fontSize: '0px', opacity: 0 }}>{lastUpdated}</div>
      </Box>
    </Box>
  );
};

export default ActivityStatusLoader;
