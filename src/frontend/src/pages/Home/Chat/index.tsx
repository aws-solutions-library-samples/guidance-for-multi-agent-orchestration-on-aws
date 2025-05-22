import React, { useContext, useEffect, useRef, useState, useMemo } from "react";

import Avatar from "@cloudscape-design/chat-components/avatar";
import ChatBubble from "@cloudscape-design/chat-components/chat-bubble";
import { Spinner, StatusIndicator, Table, Cards, Badge, TextContent } from "@cloudscape-design/components";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import PromptInput from "@cloudscape-design/components/prompt-input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Grid from "@cloudscape-design/components/grid";
import Header from "@cloudscape-design/components/header";
import { generateClient } from "aws-amplify/api";
import { v4 as uuidv4 } from "uuid";
import { FlashbarContext } from "../../../common/contexts/Flashbar";
import { onUpdateChat } from "../../../common/graphql/subscriptions";
import { sendMessage } from "./api";
import QuickLinks from "./QuickLinks";
import { AgentFlowPanel } from '../../../common/components/react_flow/AgentFlowPanel';
import { parseTraceData, registerMessageHandler, unregisterMessageHandler, generateConnectionId } from '../../../utilities/multiWebsocket';
import { handleTraceMessage, parseTraceJson, TraceGroup as TraceGroupType, TraceState } from '../../../utilities/traceParser';
import TraceGroup from '../../../common/components/react_flow/TraceGroup';
import { storeAgentTrace, collaboratorToNodeId, getAgentTrace, clearAllAgentTraces } from '../../../utilities/agentTraceStorage';
import { resetFlowAnimations } from '../../../common/components/react_flow/FlowReset';
import { useTraceTimer } from './timerEffect';
import { findTraceGroupByAgentId, getTraceGroupStartTime, parseAttributeAsNumber } from '../../../utilities/safeTraceUtils';
import ActivityStatusLoader from './ActivityStatusLoader';
import '../../../common/components/markdown-styles.css';

type Message = { 
    id: string; 
    type: string; 
    content: React.ReactNode; 
    timestamp: string; 
    sortKey?: number; // Optional numeric field for consistent sorting 
};

// Type guard to check if an object is a TraceGroup
const isTraceGroup = (msg: any): msg is TraceGroupType => (
    msg?.type === 'trace-group' && 
    'tasks' in msg && 
    Array.isArray(msg.tasks) &&
    'dropdownTitle' in msg
);

const AUTHORS: { 
    user: { type: "user"; name: string; initials?: string }; 
    assistant: { type: "gen-ai"; name: string; initials?: string }; 
} = { 
    user: { type: "user", name: "You", }, 
    assistant: { type: "gen-ai", name: "Assistant", }, 
};

// Helper function to get model ID for AgentFlowPanel
const getModelId = (_model: string) => {
    return "us.amazon.nova-micro-v1:0"; // Default model
};

// Helper function to determine if a response is complete
const isResponseComplete = (response: string): boolean => {
    if (!response) return false;

    // Check for common completion markers
    return (
        response.length > 50 && // Only consider substantial responses
        (
            response.includes('\n\nIn conclusion') ||
            response.includes('\n\nTo summarize') ||
            response.includes('\n\nIs there anything else') ||
            response.includes('Can I help you with anything else?') ||
            // Add other completion indicators as needed
            response.length > 500 // Consider long responses as complete
        )
    );
};

// Helper function to format duration in milliseconds to a human-readable format
const formatDuration = (ms: number): string => {
    if (ms < 1000) {
        return `${ms}ms`;
    } else if (ms < 60000) {
        return `${(ms / 1000).toFixed(1)}s`;
    } else {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }
};

const Chat = () => {
    const [sessionId] = useState(uuidv4());
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<Message[]>([]); // Initialize with empty array to prevent animation
    
    // Message history state for the drawer
    const [messagePairs, setMessagePairs] = useState<{
        user: Message;
        assistant: Message;
        date: string;
        time: string;
    }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentResponseId, setCurrentResponseId] = useState<string | null>(null);
    const [selectedModel] = useState("default"); // Default model selection
    const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected">("disconnected");
    const [showTrace, setShowTrace] = useState(true); // Toggle for showing/hiding trace data (default: enabled)
    const [showWorkflow, setShowWorkflow] = useState(true); // Toggle for showing/hiding workflow diagram (default: enabled)

    // Trace state for organized dropdowns
    const [traceState, setTraceState] = useState<TraceState>({
        messages: [],
        currentTrace: '',
        currentSubTrace: '',
        traceStepCounter: {}
    });
    
    // State to track the currently selected agent node
    const [selectedAgentNode, setSelectedAgentNode] = useState<string | null>(null);

    // Track trace state changes without excessive logging
    const prevTraceStateRef = useRef<TraceState | null>(null);
    useEffect(() => {
        // Skip logging on initial render
        if (!prevTraceStateRef.current) {
            prevTraceStateRef.current = traceState;
            return;
        }
        
        // Compare current with previous state to log only meaningful changes
        const prevCount = prevTraceStateRef.current.messages.length;
        const currCount = traceState.messages.length;
        
        if (currCount !== prevCount) {
            console.log(`Trace state updated - now has ${currCount} trace groups (was ${prevCount})`);
        }
        
        // Update the ref to current state
        prevTraceStateRef.current = traceState;
    }, [traceState]);

    // Use the fixed trace timer implementation
    useTraceTimer(showTrace, traceState, setTraceState);

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const promptInputRef = useRef<HTMLTextAreaElement>(null);

    // Access the Flashbar context
    const { addFlashbarItem } = useContext(FlashbarContext);

    const client = generateClient();

    // Subscribe to chat updates
    useEffect(() => {
        // Set connection status to connected when subscription starts
        setConnectionStatus("connected");
        
        // Generate a connection ID for AgentFlow
        const connId = generateConnectionId(sessionId);
        
        const subscription = client
            .graphql({
                query: onUpdateChat,
            })
            .subscribe({
                next: ({ data }) => {
                    console.log("Received chat update:", data);
                    // Ensure connection status is set to connected on receiving data
                    setConnectionStatus("connected");
                    
                    if (data.onUpdateChat) {
                        // Always look for trace data first, even if there's no assistant message yet
                        const traceData = parseTraceData(data);
                        
                        // If we have a valid trace with collaborator information
                        if (traceData && traceData.collaboratorName) {
                            console.log('Extracted trace data in Chat component:', traceData);

                            // Notify the AgentFlowPanel of the trace update by triggering a trace event
                            const traceEvent = new CustomEvent('agentTraceEvent', {
                                detail: {
                                    type: 'trace',
                                    connectionId: connId,
                                    content: traceData
                                }
                            });
                            document.dispatchEvent(traceEvent);

                            // For better visibility, log the trace event
                            console.log(`📣 Dispatched trace event for ${traceData.collaboratorName || 'Unknown'} with connectionId ${connId}`);
                            
                            // If we have a selected agent node, check if this trace data is related to it
                            if (selectedAgentNode) {
                                // Enhanced mapping of collaborator names to node IDs
                                const nodeMapping: Record<string, string> = {
                                    'OrderManagement': 'order-mgmt-agent',
                                    'ProductRecommendation': 'product-rec-agent',
                                    'Personalization': 'personalization-agent',
                                    'Troubleshoot': 'ts-agent',
                                    'ROUTING_CLASSIFIER': 'routing-classifier',
                                    'Supervisor': 'supervisor-agent',
                                    // Add more flexible mappings
                                    'OrderManagementAgent': 'order-mgmt-agent',
                                    'ProductRecommendationAgent': 'product-rec-agent',
                                    'PersonalizationAgent': 'personalization-agent',
                                    'TroubleshootAgent': 'ts-agent'
                                };
                                
                                const collaboratorName = traceData.collaboratorName || '';
                                const mappedNodeId = nodeMapping[collaboratorName] || '';
                                
                                // Check if this trace data belongs to the selected agent node with more flexible matching
                                if (mappedNodeId === selectedAgentNode || 
                                    (collaboratorName && selectedAgentNode.includes(collaboratorName.toLowerCase())) ||
                                    (collaboratorName.toLowerCase().includes(selectedAgentNode.replace('-agent', '').toLowerCase()))) {
                                    
                                    console.log(`🔄 Updating selected agent node ${selectedAgentNode} with trace group`);
                                    
                                    // Find the corresponding trace group for this trace data
                                                // Use a type guard to ensure we only work with TraceGroup objects
                                                // Use the existing isTraceGroup type guard
                                                const traceGroupMessages = traceState.messages.filter(
                                                    (msg): msg is TraceGroupType => isTraceGroup(msg)
                                                );
                                                
                                                const matchingTraceGroups = traceGroupMessages.filter(msg => 
                                                    msg.originalAgentType && (
                                                        msg.originalAgentType === collaboratorName ||
                                                        (collaboratorName.toLowerCase().includes(msg.originalAgentType.toLowerCase())) ||
                                                        (msg.originalAgentType.toLowerCase().includes(collaboratorName.toLowerCase()))
                                                    )
                                                );
                                    
                                    // If we found a matching trace group, send it to the agent node
                                    if (matchingTraceGroups.length > 0) {
                                        // Use the first matching trace group
                                        const traceGroup = matchingTraceGroups[0];
                                        console.log(`Found matching trace group for ${collaboratorName}:`, traceGroup);
                                        
                                        // Dispatch an event to update the agent node with the full trace group
                                        const nodeUpdateEvent = new CustomEvent('agentNodeUpdate', {
                                            detail: {
                                                nodeId: selectedAgentNode,
                                                traceData: traceData,
                                                traceGroup: traceGroup,
                                                connId: connId
                                            }
                                        });
                                        document.dispatchEvent(nodeUpdateEvent);
                                    } else {
                                        console.log(`No matching trace group found for ${collaboratorName}`);
                                        
                                        // Send just the trace data for now
                                        const nodeUpdateEvent = new CustomEvent('agentNodeUpdate', {
                                            detail: {
                                                nodeId: selectedAgentNode,
                                                traceData: traceData,
                                                connId: connId
                                            }
                                        });
                                        document.dispatchEvent(nodeUpdateEvent);
                                    }
                                }
                            }

            // Process trace for our dropdown display - always process trace data for agent flow even if not showing in UI
            if (data.onUpdateChat.trace && typeof data.onUpdateChat.trace === 'string') {
                                try {
                                    // Parse the trace JSON
                                    const traceJson = parseTraceJson(data.onUpdateChat.trace);
                                    if (traceJson) {
                                        console.log('Processing trace JSON:', traceJson.collaboratorName || 'Unknown');

                                        // Use a small timeout to ensure DOM updates properly
                                        // This helps each subtrace appear as it streams in
                                        setTimeout(() => {
                                            // Only update traces if we're showing them
                                            // Handle trace message without assigning its return value (which is void)
                                            // Before handling the trace message, directly activate the agent node in the flow diagram
                                            if (traceJson && traceJson.collaboratorName) {
                                                // Map the collaborator name to a node ID
                                                const nodeId = collaboratorToNodeId(traceJson.collaboratorName || 'Unknown');
                                                console.log(`Directly activating node ${nodeId} for collaborator ${traceJson.collaboratorName}`);
                                                
                                                // Create a simple trace group
                                                const simpleTraceGroup: TraceGroupType = {
                                                    id: `direct-trace-${Date.now()}`,
                                                    type: 'trace-group' as const,
                                                    sender: 'bot',
                                                    dropdownTitle: `${traceJson.collaboratorName} Trace`,
                                                    agentId: nodeId,
                                                    originalAgentType: traceJson.collaboratorName,
                                                    tasks: [{
                                                        stepNumber: 1,
                                                        title: `Processing request (${Date.now()})`,
                                                        content: "Processing customer request...",
                                                        timestamp: Date.now()
                                                    }],
                                                    text: "Agent trace",
                                                    startTime: Date.now(),
                                                    lastUpdateTime: Date.now()
                                                };
                                                
                                                // Force immediate DOM update for animation
                                                const nodeElement = document.getElementById(nodeId);
                                                if (nodeElement) {
                                                    console.log(`Direct DOM update: Adding node-processing class to ${nodeId}`);
                                                    nodeElement.classList.add('node-processing');
                                                }
                                                
                                                // Dispatch events to activate the node
                                                const processingEvent = new CustomEvent('agentProcessingUpdate', {
                                                    detail: {
                                                        nodeId: nodeId,
                                                        isProcessing: true,
                                                        processingComplete: false,
                                                        timestamp: Date.now()
                                                    }
                                                });
                                                document.dispatchEvent(processingEvent);
                                                
                                                const nodeUpdateEvent = new CustomEvent('agentNodeUpdate', {
                                                    detail: {
                                                        nodeId: nodeId,
                                                        traceGroup: simpleTraceGroup,
                                                        isProcessing: true,
                                                        timestamp: Date.now()
                                                    }
                                                });
                                                document.dispatchEvent(nodeUpdateEvent);
                                                
                                                // Store the trace data
                                                storeAgentTrace(nodeId, simpleTraceGroup);
                                            }
                                            
                                            // Process trace data with reduced logging and update frequency
                                            handleTraceMessage(
                                                { type: 'trace', content: traceJson },
                                                traceState,
                                                (newState) => {
                                                    // Process state update via the callback
                                                    setTraceState(prevState => {
                                                        // Extract key identifiers from the trace data
                                                        const collaboratorName = traceJson.collaboratorName || 'Unknown';
                                                        const agentId = traceJson.agentId || '';

                                                        // Find if we already have a trace group for this specific agent
                                                        // First try to match by exact agentId which is the most precise match
                                                        let existingGroups = prevState.messages.filter(
                                                            (m): m is TraceGroupType => m.type === 'trace-group' &&
                                                            'agentId' in m &&
                                                            m.agentId === agentId &&
                                                            agentId !== ''
                                                        );

                                                        // If no match by agentId, fall back to matching by collaborator name
                                                        if (existingGroups.length === 0) {
                                                            existingGroups = prevState.messages.filter(
                                                                (m): m is TraceGroupType => m.type === 'trace-group' &&
                                                                'dropdownTitle' in m &&
                                                                m.dropdownTitle.startsWith(collaboratorName)
                                                            );
                                                        }

                                                        // Find the corresponding new group from newState
                                                        const newGroups = newState.messages.filter(
                                                            (m): m is TraceGroupType => m.type === 'trace-group' &&
                                                            (('agentId' in m && m.agentId === agentId && agentId !== '') ||
                                                            ('dropdownTitle' in m && m.dropdownTitle.startsWith(collaboratorName)))
                                                        );

                                                        if (newGroups.length === 0) {
                                                            // This can happen when agent ID changes or with "Unknown" collaborator names
                                                            // Skip console logging to reduce noise

                                                            // Instead of returning the previous state unchanged, add this trace to an existing group if possible
                                                            // Look for any existing trace group for the same agent type or session
                                                            const fallbackGroup = prevState.messages.find(
                                                                (m): m is TraceGroupType => m.type === 'trace-group' &&
                                                                (
                                                                    ('originalAgentType' in m && collaboratorName && m.originalAgentType === collaboratorName) ||
                                                                    (agentId && 'agentId' in m && m.agentId.includes(agentId))
                                                                )
                                                            );

                                                            if (fallbackGroup) {
                                                                console.log(`Using fallback trace group for ${collaboratorName || 'Unknown agent'}`);
                                                                // Process this trace directly into the matched group instead of returning unchanged
                                                                return prevState;
                                                            }

                                                            // If we couldn't find a fallback group, create a new group from scratch
                                                            if (traceJson) {
                                                                console.log('Creating new trace group for trace that had no match');
                                                                // Create an empty state
                                                                const emptyState = { 
                                                                    messages: [], 
                                                                    currentTrace: '', 
                                                                    currentSubTrace: '', 
                                                                    traceStepCounter: {} 
                                                                };
                                                                
                                                                // Create a callback that will capture the new state
                                                                let capturedState: TraceState | null = null;
                                                                
                                                                // Process the trace into a new group
                                                                handleTraceMessage(
                                                                    { type: 'trace', content: traceJson },
                                                                    emptyState,
                                                                    (state) => {
                                                                        capturedState = state;
                                                                        return state;
                                                                    }
                                                                );

                                                                // If we got a new group, add it to our existing ones
                                                                if (capturedState && capturedState.messages.length > 0) {
                                                                    return {
                                                                        ...prevState,
                                                                        messages: [...prevState.messages, ...capturedState.messages]
                                                                    };
                                                                }
                                                            }

                                                            return prevState;
                                                        }

                                                        const newGroup = newGroups[0]; // Take the first matching group

                                                        if (existingGroups.length === 0) {
                                                            // No existing group found, add the new group from newState
                                                            console.log(`Adding new trace group for ${collaboratorName}`);
                                                            return {
                                                                ...prevState,
                                                                messages: [...prevState.messages, newGroup],
                                                                currentTrace: newState.currentTrace,
                                                                currentSubTrace: newState.currentSubTrace,
                                                                traceStepCounter: {
                                                                    ...prevState.traceStepCounter,
                                                                    ...newState.traceStepCounter
                                                                }
                                                            };
                                                        } else {
                                                            // We have existing groups, update them with new content
                                                            // Instead of replacing the whole group, we need to merge the tasks
                                                            const updatedMessages = prevState.messages.map(msg => {
                                                                // Identify if this is a trace group we need to update
                                                                if (msg.type !== 'trace-group') return msg;
                                                                
                                                                const traceMsg = msg as TraceGroupType;
                                                                const isTargetGroup = 
                                                                    (traceMsg.agentId === agentId && agentId !== '') ||
                                                                    (traceMsg.dropdownTitle.startsWith(collaboratorName));

                                                                if (isTargetGroup) {
                                                                    // This is a group we need to update
                                                                    const existingGroup = traceMsg;

                                                                    // Enhanced merging logic for tasks and subtasks
                                                                    // Step 1: Create a map of existing tasks by title for quick lookup
                                                                    const existingTaskMap = new Map();
                                                                    existingGroup.tasks.forEach(task => {
                                                                        // Use a normalized title as the key (remove time info which can change)
                                                                        const normalizedTitle = normalizeTaskTitle(task.title);
                                                                        existingTaskMap.set(normalizedTitle, task);
                                                                    });

                                                                    // Helper function to normalize task titles by removing timing information
                                                                    function normalizeTaskTitle(title: string): string {
                                                                        // Remove the timing part "(X seconds)" and step counter information
                                                                        return title.replace(/\(\d+\.?\d* seconds\)/, '')
                                                                                    .replace(/\(\d+ steps\)/, '')
                                                                                    .trim();
                                                                    }

                                                                    // Helper function to normalize subtask titles
                                                                    function normalizeSubtaskTitle(title: string): string {
                                                                        // Keep the step number but remove timing information
                                                                        const stepMatch = title.match(/Step \d+\.\d+/);
                                                                        const nameMatch = title.match(/ - ([^(]+)/);
                                                                        if (stepMatch && nameMatch) {
                                                                            return `${stepMatch[0]} - ${nameMatch[1].trim()}`;
                                                                        }
                                                                        return title.replace(/\(\d+\.?\d* seconds\)/, '').trim();
                                                                    }

                                                                    // Add any new tasks that don't exist in the current group
                                                                    const mergedTasks = [...existingGroup.tasks];
                                                                    newGroup.tasks.forEach(newTask => {
                                                                        // Normalize the title for comparison (strip out timing info)
                                                                        const normalizedTitle = normalizeTaskTitle(newTask.title);

                                                                        // Check if we already have this task (ignoring timestamp differences)
                                                                        const existingTask = existingTaskMap.get(normalizedTitle);

                                                                        if (!existingTask) {
                                                                            // This is a new task, add it
                                                                            console.log(`Adding new task: ${newTask.title}`);
                                                                            mergedTasks.push(newTask);
                                                                        } else {
                                                                            // We have this task already - update it with any new information

                                                                            // Update content if the new task has content and the existing task doesn't
                                                                            if (newTask.content && !existingTask.content) {
                                                                                existingTask.content = newTask.content;
                                                                            }

                                                                            // Update fullJson if the new task has fullJson and the existing task doesn't
                                                                            if (newTask.fullJson && !existingTask.fullJson) {
                                                                                existingTask.fullJson = newTask.fullJson;
                                                                            }

                                                                            // Handle subtask merging
                                                                            if (newTask.subTasks && newTask.subTasks.length > 0) {
                                                                                // Initialize subtasks array if it doesn't exist
                                                                                if (!existingTask.subTasks) {
                                                                                    existingTask.subTasks = [];
                                                                                }

                                                                                // Create a map of existing subtasks using normalized titles
                                                                                const existingSubtaskMap = new Map();
                                                                                existingTask.subTasks.forEach(subtask => {
                                                                                    const normalizedSubtaskTitle = normalizeSubtaskTitle(subtask.title);
                                                                                    existingSubtaskMap.set(normalizedSubtaskTitle, subtask);
                                                                                });

                                                                                // Add any new subtasks
                                                                                newTask.subTasks.forEach(newSubtask => {
                                                                                    const normalizedSubtaskTitle = normalizeSubtaskTitle(newSubtask.title);
                                                                                    if (!existingSubtaskMap.has(normalizedSubtaskTitle)) {
                                                                                        console.log(`Adding new subtask: ${newSubtask.title}`);
                                                                                        existingTask.subTasks.push(newSubtask);
                                                                                    }
                                                                                });

                                                                                // Sort subtasks by their step numbers for consistent display
                                                                                existingTask.subTasks.sort((a, b) => {
                                                                                    // Extract step numbers from titles (e.g. "Step 1.2" -> 1.2)
                                                                                    const getStepNumber = (title: string) => {
                                                                                        const match = title.match(/Step (\d+\.\d+)/);
                                                                                        return match ? parseFloat(match[1]) : 999; // Default to high number if no match
                                                                                    };
                                                                                    return getStepNumber(a.title) - getStepNumber(b.title);
                                                                                });
                                                                            }
                                                                        }
                                                                    });

                                                                    // Update the dropdown title to reflect the latest time/step count
                                                                    // but preserve the agent name part
                                                                    const baseTitlePart = existingGroup.dropdownTitle.split('(')[0].trim();
                                                                    const newTimePart = newGroup.dropdownTitle.split('(')[1] || '';

                                                                    return {
                                                                        ...existingGroup,
                                                                        tasks: mergedTasks,
                                                                        dropdownTitle: `${baseTitlePart} (${newTimePart}`
                                                                    };
                                                                }

                                                                // Return unchanged for other messages
                                                                return msg;
                                                            });

                                                            return {
                                                                ...prevState,
                                                                messages: updatedMessages,
                                                                currentTrace: newState.currentTrace,
                                                                currentSubTrace: newState.currentSubTrace,
                                                                traceStepCounter: {
                                                                    ...prevState.traceStepCounter,
                                                                    ...newState.traceStepCounter
                                                                }
                                                            };
                                                        }
                                                    });
                                                    
                                                    // Return the newState to satisfy the function signature requirement
                                                    return newState;
                                                }
                                            );

                                            // Force scroll to the latest content after trace update
                                            if (messagesContainerRef.current) {
                                                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                                            }
                                        }, 10);
                                    }
                                } catch (error) {
                                    console.error('Error processing trace JSON:', error);
                                }
                            }
                        }
                        
                        // Update the assistant's message if available
                        if (data.onUpdateChat.assistant && currentResponseId) {
                            // If it's the first time we're getting content, make sure the message is at the end
                            const currentContent = messages.find(msg => msg.id === currentResponseId)?.content;

                            if (!currentContent || currentContent === '') {
                                // This is the first content for this message, ensure it appears at the end
                                setMessages((prev) => {
                                    // First filter out the placeholder empty message
                                    const filteredMessages = prev.filter(msg => msg.id !== currentResponseId);

                                    // Then add it back at the end with content
                                    return [
                                        ...filteredMessages,
                                        {
                                            id: currentResponseId,
                                            type: "assistant",
                                            content: data.onUpdateChat.assistant,
                                            timestamp: new Date().toLocaleTimeString(),
                                        }
                                    ];
                                });
                            } else {
                                // Check if the content has significantly changed to avoid unnecessary updates
                                const existingMessage = messages.find(msg => msg.id === currentResponseId);
                                const existingContent = existingMessage?.content || '';
                                const currentContent = typeof existingContent === 'string' ? existingContent : '';
                                const newContent = data.onUpdateChat.assistant;
                                
                                // Process final response differently to avoid flickering
                                const isFinalResponse = 
                                    newContent.includes("Can I help you with anything else?") ||
                                    newContent.includes("Is there anything else") ||
                                    newContent.includes("In conclusion") ||
                                    newContent.includes("To summarize");
                                
                                // Don't update on small changes for non-final messages
                                // For final messages, always update to ensure they display properly
                                if (isFinalResponse || Math.abs(newContent.length - currentContent.length) >= 15) {
                                    // Update with a small delay to avoid render conflicts
                                    setTimeout(() => {
                                        setMessages((prev) =>
                                            prev.map((msg) =>
                                                msg.id === currentResponseId
                                                    ? { ...msg, content: newContent }
                                                    : msg
                                            )
                                        );
                                    }, 10);
                                }
                            }
                        }

                        // Check if we have a final response and should stop the loading state
                        if (data.onUpdateChat.assistant && isResponseComplete(data.onUpdateChat.assistant)) {
                            console.log("Final response detected, ending loading state");
                            // Immediately end the loading state to enable the input field
                            setIsLoading(false);
                            setCurrentResponseId(null);
                            
                            // Create a trace for the browser node showing the final response
                            // Get the trace group start time safely using our utility function
                            const customerStartTime = getTraceGroupStartTime(traceState.messages, 'customer');
                            const elapsedTime = ((Date.now() - customerStartTime) / 1000).toFixed(2);

                            const browserFinalResponseTrace: TraceGroupType = {
                                id: `browser-trace-response-${Date.now()}`,
                                type: 'trace-group',
                                sender: 'bot',
                                dropdownTitle: 'Browser - Final Response',
                                agentId: 'customer', // This matches the browser node ID
                                originalAgentType: 'Browser',
                                tasks: [{
                                    stepNumber: 2,
                                    title: `Step 2 - Final Response (${elapsedTime} seconds)`,
                                    content: data.onUpdateChat.assistant,
                                    timestamp: Date.now()
                                }],
                                text: "Final response from agents",
                                startTime: customerStartTime,
                                lastUpdateTime: Date.now(),
                                isComplete: true
                            };

                            // Store the browser trace
                            storeAgentTrace('customer', browserFinalResponseTrace);

                            // Activate the browser node with the final response trace
                            const browserNodeUpdateEvent = new CustomEvent('agentNodeUpdate', {
                                detail: {
                                    nodeId: 'customer',
                                    traceGroup: browserFinalResponseTrace
                                }
                            });
                            document.dispatchEvent(browserNodeUpdateEvent);
                            
                            // Notify any registered complete handlers by triggering a complete event
                            const completeEvent = new CustomEvent('agentTraceEvent', {
                                detail: {
                                    type: 'complete',
                                    connectionId: connId,
                                    content: data.onUpdateChat
                                }
                            });
                            document.dispatchEvent(completeEvent);

                            // We no longer need to add a new message here since we're always
                            // using the streaming effect which adds it earlier in the process
                            console.log("Response complete, relying on the existing message with streaming effect");
                            
                        }
                        
                        // Add a fallback mechanism to detect response completion
                        // If the response hasn't been marked as complete but looks substantial, enable the input
                        if (data.onUpdateChat.assistant && 
                            data.onUpdateChat.assistant.length > 100 && 
                            isLoading) {
                            // Track elapsed time from when the trace started
                            const foundGroup = traceState.messages.find(m => isTraceGroup(m) && m.agentId === 'customer') as TraceGroupType | undefined;
                            const elapsedTime = Date.now() - (foundGroup?.startTime || Date.now());
                            
                            // If we've received a substantial response and some time has passed,
                            // make sure the input is enabled even if final markers weren't detected
                            if (elapsedTime > 3000) { // 3 seconds
                                console.log("Response appears complete based on length and time elapsed");
                                setIsLoading(false);
                                setCurrentResponseId(null);
                            }
                        }
                    }
                },
                error: (error) => {
                    console.error("Error in chat subscription:", error);
                    setIsLoading(false);
                    setCurrentResponseId(null);
                    setConnectionStatus("disconnected");
                    addFlashbarItem("error", "Error in chat subscription. Please try again.");
                },
            });

        // Set up a heartbeat to detect disconnections
        const connectionCheckInterval = setInterval(() => {
            // If the subscription is closed, update the connection status
            if (subscription.closed) {
                setConnectionStatus("disconnected");
            }
        }, 5000); // Check every 5 seconds

        return () => {
            subscription.unsubscribe();
            clearInterval(connectionCheckInterval);
            setConnectionStatus("disconnected");
        };
    }, [currentResponseId, addFlashbarItem, sessionId, showTrace]);

    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Handle toggling trace visibility
    useEffect(() => {
        console.log(`Trace visibility ${showTrace ? 'enabled' : 'disabled'}`);

        // Keep trace messages in state even when traces are hidden,
        // just don't display them. This ensures all traces are accumulated properly.
        // Only clear them when starting a new conversation.
    }, [showTrace]);
    
    // Listen for agent node selection events from AgentFlowPanel
    useEffect(() => {
        const handleAgentNodeSelection = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail && customEvent.detail.nodeId) {
                const nodeId = customEvent.detail.nodeId;
                console.log(`Agent node selected in flow panel: ${nodeId}`);
                setSelectedAgentNode(nodeId);
                
                // Immediately send any existing trace data for this node
                // This ensures the node shows trace data as soon as it's selected
                if (traceState.messages.length > 0) {
                    console.log(`Checking for existing trace data for node ${nodeId}`);
                    
                    // Enhanced node mapping for flexibility
                    const nodeMapping: Record<string, string[]> = {
                        'order-mgmt-agent': ['OrderManagement', 'Order', 'OrderAgent'],
                        'product-rec-agent': ['ProductRecommendation', 'Product', 'ProductAgent'],
                        'personalization-agent': ['Personalization', 'Personal'],
                        'ts-agent': ['Troubleshoot', 'Trouble', 'Support'],
                        'routing-classifier': ['ROUTING_CLASSIFIER', 'Classifier', 'Router'],
                        'supervisor-agent': ['Supervisor', 'SupervisorAgent']
                    };
                    
                    // Find potential agent names that could match this node
                    const potentialAgentNames = nodeMapping[nodeId] || [];
                    
                    // Get only trace group messages
                    const traceGroupMessages = traceState.messages.filter(msg => msg.type === 'trace-group') as TraceGroupType[];
                    
                    // Look for trace groups with any of these agent names
                    const matchingTraceGroups = traceGroupMessages.filter(msg => {
                        if (!msg.originalAgentType) return false;
                        
                        const agentType = msg.originalAgentType;
                        // Check if the agent type matches any of our potential names
                        return potentialAgentNames.some(name => 
                            agentType.toLowerCase().includes(name.toLowerCase()) ||
                            name.toLowerCase().includes(agentType.toLowerCase())
                        );
                    });
                        
                    if (matchingTraceGroups.length > 0) {
                        // Use the first matching trace group
                        const traceGroup = matchingTraceGroups[0];
                        console.log(`Found existing trace group for ${nodeId}:`, traceGroup);
                        
                        // Get the connection ID
                        const connId = generateConnectionId(sessionId);
                        
                        // Dispatch an event to update the node with the trace data
                        const nodeUpdateEvent = new CustomEvent('agentNodeUpdate', {
                            detail: {
                                nodeId: nodeId,
                                traceData: { collaboratorName: traceGroup.originalAgentType },
                                traceGroup: traceGroup,
                                connId: connId
                            }
                        });
                        document.dispatchEvent(nodeUpdateEvent);
                    } else {
                        console.log(`No matching trace group found for ${nodeId}`);
                    }
                }
            }
        };
        
        // Add event listener for agent node selection
        document.addEventListener('agentNodeSelected', handleAgentNodeSelection);
        
        return () => {
            // Remove event listener on cleanup
            document.removeEventListener('agentNodeSelected', handleAgentNodeSelection);
        };
    }, [traceState.messages, sessionId]);
    
    // No duplicate timer effect needed - we're using useTraceTimer hook now

    // Effect to update messagePairs whenever a user message gets an assistant response
    useEffect(() => {
        // Find all user messages and assistant responses (excluding the initial greeting)
        const userMessages = messages.filter(msg => msg.type === "user");
        const assistantMessages = messages.filter(msg => msg.type === "assistant" && msg.id !== "1");
        
        // Look for potential new message pairs
        if (userMessages.length > 0 && assistantMessages.length > 0) {
            // Create a map of existing pairs for quick lookup
            const existingPairMap = new Map();
            messagePairs.forEach(pair => {
                if (pair.user && pair.assistant) {
                    const pairKey = `${pair.user.id}-${pair.assistant.id}`;
                    existingPairMap.set(pairKey, true);
                }
            });
            
            // Find new message pairs
            const newPairs = [];
            
            // Try to match each user message with an assistant response
            for (const userMsg of userMessages) {
                // Find assistant messages that came after this user message
                const matchingAssistantMsgs = assistantMessages.filter(assistantMsg => {
                    const userTime = new Date(`1/1/2023 ${userMsg.timestamp}`).getTime();
                    const assistantTime = new Date(`1/1/2023 ${assistantMsg.timestamp}`).getTime();
                    return assistantTime > userTime;
                }).sort((a, b) => {
                    const timeA = new Date(`1/1/2023 ${a.timestamp}`).getTime();
                    const timeB = new Date(`1/1/2023 ${b.timestamp}`).getTime();
                    return timeA - timeB;
                });
                
                if (matchingAssistantMsgs.length > 0) {
                    const matchingAssistantMsg = matchingAssistantMsgs[0]; // Take the earliest matching response
                    
                    // Check if this pair already exists in our history
                    const pairKey = `${userMsg.id}-${matchingAssistantMsg.id}`;
                    
                    if (!existingPairMap.has(pairKey) && 
                        typeof userMsg.content === 'string' && 
                        typeof matchingAssistantMsg.content === 'string') {
                        
                        const currentDate = new Date();
                        const date = currentDate.toLocaleDateString();
                        const time = userMsg.timestamp;
                        
                        // This is a new pair we don't have yet
                        newPairs.push({
                            id: pairKey,
                            user: userMsg,
                            assistant: matchingAssistantMsg,
                            date,
                            time
                        });
                    }
                }
            }
            
            // If we found any new pairs, add them to our history
            if (newPairs.length > 0) {
                console.log(`Found ${newPairs.length} new message pairs to add to history`);
                
                // Combine existing pairs with new ones
                const combinedPairs = [...messagePairs, ...newPairs];
                
                // Keep only the most recent 10 pairs
                const latestPairs = combinedPairs.slice(-10);
                
                console.log(`Updating message history: now ${latestPairs.length} pairs total`);
                setMessagePairs(latestPairs);
                
                // Immediately save to localStorage
                localStorage.setItem('chatHistory', JSON.stringify(latestPairs));
            }
        }
    }, [messages, messagePairs]);

    // Handle message submission
    const submitMessageForm = async () => {
        if (!message.trim()) return;

        // Force stop ALL ongoing animations
        stopAllTextAnimations();
        
        // ALWAYS force remove ALL previous messages except the initial greeting
        // This ensures a clean slate for the new conversation
        console.log("Removing ALL previous messages before sending new message");
        setMessages(prev => prev.filter(msg => 
            msg.id === "1" && msg.type === "assistant" // Keep ONLY the initial greeting
        ));

        // Add user message to chat
        const userMessage: Message = {
            id: Date.now().toString(),
            type: "user",
            content: message,
            timestamp: new Date().toLocaleTimeString(),
        };

        // Create a unique ID for the assistant's response
        const responseId = (Date.now() + 1).toString();

        // Store the message to send
        const messageToSend = message;

        // First update with just the user message
        setMessages((prev) => [...prev, userMessage]);

        // Clear any previous trace data when starting a new conversation
        setTraceState({
            messages: [],
            currentTrace: '',
            currentSubTrace: '',
            traceStepCounter: {}
        });

        // Set loading state and store the response ID for later updates
        setCurrentResponseId(responseId);
        setIsLoading(true);
        setMessage(""); // Clear input immediately for better UX

        // The assistant message will be added after receiving the first trace data

        // Create a trace specifically for the browser node showing the user's message
        const browserUserMessageTrace: TraceGroupType = {
            id: `browser-trace-user-${Date.now()}`,
            type: 'trace-group',
            sender: 'bot',
            dropdownTitle: 'Browser - User Message',
            agentId: 'customer', // This matches the browser node ID
            originalAgentType: 'Browser',
            tasks: [{
                stepNumber: 1,
                title: `Step 1 - User Message (0.00 seconds)`,
                content: messageToSend,
                timestamp: Date.now()
            }],
            text: "User's message",
            startTime: Date.now(),
            lastUpdateTime: Date.now()
        };

        // Store the browser trace
        storeAgentTrace('customer', browserUserMessageTrace);

        // Activate the browser node with the user message trace
        const browserNodeUpdateEvent = new CustomEvent('agentNodeUpdate', {
            detail: {
                nodeId: 'customer',
                traceGroup: browserUserMessageTrace
            }
        });
        document.dispatchEvent(browserNodeUpdateEvent);

        // Send message to backend
        try {
            // Enhanced logging for user messages
            console.log(`💬 USER MESSAGE SENT:`, {
                message: messageToSend,
                sessionId: sessionId,
                timestamp: new Date().toISOString()
            });
            
            await sendMessage(sessionId, messageToSend);

            // We'll maintain loading state until we get a complete response
            // or explicitly handle a timeout through subscription updates
            // Don't reset the loading state automatically here
            
            // Notify the AgentFlowPanel that a new question has been asked
            const connId = generateConnectionId(sessionId);
            const questionEvent = new CustomEvent('agentTraceEvent', {
                detail: { 
                    type: 'question', 
                    connectionId: connId,
                    content: { message: messageToSend } 
                }
            });
            document.dispatchEvent(questionEvent);
        } catch (error) {
            console.error("Error sending message:", error);
            
            // Special handling for Lambda timeout errors
            const isLambdaTimeout = 
                error?.errors?.[0]?.errorType === "Lambda:ExecutionTimeoutException" ||
                error?.message?.includes("Execution timed out");
                
            if (isLambdaTimeout) {
                console.log("Lambda execution timed out, but processing continues asynchronously");
                // Don't show an error to the user - the Lambda is still processing
                // and results will come through the subscription
                
                // Add a status message to let the user know processing is continuing
                addFlashbarItem(
                    "info",
                    "Your request is being processed. Results will appear shortly."
                );
                
                // Keep the loading state active as processing continues
                return;
            }
            
            // For other errors, show error message and reset state
            setIsLoading(false);
            setCurrentResponseId(null);

            // Display error in Flashbar instead of in chat UI
            addFlashbarItem(
                "error",
                "Failed to send message. There was an error processing your request. Please try again."
            );

            // Remove the empty assistant message since we're not going to fill it
            setMessages((prev) => prev.filter((msg) => msg.id !== responseId));
        }
    };

// ChatBubble Avatar component
const ChatBubbleAvatar = ({
    type,
    name,
    initials,
}: {
    type: "user" | "gen-ai";
    name: string;
    initials?: string;
}) => {
    if (type === "gen-ai") {
        return (
            <Avatar
              ariaLabel="Avatar of generative AI assistant"
              color="gen-ai"
              iconName="gen-ai"
              tooltipText="Generative AI assistant"
            />
        );
    }
    return <Avatar initials={initials} tooltipText={name} ariaLabel={name} />;
};

    // Helper to detect final response markers in content
    const isFinalResponseContent = (content: string): boolean => {
        return (
            content.includes("Can I help you with anything else?") ||
            content.includes("Is there anything else") ||
            content.includes("In conclusion") ||
            content.includes("To summarize")
        );
    };
    
    // Formatted Assistant Response Component
    interface FormattedAssistantResponseProps { 
        content: string; 
        onAnimationComplete?: (isDone: boolean) => void;
        messageId?: string;
    }

    // Debug console log for animation completion
    const debugAnimationState = (id: string, status: string) => {
        console.log(`🎬 ANIMATION ${status}: ${id} at ${Date.now()}`);
    };

    // Parse markdown-style content into HTML for proper rendering
    const parseMarkdown = (markdown: string): string => {
        // Convert bold syntax (both * and _)
        let html = markdown
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold**
            .replace(/__(.*?)__/g, '<strong>$1</strong>');    // __bold__
        
        // Convert headings
        html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
        
        // Convert list items
        html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
        html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
        html = html.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');
        
        // Wrap adjacent list items in ul/ol tags
        html = html.replace(/(<li>.*?<\/li>)(\s*<li>)/g, '$1</ul><ul>$2');
        html = html.replace(/(<li>.*?<\/li>)(?!\s*<li>|\s*<\/ul>)/g, '$1</ul>');
        html = html.replace(/(?<!<ul>)(<li>)/g, '<ul>$1');
        
        // Convert paragraphs (lines separated by two newlines)
        html = html.replace(/\n\n/g, '</p><p>');
        
        // Convert italic syntax
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');
        
        // Convert newlines to <br> within paragraphs
        html = html.replace(/\n/g, '<br>');
        
        // Wrap everything in a paragraph if not starting with a tag
        if (!html.startsWith('<')) {
            html = `<p>${html}</p>`;
        }
        
        // Make sure everything is properly wrapped in paragraphs
        html = `<div class="markdown-content">${html}</div>`;
        
        return html;
    };

    // Enhanced response component with better formatting
    const FormattedAssistantResponse = React.memo(
        ({ content, onAnimationComplete, messageId }: FormattedAssistantResponseProps) => {
            // Check if this is a final response that should have paragraph formatting
            const isGreeting = content === "Hello, how can I assist you?";
            const isFinal = content && typeof content === 'string' && isFinalResponseContent(content);
            
            // Call completion handler right away
            useEffect(() => {
                if (onAnimationComplete) {
                    onAnimationComplete(true);
                }
                
                // Store trace data for the browser node
                const existingTrace = getAgentTrace('customer');
                const responseTrace: TraceGroupType = {
                    id: `browser-trace-final-${Date.now()}`,
                    type: 'trace-group' as const,
                    sender: 'bot',
                    dropdownTitle: 'Browser - Response',
                    agentId: 'customer',
                    originalAgentType: 'Browser',
                    tasks: [{
                        stepNumber: 2,
                        title: `Step 2 - Response`,
                        content: content,
                        timestamp: Date.now()
                    }],
                    text: "Response",
                    startTime: existingTrace?.startTime || Date.now(),
                    lastUpdateTime: Date.now(),
                    isComplete: true
                };
                
                storeAgentTrace('customer', responseTrace);
            }, [content, onAnimationComplete]);
            
            // Process the content to handle markdown formatting
            const processedContent = useMemo(() => {
                if (!content) return '';
                
                // Replace markdown-style bullet points with proper HTML
                let processed = content
                    // Convert headings with special formatting
                    .replace(/^(.*?):\s*$/gm, '<h3>$1</h3>')
                    
                    // Convert bold text
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    
                    // Format lists
                    .replace(/^- (.*?)$/gm, '<li>$1</li>')
                    
                    // Handle special sections like "In Stock:" and "Personalized Recommendations:"
                    .replace(/\*\*In Stock:\*\*/g, '<h3 class="section-heading in-stock">In Stock:</h3>')
                    .replace(/\*\*Personalized Recommendations:\*\*/g, '<h3 class="section-heading recommendations">Personalized Recommendations:</h3>')
                
                // Clean up the content to ensure proper paragraph breaks
                processed = processed.replace(/\n\n/g, '</p><p>');
                processed = processed.replace(/\n/g, '<br>');
                
                // Wrap the content in proper HTML
                return processed;
            }, [content]);
            
            // Render the content as HTML
            return (
                <div 
                    className="formatted-response"
                    dangerouslySetInnerHTML={{ __html: processedContent }}
                />
            );
        },
        // Custom equality function to prevent unnecessary re-renders
        (prevProps, nextProps) => {
            // If contents are identical, definitely don't re-render
            if (prevProps.content === nextProps.content) {
                return true;
            }
            
            // Check for final response markers in both previous and next content
            const isPrevFinal = isFinalResponseContent(prevProps.content);
            const isNextFinal = isFinalResponseContent(nextProps.content);
            
            // If new content is a final response, or previous was final and this is different, always re-render
            if (isNextFinal || (isPrevFinal && prevProps.content !== nextProps.content)) {
                return false;
            }
            
            // For non-final responses, use a length difference threshold to reduce flickering
            // Only apply this if the content is still growing (not final)
            if (!isPrevFinal && !isNextFinal) {
                const lengthDiff = Math.abs(prevProps.content.length - nextProps.content.length);
                return lengthDiff <= 20; // Only allow re-renders for substantial changes
            }
            
            // Default case - allow re-render
            return false;
        }
    );


    const MemoizedScrollableContainer = React.useMemo(() => {
        const ScrollableContainer = React.forwardRef(function ScrollableContainer(
            { children }: { children: React.ReactNode },
            ref: React.Ref<HTMLDivElement>
        ) {
            return (
                <div style={{ height: "100%", position: "relative" }}>
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            overflowY: "auto",
                            padding: "20px",
                        }}
                        ref={ref}
                    >
                        {children}
                    </div>
                </div>
            );
        });
        return ScrollableContainer;
    }, []);

    // Global function to stop all text streaming animations
    const stopAllTextAnimations = () => {
        // Find all assistant messages that might be streaming
        const messages = document.querySelectorAll('.cloudscape-chat-bubble-content');
        if (messages.length > 0) {
            console.log('🛑 Stopping all text animations due to input focus');
            
            // Dispatch a custom event that can be listened for by animation components
            document.dispatchEvent(new CustomEvent('stopAllTextAnimations'));
        }
    };
    
    // Handle quick link click
    const handleQuickLinkClick = (text: string) => {
        // Stop any ongoing text streaming animations
        stopAllTextAnimations();
        
        setMessage(text);
        if (promptInputRef.current) {
            promptInputRef.current.focus();
        }
    };

// Handle input focus using React's approach rather than direct DOM events
const handleInputFocus = () => {
    stopAllTextAnimations();
    
    // Also remove ALL previous messages except the initial greeting when input gets focus
    // This ensures a clean slate when user focuses the input field
    console.log("Removing ALL previous messages on input focus");
    setMessages(prev => prev.filter(msg => 
        msg.id === "1" && msg.type === "assistant" // Keep ONLY the initial greeting
    ));

    // Reset the React workflow diagram and clear any agent trace data
    resetFlowAnimations();
    clearAllAgentTraces();
    
    console.log("Reset workflow diagram and cleared agent trace data");
};
    
    // State for active tab
    const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
    
    // Effect to save message history to local storage
    useEffect(() => {
        if (messagePairs.length > 0) {
            localStorage.setItem('chatHistory', JSON.stringify(messagePairs.slice(-10)));
        }
    }, [messagePairs]);
    
    // Load history from local storage on mount
    useEffect(() => {
        const savedHistory = localStorage.getItem('chatHistory');
        if (savedHistory) {
            try {
                const parsedHistory = JSON.parse(savedHistory);
                if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
                    setMessagePairs(parsedHistory);
                }
            } catch (e) {
                console.error('Error parsing chat history from localStorage:', e);
            }
        }
    }, []);

    return (
        <Grid
            gridDefinition={[
                { colspan: { default: 12, xxs: showWorkflow ? 7 : 12 } },
                { colspan: { default: 12, xxs: showWorkflow ? 5 : 0 } }
            ]}
        >
            {/* Chat Panel - Left Side */}

            <Box padding="s">
                <Container
                    header={
                        <Header 
                            variant="h2"
                            actions={
                                <StatusIndicator
                                    type={connectionStatus === "connected" ? "success" : "error"}
                                >
                                    {connectionStatus === "connected" ? "Connected" : "Disconnected"}
                                </StatusIndicator>
                            }
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>Chat</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '5px', 
                                        fontSize: '14px', 
                                        padding: '4px 8px',
                                        backgroundColor: showTrace ? '#ebf8ff' : '#edf2f7',
                                        border: `1px solid ${showTrace ? '#4299e1' : '#cbd5e0'}`,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <input 
                                            type="checkbox" 
                                            checked={showTrace} 
                                            onChange={(e) => setShowTrace(e.target.checked)}
                                            style={{ margin: 0 }}
                                        />
                                        {showTrace ? '👁️ Agent Traces' : '🔍 Show Agent Traces'}
                                    </label>
                                    <label style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '5px', 
                                        fontSize: '14px', 
                                        padding: '4px 8px',
                                        backgroundColor: showWorkflow ? '#e6fffa' : '#edf2f7',
                                        border: `1px solid ${showWorkflow ? '#38b2ac' : '#cbd5e0'}`,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <input 
                                            type="checkbox" 
                                            checked={showWorkflow} 
                                            onChange={(e) => setShowWorkflow(e.target.checked)}
                                            style={{ margin: 0 }}
                                        />
                                        {showWorkflow ? '📊 Workflow' : '📊 Show Workflow'}
                                    </label>
                                    <label style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '5px', 
                                        fontSize: '14px', 
                                        padding: '4px 8px',
                                        backgroundColor: activeTab === 'history' ? '#e6fffa' : '#edf2f7',
                                        border: `1px solid ${activeTab === 'history' ? '#38b2ac' : '#cbd5e0'}`,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => setActiveTab(activeTab === 'chat' ? 'history' : 'chat')}>
                                        {activeTab === 'history' ? '💬 Chat' : '📝 History'}
                                    </label>
                                </div>
                            </div>
                        </Header>
                    }
                    disableContentPaddings
                    footer={
                        <SpaceBetween size="s">
                            <QuickLinks onLinkClick={handleQuickLinkClick} />
                            <PromptInput
                                ref={promptInputRef}
                                disabled={isLoading}
                                onFocus={handleInputFocus}
                                onChange={({ detail }) => {
                                    // First time user types, remove any final responses
                                    if (detail.value && !message) {
                                        // Remove any final response messages before user starts typing
                                        setMessages(prev => prev.filter(msg => 
                                            !(msg.type === "assistant" && 
                                            msg.id !== "1" &&
                                            typeof msg.content === 'string' &&
                                            isFinalResponseContent(msg.content))
                                        ));
                                    }
                                    
                                    setMessage(detail.value);
                                }}
                                onAction={() => {
                                    submitMessageForm();
                                }}
                                value={message}
                                actionButtonAriaLabel={
                                    isLoading ? "Send message button disabled" : "Send message"
                                }
                                actionButtonIconName="send"
                                ariaLabel={isLoading ? "Prompt input - suppressed" : "Prompt input"}
                                placeholder="Type your message here..."
                                autoFocus
                            />
                        </SpaceBetween>
                    }
                >
                    <div style={{ height: "calc(100vh - 280px)" }}>
                        {activeTab === 'chat' ? (
                            <MemoizedScrollableContainer ref={messagesContainerRef}>
                                <SpaceBetween size="l">
                                    {/* All combined messages in reversed order (newest first) */}
                                    {[
                                        // User messages (always at the top)
                                        ...messages
                                            .filter(message => message.type === "user")
                                            .reverse() // Reverse the order to show newer messages first
                                            .map((message) => (
                                                <ChatBubble
                                                    key={message.id}
                                                    avatar={<ChatBubbleAvatar {...AUTHORS.user} />}
                                                    ariaLabel={`You at ${message.timestamp}`}
                                                    type="outgoing"
                                                >
                                                    <SpaceBetween size="xs">
                                                        <div>
                                                            <div dangerouslySetInnerHTML={{ __html: message.content as string }} />
                                                        </div>
                                                    </SpaceBetween>
                                                </ChatBubble>
                                            )),
                                        
                                        // Trace data section (appears between user message and assistant response)
                                        ...(showTrace && traceState.messages.length > 0 ? [
                                            <Box key="trace-section" padding="s" margin="m">
                                                <div style={{ borderTop: '1px solid var(--color-border-divider-default)' }}>
                                                    {/* Display trace groups in vertical layout instead of grid */}
                                                    <SpaceBetween size="m">
                                                    {traceState.messages
                                                        .filter((msg): msg is TraceGroupType => isTraceGroup(msg))  // Use our type guard with proper type assertion
                                                        .sort((a, b) => {
                                                            const getAgentType = (msg: TraceGroupType) => {
                                                                // First check originalAgentType which is more reliable
                                                                if (msg.originalAgentType === 'ROUTING_CLASSIFIER') {
                                                                    return 'ROUTING_CLASSIFIER';
                                                                } else if (msg.originalAgentType === 'Supervisor') {
                                                                    return 'Supervisor';
                                                                } else if (msg.originalAgentType === 'Unknown') {
                                                                    // Try to treat Unknown as Supervisor if possible
                                                                    return 'Supervisor';
                                                                }

                                                                // Then check the dropdown title
                                                                const titleParts = msg.dropdownTitle.split(' ');
                                                                if (titleParts[0] === 'ROUTING_CLASSIFIER') {
                                                                    return 'ROUTING_CLASSIFIER';
                                                                } else if (titleParts[0] === 'Unknown') {
                                                                    // Put Unknown agent under Supervisor category
                                                                    return 'Supervisor';
                                                                }

                                                                // Extract agent base names without unique identifiers
                                                                return titleParts[0].split('-')[0];
                                                            };

                                                            const aType = getAgentType(a);
                                                            const bType = getAgentType(b);

                                                            // Define the desired order for the main agent types
                                                            const agentOrder = [
                                                                'ROUTING_CLASSIFIER',  // Put ROUTING_CLASSIFIER at the top
                                                                'Supervisor',          // Supervisor including Unknown agents
                                                                'Troubleshoot',
                                                                'Personalization',
                                                                'ProductRecommendation',
                                                                'OrderManagement'
                                                            ];
                                                            
                                                            // Get the index of each agent in the order array
                                                            const aIndex = agentOrder.indexOf(aType);
                                                            const bIndex = agentOrder.indexOf(bType);
                                                            
                                                            // Use the index for sorting (agents not in the list go to the end)
                                                            if (aIndex === -1 && bIndex === -1) return aType.localeCompare(bType);
                                                            if (aIndex === -1) return 1;
                                                            if (bIndex === -1) return -1;
                                                            return aIndex - bIndex;
                                                        })
                                                        .map((traceMsg: TraceGroupType) => (
                                                            <div
                                                                key={`trace-group-container-${traceMsg.id}`}
                                                            >
                                                                <TraceGroup
                                                                    key={`trace-group-${traceMsg.id}`}
                                                                    traceGroup={traceMsg}
                                                                />
                                                            </div>
                                                        ))
                                                    }
                                                    </SpaceBetween>
                                                </div>
                                            </Box>
                                        ] : []),
                                        
                                        // Loading indicator (appears after traces, before assistant response)
                                        ...(isLoading && !(() => {
                                            // Only hide the loading spinner when the assistant response has content
                                            const currentResponseMessage = messages.find(msg => msg.id === currentResponseId);
                                            return currentResponseMessage && 
                                                currentResponseMessage.content && 
                                                currentResponseMessage.content !== '';
                                        })() ? [
                                            <ActivityStatusLoader
                                                key="loading-indicator"
                                                traceState={traceState}
                                                isLoading={isLoading}
                                            />
                                        ] : []),
                                        
                                        // Assistant responses (excluding greeting)
                                        ...messages
                                            .filter(message => message.id !== "1" && message.type === "assistant")
                                            .map((message) => {
                                                // Check if this is a completed response or still in progress
                                                const isProcessing = message.id === currentResponseId && 
                                                                    (!message.content || message.content === '');
                                                
                                                // Only show spinner for empty messages that are still processing
                                                if (isProcessing) {
                                                    return (
                                                        <ChatBubble
                                                            key={message.id}
                                                            avatar={<ChatBubbleAvatar {...AUTHORS.assistant} />}
                                                            ariaLabel={`Assistant at ${message.timestamp}`}
                                                            type="incoming"
                                                        >
                                                            <Box color="text-status-inactive">
                                                                <Spinner size="normal" />
                                                                <div style={{ fontSize: '13px', color: '#718096', marginTop: '8px' }}>
                                                                    Processing your request...
                                                                </div>
                                                            </Box>
                                                        </ChatBubble>
                                                    );
                                                }
                                                
                                                // Only show messages with actual content
                                                if (message.content && message.content !== '') {
                                                    return (
                                                        <ChatBubble
                                                            key={message.id}
                                                            avatar={<ChatBubbleAvatar {...AUTHORS.assistant} />}
                                                            ariaLabel={`Assistant at ${message.timestamp}`}
                                                            type="incoming"
                                                        >
                                                            <SpaceBetween size="xs">
                                                                <div>
                                                                    {typeof message.content === 'string' ? (
                                                                        <div className="markdown-response">
                                                                            <FormattedAssistantResponse 
                                                                                content={message.content} 
                                                                                onAnimationComplete={(isDone) => {
                                                                                    if (isDone) {
                                                                                        console.log('🔓 Animation complete, ensuring input field is enabled');
                                                                                        
                                                                                        console.log('🧹 Animation complete, cleaning up all processes');
                                                                                        // Force mark all trace groups as complete to stop any background processes
                                                                                        setTraceState(prevState => {
                                                                                            // Create deep copy of state
                                                                                            const newState = JSON.parse(JSON.stringify(prevState));
                                                                                            
                                                                                            // Mark all trace groups as complete
                                                                                            newState.messages = newState.messages.map(msg => {
                                                                                                if (msg.type === 'trace-group') {
                                                                                                    return { ...msg, isComplete: true };
                                                                                                }
                                                                                                return msg;
                                                                                            });
                                                                                            
                                                                                            console.log('🛑 Marked all trace groups as complete to stop background processes');
                                                                                            return newState;
                                                                                        });
                                                                                        
                                                                                        // Force clear any global timers/intervals
                                                                                        document.dispatchEvent(new CustomEvent('clearAllTimers'));
                                                                                        
                                                                                        // Add a small timeout to ensure state updates propagate
                                                                                        setTimeout(() => {
                                                                                            // Enable input field
                                                                                            setIsLoading(false);
                                                                                            setCurrentResponseId(null);
                                                                                        }, 50);
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        message.content
                                                                    )}
                                                                </div>
                                                            </SpaceBetween>
                                                        </ChatBubble>
                                                    );
                                                }
                                                
                                                return null;
                                            }),
                                            
                                        // Initial greeting (moves to the bottom since it's the oldest)
                                        ...messages
                                            .filter(message => message.id === "1" && message.type === "assistant")
                                            .map((message) => (
                                                <ChatBubble
                                                    key={message.id}
                                                    avatar={<ChatBubbleAvatar {...AUTHORS.assistant} />}
                                                    ariaLabel={`Assistant at ${message.timestamp}`}
                                                    type="incoming"
                                                >
                                                    <SpaceBetween size="xs">
                                                        <div>
                                                            {typeof message.content === 'string' && (
                                                                <FormattedAssistantResponse content={message.content} />
                                                            )}
                                                        </div>
                                                    </SpaceBetween>
                                                </ChatBubble>
                                            ))
                                    ]}
                                </SpaceBetween>
                            </MemoizedScrollableContainer>
                        ) : (
                            /* History Tab Content */
                            <MemoizedScrollableContainer>
                                <Box margin={{ top: 'l' }}>
                                    <SpaceBetween size="l">
                                        <Header variant="h3">Chat History</Header>
                                        {messagePairs.length > 0 ? (
                                            <SpaceBetween size="l">
                                                {[...messagePairs].reverse().map((pair, index) => (
                                                    <div key={`history-${index}`} 
                                                        style={{
                                                            padding: '16px',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '8px',
                                                            backgroundColor: '#f8fafc',
                                                            marginBottom: '16px'
                                                        }}>
                                                        <SpaceBetween size="m">
                                                            <div>
                                                                <Box variant="small" color="text-body-secondary" margin={{ bottom: 'xs' }}>
                                                                    {pair.date} at {pair.time}
                                                                </Box>
                                                                <ChatBubble
                                                                    avatar={<ChatBubbleAvatar {...AUTHORS.user} />}
                                                                    ariaLabel="You"
                                                                    type="outgoing"
                                                                >
                                                                    <div dangerouslySetInnerHTML={{ __html: pair.user.content as string }} />
                                                                </ChatBubble>
                                                            </div>
                                                            <ChatBubble
                                                                avatar={<ChatBubbleAvatar {...AUTHORS.assistant} />}
                                                                ariaLabel="Assistant"
                                                                type="incoming"
                                                            >
                                                                {typeof pair.assistant.content === 'string' && (
                                                                    <div>{pair.assistant.content}</div>
                                                                )}
                                                            </ChatBubble>
                                                        </SpaceBetween>
                                                    </div>
                                                ))}
                                            </SpaceBetween>
                                        ) : (
                                            <Box padding="m" textAlign="center">
                                                <SpaceBetween size="xs">
                                                    <Box variant="h4">No chat history yet</Box>
                                                    <Box variant="p">
                                                        Previous conversations will appear here
                                                    </Box>
                                                </SpaceBetween>
                                            </Box>
                                        )}
                                    </SpaceBetween>
                                </Box>
                            </MemoizedScrollableContainer>
                        )}
                    </div>
                </Container>
            </Box>

            {/* Agent Flow Panel - Right Side */}
            {showWorkflow && (
                <Box padding="s">
                    <Container
                        header={<Header variant="h2">Agentic Workflow</Header>}
                        disableContentPaddings={true}
                    >
                        <div style={{ height: "calc(100vh - 200px)" }}>
                            <AgentFlowPanel 
                                height="100%" 
                                sessionId={sessionId} 
                                modelId={getModelId(selectedModel)} 
                            />
                        </div>
                    </Container>
                </Box>
            )}
        </Grid>
    );
};

export default Chat;
