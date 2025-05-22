/*
 * TraceView Component
 * 
 * A React component that displays trace/logging information from agent interactions.
 * Key features:
 * - Renders a collapsible view of agent tasks and their details
 * - Color codes different agent types (order, product, personalization etc)
 * - Supports compact and full viewing modes
 * - Formats and pretty-prints task content (JSON/text)
 * - Shows completion status and execution time
 * - Allows expanding/collapsing individual task details
 */
import React, { useState } from 'react';
import { TraceGroup } from '../../../utilities/traceParser';
import { agentColors } from './FlowUtils';
import './FlowComponents.css';

interface TraceViewProps {
  traceGroup: TraceGroup;
  compact?: boolean;
  maxHeight?: number;
}

const TraceView: React.FC<TraceViewProps> = ({ 
  traceGroup, 
  compact = false,
  maxHeight = 300
}) => {
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});

  // Toggle expanded state for a task
  const toggleTaskExpanded = (taskIndex: number) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskIndex]: !prev[taskIndex]
    }));
  };

  // Skip empty or null trace groups
  if (!traceGroup || !traceGroup.tasks || traceGroup.tasks.length === 0) {
    return (
      <div className="trace-view-empty">
        No trace data available
      </div>
    );
  }

  // Get completion status and time info
  const isComplete = 'isComplete' in traceGroup ? traceGroup.isComplete : true;
  const finalTime = 'finalElapsedTime' in traceGroup ? traceGroup.finalElapsedTime : '?';
  
  // Determine the agent color based on agentId or originalAgentType if available
  const getHeaderColor = () => {
    const agentId = traceGroup.agentId || '';
    
    // First try direct mapping by agentId
    if (agentId && agentColors[agentId]) {
      return agentColors[agentId];
    }
    
    // Try to infer from agentId string
    if (agentId) {
      if (agentId.includes('order')) return agentColors['order-mgmt-agent'];
      if (agentId.includes('product')) return agentColors['product-rec-agent'];
      if (agentId.includes('personal')) return agentColors['personalization-agent'];
      if (agentId.includes('trouble')) return agentColors['ts-agent'];
      if (agentId.includes('routing') || agentId.includes('classifier')) return agentColors['routing-classifier'];
      if (agentId.includes('supervisor')) return agentColors['supervisor-agent'];
    }
    
    // Try to infer from original agent type
    const agentType = traceGroup.originalAgentType || '';
    if (agentType) {
      const normalizedType = agentType.toLowerCase();
      if (normalizedType.includes('order')) return agentColors['order-mgmt-agent'];
      if (normalizedType.includes('product')) return agentColors['product-rec-agent'];
      if (normalizedType.includes('personal')) return agentColors['personalization-agent'];
      if (normalizedType.includes('trouble')) return agentColors['ts-agent'];
      if (normalizedType.includes('routing') || normalizedType.includes('classifier')) return agentColors['routing-classifier'];
      if (normalizedType.includes('supervisor')) return agentColors['supervisor-agent'];
    }
    
    // Default color if no match
    return agentColors.default;
  };
  
  const headerColor = getHeaderColor();

  // Format trace content for display
  const formatContent = (content: string | object | undefined) => {
    if (!content) return '—';

    try {
      // If content is already a string, try to format it
      if (typeof content === 'string') {
        // Check if it's JSON
        if (
          (content.startsWith('{') && content.endsWith('}')) ||
          (content.startsWith('[') && content.endsWith(']'))
        ) {
          try {
            const parsed = JSON.parse(content);
            return <pre>{JSON.stringify(parsed, null, 2)}</pre>;
          } catch (e) {
            // Not valid JSON, show as is
            return <pre>{content}</pre>;
          }
        }
        // Plain text
        return <pre>{content}</pre>;
      }
      // If it's an object, pretty print it
      else {
        return <pre>{JSON.stringify(content, null, 2)}</pre>;
      }
    } catch (e) {
      // Fallback if anything goes wrong
      return <pre>Error formatting content</pre>;
    }
  };

  // Only show relevant tasks if in compact mode
  const tasksToShow = compact
    ? traceGroup.tasks.filter(task => 
        // Filter out empty tasks and purely instrumental tasks
        task.content && 
        !task.title.includes('Model Invocation Input') &&
        !task.title.includes('Initializing')
      ).slice(0, 3) // Show at most 3 tasks in compact mode
    : traceGroup.tasks;

  return (
    <div className={`trace-view ${compact ? 'compact' : ''}`} style={{ maxHeight }}>
      {/* Trace group header */}
      <div 
        className="trace-group-header"
        style={{ backgroundColor: headerColor }}
      >
        {traceGroup.dropdownTitle || 'Agent Trace'}
        {isComplete && (
          <span className="trace-completion-badge">
            {finalTime ? `${finalTime}s` : 'Complete'}
          </span>
        )}
      </div>

      {/* Tasks list */}
      <div className="trace-tasks">
        {tasksToShow.length === 0 ? (
          <div className="trace-empty-state">No relevant trace data available</div>
        ) : (
          tasksToShow.map((task, index) => (
            <div 
              key={`task-${index}-${task.title}`} 
              className={`trace-task ${expandedTasks[index] ? 'expanded' : ''}`}
              onClick={() => toggleTaskExpanded(index)}
            >
              <div className="trace-task-header">
                <div className="trace-task-title">
                  {task.title}
                </div>
                <div className="trace-task-expand">
                  {expandedTasks[index] ? '−' : '+'}
                </div>
              </div>
              
              {expandedTasks[index] && (
                <div className="trace-task-content">
                  {formatContent(task.content)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Show a "See more" link if in compact mode and there's more */}
      {compact && traceGroup.tasks.length > tasksToShow.length && (
        <div className="trace-see-more">
          {traceGroup.tasks.length - tasksToShow.length} more steps...
        </div>
      )}
    </div>
  );
};

export default TraceView;
