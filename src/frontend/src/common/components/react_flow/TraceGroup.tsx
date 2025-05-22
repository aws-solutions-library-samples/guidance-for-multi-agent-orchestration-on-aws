/*
 * TraceGroup Component
 * 
 * This React component renders a collapsible UI element that displays execution traces
 * from AI agents in a chat interface. Key features include:
 * 
 * - Displays agent execution traces in an expandable/collapsible format
 * - Shows agent name, LLM model used, execution time and number of steps
 * - Supports nested task and subtask hierarchies with expandable sections
 * - Special handling for Knowledge Base and Action Group operations
 * - Color coding for different agent types
 * - Formats and displays various content types (JSON, plain text, KB responses)
 * - Integrates with workflow diagrams via custom events
 * - Supports auto-expansion mode for workflow integration
 */
import React, { useState, useEffect } from 'react';
import { TraceGroup as TraceGroupType, Task } from '../../../utilities/traceParser';
import { collaboratorToNodeId, normalizeTraceGroup } from '../../../utilities/agentTraceStorage';
import { getAgentColor } from './FlowUtils';
import './FlowComponents.css';

interface TraceGroupProps {
  traceGroup: TraceGroupType;
  hideTitle?: boolean; // Optional prop to hide the title (for workflow diagram)
  autoExpand?: boolean; // Optional prop to auto-expand content and skip dropdown interaction
}

// This is a wrapper component to render trace groups in the chat UI
const TraceGroup: React.FC<TraceGroupProps> = ({ traceGroup, hideTitle = false, autoExpand = false }) => {
  const [expanded, setExpanded] = useState(autoExpand);
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>(
    // When autoExpand is true, auto-expand the first task
    autoExpand && traceGroup?.tasks?.length > 0 ? { 0: true } : {}
  );
  
  // Track expanded state of subtasks
  const [expandedSubTasks, setExpandedSubTasks] = useState<Record<string, boolean>>({});

  // Process trace group to ensure consistent structure
  const processedTraceGroup = normalizeTraceGroup(traceGroup);
  
  // Skip invalid trace groups
  if (!processedTraceGroup || !processedTraceGroup.tasks || 
      !Array.isArray(processedTraceGroup.tasks) || processedTraceGroup.tasks.length === 0) {
    return null;
  }

  // Toggle expanded state
  const toggleExpanded = () => {
    const newExpandedState = !expanded;
    setExpanded(newExpandedState);
    
    // Dispatch an event when a trace group is expanded
    // This will be picked up by the flow diagram to activate animations
    if (newExpandedState && traceGroup) {
      console.log(`TraceGroup expanded: ${traceGroup.originalAgentType || 'unknown'}`);
      const traceGroupExpandedEvent = new CustomEvent('traceGroupExpanded', {
        detail: {
          traceGroup,
          timestamp: Date.now()
        }
      });
      document.dispatchEvent(traceGroupExpandedEvent);
    }
  };

  // Effect to notify the flow panel about this trace group when it's first rendered
  useEffect(() => {
    if (traceGroup && (autoExpand || expanded)) {
      // When trace group is auto-expanded or manually expanded, notify flow diagram
      const nodeId = traceGroup.agentId || 
                   (traceGroup.originalAgentType ? collaboratorToNodeId(traceGroup.originalAgentType) : null);
      
      if (nodeId) {
        console.log(`TraceGroup mounted/expanded: ${traceGroup.originalAgentType || 'unknown'} -> ${nodeId}`);
        const traceGroupActivateEvent = new CustomEvent('agentNodeUpdate', {
          detail: {
            nodeId,
            traceGroup,
            isProcessing: true,
            source: 'trace-group'
          }
        });
        document.dispatchEvent(traceGroupActivateEvent);
      }
    }
  }, [traceGroup, expanded, autoExpand]);

  // Toggle expanded state for a task
  const toggleTaskExpanded = (taskIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks(prev => ({
      ...prev,
      [taskIndex]: !prev[taskIndex]
    }));
  };
  
  // Toggle expanded state for a subtask
  const toggleSubTaskExpanded = (taskIndex: number, subTaskIndex: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${taskIndex}-${subTaskIndex}`;
    setExpandedSubTasks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Helper to check if a subtask title matches certain patterns
  const isActionGroupInput = (title: string) => title.toLowerCase().includes('action group input');
  const isActionGroupOutput = (title: string) => title.toLowerCase().includes('action group output') || 
                                               title.toLowerCase().includes('action group result');
  const isKnowledgeBaseInput = (title: string) => title.toLowerCase().includes('knowledge base input') || 
                                                title.toLowerCase().includes('knowledge base query');
  const isKnowledgeBaseOutput = (title: string) => title.toLowerCase().includes('knowledge base output') || 
                                                 title.toLowerCase().includes('knowledge base results');

  // Get the relevant information from the processed trace group
  // Extract agent name and hardcode LLM for each agent type
  let title = processedTraceGroup.dropdownTitle || 'Agent Trace';
  let agentName = '';
  
  // Extract just the agent name from the title
  if (title.includes('(')) {
    const nameMatch = title.match(/(.*?)\s*\(/);
    if (nameMatch && nameMatch[1]) {
      agentName = nameMatch[1].trim();
    } else {
      agentName = title.trim();
    }
  } else if (title.includes('s')) {
    // Match the pattern "Something (Something) 1.23s" and keep just the first part
    const titleMatch = title.match(/(.*)\s+\d+\.\d+s/);
    if (titleMatch && titleMatch[1]) {
      agentName = titleMatch[1].trim();
    } else {
      agentName = title.trim();
    }
  } else {
    agentName = title.trim();
  }
  
  // Hardcode the LLM for each agent type
  const getHardcodedLLM = (agentType: string | undefined): string => {
    if (!agentType) return 'Claude 3';
    
    const normalizedType = agentType.toLowerCase();
    
    if (normalizedType.includes('super') || normalizedType === 'supervisor') {
      return 'Nova Pro';
    } else if (normalizedType.includes('routing') || normalizedType.includes('classifier')) {
      return 'Nova Micro';
    } else if (normalizedType.includes('product') || normalizedType.includes('recommendation')) {
      return 'Claude 3.5 Haiku';
    } else if (normalizedType.includes('trouble')) {
      return 'Claude 3 Sonnet';
    } else if (normalizedType.includes('personal')) {
      return 'Claude 3.5 Sonnet v1';
    } else if (normalizedType.includes('order') || normalizedType.includes('management')) {
      return 'Claude 3 Sonnet';
    }
    
    return 'Claude 3';
  };
  
  // Create static title with agent name and hardcoded LLM
  const hardcodedLLM = getHardcodedLLM(traceGroup.originalAgentType);
  title = `${agentName} (${hardcodedLLM})`;
  const tasks = traceGroup.tasks || [];
  const isComplete = 'isComplete' in traceGroup ? traceGroup.isComplete : false;
  
  // Calculate elapsed time dynamically
  const startTime = processedTraceGroup.startTime || Date.now();
  const totalElapsedSeconds = isComplete && processedTraceGroup.finalElapsedTime 
    ? processedTraceGroup.finalElapsedTime 
    : ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Find the maximum step number instead of just counting array length
  const stepCount = processedTraceGroup.tasks.length > 0
    ? Math.max(...processedTraceGroup.tasks
        .filter(task => task.stepNumber > 0)
        .map(task => task.stepNumber))
    : 0;
  
  // Use the dynamically calculated time with the correct step count
  const timeDisplay = `${totalElapsedSeconds} seconds (${stepCount} steps)`;

  // Helper to extract time value from formatted time string
  const extractTimeValue = (timeString: string): number => {
    const match = timeString.match(/\((\d+\.\d+)s\)/);
    return match ? parseFloat(match[1]) : 0;
  };

  // Format trace content for display
  const formatContent = (content: string | object | undefined) => {
    if (!content) return null;

    try {
      // If content is already a string, try to format it
      if (typeof content === 'string') {
        // Special handling for knowledge base responses
        if (content.includes('### KNOWLEDGE BASE RESPONSE ###')) {
          const sections = content.split('---');
          return (
            <div className="kb-response">
              <h4 style={{marginTop: 0, color: '#FF5722', fontWeight: 'bold'}}>Knowledge Base Results</h4>
              {sections.map((section, idx) => {
                // Extract source if available
                const sourceMatch = section.match(/Source: ([^\n]+)/);
                const source = sourceMatch ? sourceMatch[1] : null;
                
                // Remove the header and reference line for cleaner display
                const cleanedSection = section
                  .replace(/### KNOWLEDGE BASE RESPONSE ###/, '')
                  .replace(/Reference \d+:/, '')
                  .replace(/Source: [^\n]+/, '')
                  .trim();
                
                return (
                  <div key={idx} className="kb-section" style={{marginBottom: '10px', padding: '8px', borderLeft: '3px solid #FF5722', backgroundColor: '#FFF3E0'}}>
                    {source && <div style={{fontWeight: 'bold', marginBottom: '4px', fontSize: '12px'}}>Source: {source}</div>}
                    <div style={{whiteSpace: 'pre-wrap'}}>{cleanedSection}</div>
                  </div>
                );
              })}
            </div>
          );
        }
        
        // Check if it's JSON
        if (
          (content.startsWith('{') && content.endsWith('}')) ||
          (content.startsWith('[') && content.endsWith(']'))
        ) {
          try {
            const parsed = JSON.parse(content);
            return <pre className="trace-content-json">{JSON.stringify(parsed, null, 2)}</pre>;
          } catch (e) {
            // Not valid JSON, show as is
            return <pre className="trace-content-text">{content}</pre>;
          }
        }
        // Plain text
        return <pre className="trace-content-text">{content}</pre>;
      }
      // If it's an object, pretty print it
      else {
        return <pre className="trace-content-json">{JSON.stringify(content, null, 2)}</pre>;
      }
    } catch (e) {
      // Fallback if anything goes wrong
      return <div className="trace-content-error">Error formatting content</div>;
    }
  };

  // Direct mapping for agent trace colors
  const mapAgentTypeToColor = (agentType: string | undefined): string => {
    if (!agentType) return '#2196F3'; // Default blue
    
    const normalizedType = agentType.toLowerCase();
    
    if (normalizedType.includes('super') || normalizedType === 'supervisor') {
      return '#9C27B0'; // Purple for SupervisorAgent
    } else if (normalizedType.includes('routing') || normalizedType.includes('classifier') || normalizedType === 'routing_classifier') {
      return '#4CAF50'; // Green for ROUTING_CLASSIFIER
    } else if (normalizedType.includes('product') || normalizedType.includes('recommendation')) {
      return '#2196F3'; // Blue for ProductRecommendationAgent
    } else if (normalizedType.includes('trouble') || normalizedType.includes('ts-agent')) {
      return '#FF9800'; // Orange for TroubleshootAgent
    } else if (normalizedType.includes('personal')) {
      return '#E91E63'; // Pink for PersonalizationAgent
    } else if (normalizedType.includes('order') || normalizedType.includes('management')) {
      return '#00BCD4'; // Teal for OrderManagementAgent
    }
    
    // Fallback to default blue
    return '#2196F3';
  };
  
  // Get the appropriate color for this agent
  const agentColor = mapAgentTypeToColor(processedTraceGroup.originalAgentType);
  
  // Create lighter version of the color for task headers
  const lighterColor = agentColor + '22'; // Adding 22 for 13% opacity
  
  return (
    <div className={`trace-group ${expanded ? 'expanded' : ''}`}>
      {/* Only show header if not auto-expanding */}
      {!autoExpand && (
        <div 
          className="trace-group-header" 
          onClick={toggleExpanded}
          style={{ backgroundColor: agentColor, color: 'white', fontWeight: 'bold' }}
        >
          {!hideTitle && <div className="trace-group-title">{title}</div>}
          <div className="trace-group-actions">
            <span className="trace-time-badge" title="Processing time">
              {timeDisplay}
            </span>
            <span className="trace-expand-icon">{expanded ? '▼' : '▶'}</span>
          </div>
        </div>
      )}
      
      {expanded && (
        <div className="trace-group-content">
          {processedTraceGroup.tasks.map((task, index) => (
            <div 
              key={`${index}-${task.title}`}
              className={`trace-task ${expandedTasks[index] ? 'expanded' : ''}`}
            >
              <div 
                className="trace-task-header"
                onClick={(e) => toggleTaskExpanded(index, e)}
                style={{ 
                  borderLeft: `4px solid ${agentColor}`,
                  backgroundColor: expandedTasks[index] ? lighterColor : '#f5f5f5',
                  color: agentColor,
                  fontWeight: 'bold'
                }}
              >
                <div className="trace-task-title">
                  {task.title.includes("Invoking Model") && task.subTasks && task.subTasks.some(st => st.title.includes("Model Output")) ? (
                    (() => {
                      // Find the Model Output subtask
                      const modelOutputSubtask = task.subTasks.find(st => st.title.includes("Model Output"));
                      // Get the model output time
                      const outputTime = modelOutputSubtask ? extractTimeValue(modelOutputSubtask.title) : 0;
                      // Extract the original time from the task title
                      const originalTime = extractTimeValue(task.title);
                      // Calculate total time 
                      const totalTime = (outputTime + originalTime).toFixed(2);
                      
                      // Replace original time with total time
                      return task.title.replace(/\((\d+\.\d+)s\)/, `(${totalTime}s)`);
                    })()
                  ) : task.title}
                </div>
                <div className="trace-task-expand">
                  {expandedTasks[index] ? '−' : '+'}
                </div>
              </div>
              
    {expandedTasks[index] && (
      <div className="trace-task-content" style={{ color: agentColor }}>
        {formatContent(task.content)}
        
        {/* Render subtasks if they exist */}
        {task.subTasks && task.subTasks.length > 0 && (
          <div className="trace-subtasks">
            {/* First, group Knowledge Base and Action Group tools under a single dropdown */}
            {task.title.includes('Knowledge Base') ? (
              <>
                {/* Create a single expandable section for KB Query/Results */}
                <div key={`${index}-kb-pair`} className="trace-subtask-pair">
                  {/* Knowledge Base Group Header */}
                  <div 
                    key={`${index}-kb-group`}
                    className={`trace-subtask ${expandedSubTasks[`${index}-kb-group`] ? 'expanded' : ''}`}
                  >
                    <div 
                      className="trace-subtask-header"
                      onClick={(e) => toggleSubTaskExpanded(index, 'kb-group', e)}
                      style={{ 
                        borderLeft: `3px solid ${agentColor}`,
                        backgroundColor: expandedSubTasks[`${index}-kb-group`] ? lighterColor : '#f9f9f9',
                        color: agentColor,
                        fontWeight: 'bold',
                        fontSize: '0.95em',
                        padding: '8px 12px',
                        marginTop: '5px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <div className="trace-subtask-title">
                        Knowledge Base Operation
                      </div>
                      <div className="trace-subtask-expand">
                        {expandedSubTasks[`${index}-kb-group`] ? '−' : '+'}
                      </div>
                    </div>
                    
                    {expandedSubTasks[`${index}-kb-group`] && (
                      <div className="trace-subtask-content" style={{ padding: '0' }}>
                        {/* Nested query subtask - find the KB Query subtask */}
                        {task.subTasks?.filter(st => isKnowledgeBaseInput(st.title)).map((querySubTask, queryIdx) => {
                          const querySubIndex = task.subTasks?.findIndex(st => st.title === querySubTask.title);
                          return (
                            <div 
                              key={`${index}-${querySubIndex}-kb-query`}
                              className={`trace-subtask ${expandedSubTasks[`${index}-${querySubIndex}`] ? 'expanded' : ''}`}
                              style={{ margin: '5px' }}
                            >
                              <div 
                                className="trace-subtask-header"
                                onClick={(e) => toggleSubTaskExpanded(index, querySubIndex, e)}
                                style={{ 
                                  borderLeft: `3px solid ${agentColor}`,
                                  backgroundColor: expandedSubTasks[`${index}-${querySubIndex}`] ? lighterColor : '#f9f9f9',
                                  color: agentColor,
                                  fontWeight: 'normal',
                                  fontSize: '0.95em',
                                  padding: '8px 12px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer'
                                }}
                              >
                                <div className="trace-subtask-title">
                                  {querySubTask.title}
                                </div>
                                <div className="trace-subtask-expand">
                                  {expandedSubTasks[`${index}-${querySubIndex}`] ? '−' : '+'}
                                </div>
                              </div>
                              
                              {expandedSubTasks[`${index}-${querySubIndex}`] && (
                                <div 
                                  className="trace-subtask-content" 
                                  style={{ 
                                    color: agentColor,
                                    padding: '10px 15px',
                                    marginLeft: '10px',
                                    borderLeft: `2px solid ${lighterColor}`,
                                    backgroundColor: '#fafafa'
                                  }}
                                >
                                  {formatContent(querySubTask.content)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* Nested results subtask - find the KB Results subtask */}
                        {task.subTasks?.filter(st => isKnowledgeBaseOutput(st.title)).map((resultSubTask, resultIdx) => {
                          const resultSubIndex = task.subTasks?.findIndex(st => st.title === resultSubTask.title);
                          return (
                            <div 
                              key={`${index}-${resultSubIndex}-kb-result`}
                              className={`trace-subtask ${expandedSubTasks[`${index}-${resultSubIndex}`] ? 'expanded' : ''}`}
                              style={{ margin: '5px' }}
                            >
                              <div 
                                className="trace-subtask-header"
                                onClick={(e) => toggleSubTaskExpanded(index, resultSubIndex, e)}
                                style={{ 
                                  borderLeft: `3px solid ${agentColor}`,
                                  backgroundColor: expandedSubTasks[`${index}-${resultSubIndex}`] ? lighterColor : '#f9f9f9',
                                  color: agentColor,
                                  fontWeight: 'normal',
                                  fontSize: '0.95em',
                                  padding: '8px 12px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer'
                                }}
                              >
                                <div className="trace-subtask-title">
                                  {resultSubTask.title}
                                </div>
                                <div className="trace-subtask-expand">
                                  {expandedSubTasks[`${index}-${resultSubIndex}`] ? '−' : '+'}
                                </div>
                              </div>
                              
                              {expandedSubTasks[`${index}-${resultSubIndex}`] && (
                                <div 
                                  className="trace-subtask-content" 
                                  style={{ 
                                    color: agentColor,
                                    padding: '10px 15px',
                                    marginLeft: '10px',
                                    borderLeft: `2px solid ${lighterColor}`,
                                    backgroundColor: '#fafafa'
                                  }}
                                >
                                  {formatContent(resultSubTask.content)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : task.title.includes('Action Group Tool') ? (
              <>
                {/* Create a single expandable section for Action Group Input/Results */}
                <div key={`${index}-ag-pair`} className="trace-subtask-pair">
                  {/* Action Group Header */}
                  <div 
                    key={`${index}-ag-group`}
                    className={`trace-subtask ${expandedSubTasks[`${index}-ag-group`] ? 'expanded' : ''}`}
                  >
                    <div 
                      className="trace-subtask-header"
                      onClick={(e) => toggleSubTaskExpanded(index, 'ag-group', e)}
                      style={{ 
                        borderLeft: `3px solid ${agentColor}`,
                        backgroundColor: expandedSubTasks[`${index}-ag-group`] ? lighterColor : '#f9f9f9',
                        color: agentColor,
                        fontWeight: 'bold',
                        fontSize: '0.95em',
                        padding: '8px 12px',
                        marginTop: '5px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <div className="trace-subtask-title">
                        Action Group Operation
                      </div>
                      <div className="trace-subtask-expand">
                        {expandedSubTasks[`${index}-ag-group`] ? '−' : '+'}
                      </div>
                    </div>
                    
                    {expandedSubTasks[`${index}-ag-group`] && (
                      <div className="trace-subtask-content" style={{ padding: '0' }}>
                        {/* Nested input subtask - find the Action Group Input subtask */}
                        {task.subTasks?.filter(st => isActionGroupInput(st.title)).map((inputSubTask, inputIdx) => {
                          const inputSubIndex = task.subTasks?.findIndex(st => st.title === inputSubTask.title);
                          return (
                            <div 
                              key={`${index}-${inputSubIndex}-ag-input`}
                              className={`trace-subtask ${expandedSubTasks[`${index}-${inputSubIndex}`] ? 'expanded' : ''}`}
                              style={{ margin: '5px' }}
                            >
                              <div 
                                className="trace-subtask-header"
                                onClick={(e) => toggleSubTaskExpanded(index, inputSubIndex, e)}
                                style={{ 
                                  borderLeft: `3px solid ${agentColor}`,
                                  backgroundColor: expandedSubTasks[`${index}-${inputSubIndex}`] ? lighterColor : '#f9f9f9',
                                  color: agentColor,
                                  fontWeight: 'normal',
                                  fontSize: '0.95em',
                                  padding: '8px 12px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer'
                                }}
                              >
                                <div className="trace-subtask-title">
                                  {inputSubTask.title}
                                </div>
                                <div className="trace-subtask-expand">
                                  {expandedSubTasks[`${index}-${inputSubIndex}`] ? '−' : '+'}
                                </div>
                              </div>
                              
                              {expandedSubTasks[`${index}-${inputSubIndex}`] && (
                                <div 
                                  className="trace-subtask-content" 
                                  style={{ 
                                    color: agentColor,
                                    padding: '10px 15px',
                                    marginLeft: '10px',
                                    borderLeft: `2px solid ${lighterColor}`,
                                    backgroundColor: '#fafafa'
                                  }}
                                >
                                  {formatContent(inputSubTask.content)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* Nested result subtask - find the Action Group Result subtask */}
                        {task.subTasks?.filter(st => isActionGroupOutput(st.title)).map((resultSubTask, resultIdx) => {
                          const resultSubIndex = task.subTasks?.findIndex(st => st.title === resultSubTask.title);
                          return (
                            <div 
                              key={`${index}-${resultSubIndex}-ag-result`}
                              className={`trace-subtask ${expandedSubTasks[`${index}-${resultSubIndex}`] ? 'expanded' : ''}`}
                              style={{ margin: '5px' }}
                            >
                              <div 
                                className="trace-subtask-header"
                                onClick={(e) => toggleSubTaskExpanded(index, resultSubIndex, e)}
                                style={{ 
                                  borderLeft: `3px solid ${agentColor}`,
                                  backgroundColor: expandedSubTasks[`${index}-${resultSubIndex}`] ? lighterColor : '#f9f9f9',
                                  color: agentColor,
                                  fontWeight: 'normal',
                                  fontSize: '0.95em',
                                  padding: '8px 12px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer'
                                }}
                              >
                                <div className="trace-subtask-title">
                                  {resultSubTask.title}
                                </div>
                                <div className="trace-subtask-expand">
                                  {expandedSubTasks[`${index}-${resultSubIndex}`] ? '−' : '+'}
                                </div>
                              </div>
                              
                              {expandedSubTasks[`${index}-${resultSubIndex}`] && (
                                <div 
                                  className="trace-subtask-content" 
                                  style={{ 
                                    color: agentColor,
                                    padding: '10px 15px',
                                    marginLeft: '10px',
                                    borderLeft: `2px solid ${lighterColor}`,
                                    backgroundColor: '#fafafa'
                                  }}
                                >
                                  {formatContent(resultSubTask.content)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              // Regular subtasks (not action group or knowledge base)
              task.subTasks.map((subTask, subIndex) => (
                <div 
                  key={`${index}-${subIndex}-${subTask.title}`}
                  className={`trace-subtask ${expandedSubTasks[`${index}-${subIndex}`] ? 'expanded' : ''}`}
                >
                  <div 
                    className="trace-subtask-header"
                    onClick={(e) => toggleSubTaskExpanded(index, subIndex, e)}
                    style={{ 
                      borderLeft: `3px solid ${agentColor}`,
                      backgroundColor: expandedSubTasks[`${index}-${subIndex}`] ? lighterColor : '#f9f9f9',
                      color: agentColor,
                      fontWeight: 'normal',
                      fontSize: '0.95em',
                      padding: '8px 12px',
                      marginTop: '5px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="trace-subtask-title">
                      {subTask.title}
                    </div>
                    <div className="trace-subtask-expand">
                      {expandedSubTasks[`${index}-${subIndex}`] ? '−' : '+'}
                    </div>
                  </div>
                  
                  {expandedSubTasks[`${index}-${subIndex}`] && (
                    <div 
                      className="trace-subtask-content" 
                      style={{ 
                        color: agentColor,
                        padding: '10px 15px',
                        marginLeft: '10px',
                        borderLeft: `2px solid ${lighterColor}`,
                        backgroundColor: '#fafafa'
                      }}
                    >
                      {formatContent(subTask.content)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TraceGroup;
