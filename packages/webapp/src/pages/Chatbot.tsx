import React from 'react';
import type { FC, CSSProperties, DetailedHTMLProps, HTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, LabelHTMLAttributes, DetailsHTMLAttributes } from 'react';
import { useState, useEffect, useRef } from 'react';
// 1) Use ExpandableSection from its own package (not from "@cloudscape-design/components"):
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import '../setLocalStorage.js';

// Define JSX namespace if needed
declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
      input: DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
      pre: DetailedHTMLProps<HTMLAttributes<HTMLPreElement>, HTMLPreElement>;
      details: DetailedHTMLProps<DetailsHTMLAttributes<HTMLDetailsElement>, HTMLDetailsElement>;
      summary: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
      textarea: DetailedHTMLProps<TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>;
      label: DetailedHTMLProps<LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>;
      span: DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
    }
  }
}

import {
  Button,
  CloudBox,
  Tabs,
  AppLayout,
  Grid,
  StatusIndicator,
  Input
} from '../components/cloudscape-imports';

import { useAtom } from 'jotai';
import { chatHistoryAtom, addToChatHistory } from '../atoms/ChatHistoryAtom';
import { LoadingMessage } from '../components/LoadingMessage';
import '../styles/chatbot.css';
import '../styles/trace-content.css';


import Documents from './Documents';
import Workflow from './Workflow';
import ChatHistory from '../components/ChatHistory';

// Type definitions
interface TraceData {
  type: string;
  content: any;
}

interface Task {
  stepNumber?: number;
  title: string;
  content?: string | any;
  fullJson?: string | null;
  timestamp: number;
  subTasks?: Task[];
}

type Message = {
  sender: 'user' | 'bot';
  text: string;
  type: 'user' | 'chunk' | 'trace-group' | 'final' | 'info';
  dropdownTitle?: string;
  tasks?: Task[];
  startTime?: number;
  sessionId?: string;
  agentId?: string;
  aliasId?: string;
  originalPrompt?: string;
  // [Optional] style to help preserve whitespace
  style?: CSSProperties | Record<string, string | number>;
};

const Chatbot: FC = () => {
  // Constants
  const region = 'us-west-2';
  const agentId = localStorage.getItem('agentId');
  const aliasId = localStorage.getItem('aliasId');
  const websocketId = localStorage.getItem('websocketId');

  // State declarations
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [websocketWarning, setWebsocketWarning] = useState<string | null>(null);
  const [lastWebsocketActivity, setLastWebsocketActivity] = useState<number>(Date.now());
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useAtom(chatHistoryAtom);
  const lastPromptRef = useRef<string | undefined>();
  const pendingPromptsMap = useRef<Map<number, string>>(new Map());
  
  const [sessionId, setSessionId] = useState(() => {
    // Generate a new session ID every time the component mounts
    const randomId = Array.from(crypto.getRandomValues(new Uint8Array(9)))
      .map(b => b.toString(36)[0])
      .join('')
      .toUpperCase();
    localStorage.setItem('mysessionid', randomId);
    return randomId;
  });

  // Removed unused state variable isInitialized

  // For displaying trace/sub-trace while streaming
  const [currentTrace, setCurrentTrace] = useState<string | undefined>();
  const [currentSubTrace, setCurrentSubTrace] = useState<string | undefined>();

  const [copyStatus, setCopyStatus] = useState<string | undefined>();
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Tracing
  const [showTracing, setShowTracing] = useState(true);
  const toggleTracing = () => {
    setShowTracing((prev: boolean) => !prev);
  };

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const ws = useRef<WebSocket | null>(null);
  const currentPromptId = useRef(0);

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${fieldName} copied!`);
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (err: unknown) {
      console.error('Failed to copy:', err);
      setCopyStatus('Failed to copy');
    }
  };

  // If you have SSM hooks, they’d appear here ...
  // e.g. const { value: supervisorValue } = useSSMParameter('/supervisor');

  // Store values in localStorage whenever they change
  useEffect(() => {
    console.log('Values changed:', { agentId, aliasId, websocketId });
    if (agentId && aliasId && websocketId) {
      localStorage.setItem('agentId', agentId);
      localStorage.setItem('aliasId', aliasId);
      localStorage.setItem('websocketId', websocketId);
      setLoading(false);
      setError(null);
      console.log('All values loaded and stored:', { agentId, aliasId, websocketId });
    } else if (!agentId || !aliasId) {
      setError('Agent ID or Alias ID is missing. Please refresh the page to fetch from API again.');
    }
  }, [agentId, aliasId, websocketId]);

  // Handle WebSocket idle warnings/timeouts
  useEffect(() => {
    let warningTimeoutId: NodeJS.Timeout;
    let disconnectTimeoutId: NodeJS.Timeout;

    const checkWebsocketActivity = () => {
      const inactiveTime = Date.now() - lastWebsocketActivity;
      if (inactiveTime >= 670000) { // ~11+ minutes
        setWebsocketWarning("In 30 seconds, your connection will fail. Please refresh your screen to update the connection.");
        // Schedule disconnect after 30 more seconds
        disconnectTimeoutId = setTimeout(() => {
          if (ws.current) {
            ws.current.close();
          }
          setWebsocketWarning(null);
          setWsConnected(false);
          setError("Connection timed out. Please refresh the page.");
        }, 30000);
      }
    };

    warningTimeoutId = setInterval(checkWebsocketActivity, 1000);

    return () => {
      clearInterval(warningTimeoutId);
      clearTimeout(disconnectTimeoutId);
    };
  }, [lastWebsocketActivity]);

  // Establish WebSocket connection
  useEffect(() => {
    let isActive = true;

    // Close any existing connection before new one
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    const connectWebSocket = () => {
      const cleanId = websocketId?.trim();
      if (!cleanId) {
        console.log('WebSocket ID is empty - skipping connection');
        return;
      }

      const wsUrl = `wss://${cleanId}.execute-api.${region}.amazonaws.com/dev?auth=genai-labs-mac`;

      try {
        console.log('Attempting WebSocket connection to:', wsUrl);
        ws.current = new WebSocket(wsUrl);

        if (ws.current) {
          ws.current.onopen = () => {
            if (!isActive) return;
            console.log('WebSocket connection established.');
            setError(null);
            setLoading(false);
            setWsConnected(true);
          };

          ws.current.onerror = (error) => {
            if (!isActive) return;
            console.error('WebSocket error:', error);
            setError('WebSocket connection failed. Please check your WebSocket ID and ensure it is correct.');
            setLoading(false);
            setWsConnected(false);
          };

          ws.current.onclose = () => {
            if (!isActive) return;
            console.log('WebSocket connection closed.');
            setLoading(false);
            setWsConnected(false);
          };

          ws.current.onmessage = (event) => {
            try {
              if (!isActive) return;
              const data = JSON.parse(event.data);
              console.log('Received message:', data);

              if (!data || !data.type) {
                console.warn('Invalid message format received');
                return;
              }

              if (data.type === 'error') {
                setLoading(false);
                if (data.message && data.message.includes('throttlingException')) {
                  setError('Request rate limit exceeded. Please wait a moment and try again.');
                } else {
                  setError(data.message || 'An error occurred. Please try again.');
                }
                return;
              }

              if (data.type === 'chunk' && data.content) {
                // Update lastWebsocketActivity for chunks too
                setLastWebsocketActivity(Date.now());
              } else if (data.type === 'trace') {
                handleTraceMessage(data);
                // Update lastWebsocketActivity for any received trace
                setLastWebsocketActivity(Date.now());
              } else if (data.type === 'final') {
                handleFinalMessage(data);
                // Update lastWebsocketActivity for final message
                setLastWebsocketActivity(Date.now());
              }
            } catch (error) {
              console.error('Error processing message:', error);
              if (isActive) {
                setError('Error processing message. Please try again.');
              }
            }
          };
        }
      } catch (err) {
        console.error('Error creating WebSocket:', err);
        setError('Failed to create WebSocket connection. Please check your connection and try again.');
        setLoading(false);
      }
    };

    connectWebSocket();

    return () => {
      isActive = false;
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [websocketId, region]);


  // ---------------------------------------------------
  // --------------- TRACE HANDLING ---------------------
  // ---------------------------------------------------
  const traceStepCounter: { [key: string]: number } = {};

  // 1) Map known agents to model names, or return '' if unknown/routing
  function getModelLabelForTrace(traceType: string): string {
    switch (traceType) {
      case 'SupervisorAgent':
        return 'Sonnet Nova';
      case 'ProductRecommendationAgent':
        return 'Sonnet 3 V1';
      case 'TroubleshootAgent':
        return 'Haiku 3.5';
      case 'PersonalizationAgent':
        return 'Sonnet 3 V1';
      case 'OrderManagementAgent':
        return 'Haiku 3.5';
      default:
        return '';
    }
  }
  

  const handleTraceMessage = (data: TraceData): void => {
    if (!data || !data.content) {
      console.warn('Invalid trace data received');
      return;
    }

    const traceContent = data.content;
    let traceType: string = 'UnknownAgent';
    let subTraceTitle: string = '';
    let displayContent: string | null = null;
    let fullJsonContent: string | null = null;

    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    // Identify trace specifics
    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    if (
      traceContent?.trace?.routingClassifierTrace?.observation
        ?.agentCollaboratorInvocationOutput
    ) {
      const collaboratorOutput =
        traceContent.trace.routingClassifierTrace.observation
          .agentCollaboratorInvocationOutput;
      traceType = collaboratorOutput.agentCollaboratorName || 'UnknownAgent';
      subTraceTitle = 'Observation';
      const outputText = collaboratorOutput.output?.text;
      displayContent = outputText || "No 'text' content available.";
      fullJsonContent = JSON.stringify(traceContent, null, 2);
    }
    else if (
      traceContent?.trace?.orchestrationTrace?.observation
        ?.agentCollaboratorInvocationOutput
    ) {
      const collaboratorOutput =
        traceContent.trace.orchestrationTrace.observation
          .agentCollaboratorInvocationOutput;
      traceType = collaboratorOutput.agentCollaboratorName || 'UnknownAgent';
      subTraceTitle = 'Observation';
      const outputText = collaboratorOutput.output?.text;
      displayContent = outputText || "No 'text' content available.";
      fullJsonContent = JSON.stringify(traceContent, null, 2);
    }
    else if (traceContent?.trace?.orchestrationTrace?.observation?.finalResponse) {
      subTraceTitle = 'Final Response';
      traceType = traceContent.collaboratorName || 'SupervisorAgent';
      const finalResponse =
        traceContent.trace.orchestrationTrace.observation.finalResponse;
      displayContent = finalResponse.text || "No 'text' content available.";
      fullJsonContent = JSON.stringify(traceContent, null, 2);
    }
    else if (traceContent?.trace?.routingClassifierTrace?.observation?.finalResponse) {
      subTraceTitle = 'Observation - Final Response';
      traceType = traceContent.collaboratorName || 'SupervisorAgent';
      const finalResponse =
        traceContent.trace.routingClassifierTrace.observation.finalResponse;
      displayContent = finalResponse.text || "No 'text' content available.";
      fullJsonContent = JSON.stringify(traceContent, null, 2);
    }
    else if (traceContent?.trace?.orchestrationTrace?.rationale) {
      subTraceTitle = 'Rationale';
      traceType = traceContent.collaboratorName || 'SupervisorAgent';
      const rationale = traceContent.trace.orchestrationTrace.rationale;
      displayContent = rationale.text || "No 'text' content available.";
      fullJsonContent = JSON.stringify(traceContent, null, 2);
    }
    else if (traceContent?.trace?.orchestrationTrace?.modelInvocationInput) {
      subTraceTitle = 'Invoking Model';
      traceType = traceContent.collaboratorName || 'SupervisorAgent';
      let inputText = traceContent.trace.orchestrationTrace.modelInvocationInput?.text;
      if (inputText) {
        try {
          const parsedJson = JSON.parse(inputText);
          inputText = JSON.stringify(parsedJson, null, 2);
        } catch {
          // keep raw
        }
      }
      displayContent = inputText || "No 'text' content available.";
      fullJsonContent = JSON.stringify(traceContent, null, 2);
    }
    else if (traceContent?.trace?.orchestrationTrace?.modelInvocationOutput) {
      subTraceTitle = 'Invoking Model';
      traceType = traceContent.collaboratorName || 'SupervisorAgent';
      let rawResponseContent =
        traceContent.trace.orchestrationTrace.modelInvocationOutput?.rawResponse
          ?.content;
      if (rawResponseContent) {
        try {
          const parsedJson = JSON.parse(rawResponseContent);
          rawResponseContent = JSON.stringify(parsedJson, null, 2);
        } catch {
          // keep raw
        }
      }
      displayContent = rawResponseContent || "No 'content' attribute found.";
      fullJsonContent = JSON.stringify(traceContent, null, 2);
    }
    else if (
      traceContent?.trace?.orchestrationTrace?.invocationInput
        ?.actionGroupInvocationInput
    ) {
      subTraceTitle = 'Action Group Tool';
      traceType =
        traceContent.collaboratorName ||
        traceContent.trace.orchestrationTrace.invocationInput
          .actionGroupInvocationInput?.actionGroupName ||
        'ActionGroup';
      const actionGroupInvocationInput =
        traceContent.trace.orchestrationTrace.invocationInput
          .actionGroupInvocationInput;
      const valueAttribute =
        actionGroupInvocationInput?.requestBody?.content?.['application/json']?.[0]?.value;
      displayContent = valueAttribute || "No 'value' content available.";
      fullJsonContent = JSON.stringify(traceContent, null, 2);
    }
    else if (
      traceContent?.trace?.orchestrationTrace?.observation
        ?.actionGroupInvocationOutput
    ) {
      traceType = traceContent.collaboratorName || 'ActionGroup';
      const actionGroupOutput =
        traceContent.trace.orchestrationTrace.observation
          .actionGroupInvocationOutput?.text;

      try {
        const parsedOutput = JSON.parse(actionGroupOutput as string);
        const dataRows = parsedOutput.result?.ResultSet?.Rows || [];
        const cleanedData = dataRows.map((row: any) =>
          row.Data?.map((d: any) => d.VarCharValue).join(' | ')
        );
        displayContent =
          cleanedData.join('\n') || "No 'text' content available.";
      } catch {
        displayContent = "Invalid JSON format in 'text' attribute.";
      }

      fullJsonContent = JSON.stringify(traceContent, null, 2);
    }
    else if (
      traceContent?.trace?.routingClassifierTrace?.invocationInput
        ?.agentCollaboratorInvocationInput
    ) {
      const agentName =
        traceContent.trace.routingClassifierTrace.invocationInput
          .agentCollaboratorInvocationInput?.agentCollaboratorName ||
        'AgentCollaborator';
      subTraceTitle = `Agent Invocation - ${agentName}`;
      traceType = 'ROUTING_CLASSIFIER';
      const inputText =
        traceContent.trace.routingClassifierTrace.invocationInput
          .agentCollaboratorInvocationInput?.input?.text;
      displayContent = inputText || "No 'input.text' content available.";
      fullJsonContent = JSON.stringify(traceContent, null, 2);
    }
    else if (traceContent?.trace?.routingClassifierTrace) {
      // Possibly model invocation input or output
      if (traceContent.trace.routingClassifierTrace.modelInvocationOutput) {
        subTraceTitle = 'Routing Classifier Decision';
        traceType = 'ROUTING_CLASSIFIER';
        let rawResponseContent =
          traceContent.trace.routingClassifierTrace.modelInvocationOutput
            ?.rawResponse?.content;
        if (rawResponseContent) {
          try {
            const parsedJson = JSON.parse(rawResponseContent);
            rawResponseContent = JSON.stringify(parsedJson, null, 2);
          } catch {
            // keep raw
          }
        }
        displayContent = rawResponseContent || "No 'content' attribute found.";
        fullJsonContent = JSON.stringify(traceContent, null, 2);
      } else {
        subTraceTitle = 'Classifying Intent';
        traceType = 'ROUTING_CLASSIFIER';
        let modelInputText =
          traceContent.trace.routingClassifierTrace.modelInvocationInput?.text;
        if (modelInputText) {
          try {
            const parsedJson = JSON.parse(modelInputText);
            modelInputText = JSON.stringify(parsedJson, null, 2);
          } catch {
            // keep raw
          }
        }
        displayContent = modelInputText || "No 'text' content available.";
        fullJsonContent = JSON.stringify(traceContent, null, 2);
      }
    }
    else if (
      traceContent?.trace?.orchestrationTrace?.invocationInput
        ?.knowledgeBaseLookupInput
    ) {
      subTraceTitle = 'Knowledge Base Input';
      traceType = traceContent.collaboratorName || 'KnowledgeBase';
      const knowledgeBaseInput =
        traceContent.trace.orchestrationTrace.invocationInput
          .knowledgeBaseLookupInput;
      displayContent = knowledgeBaseInput.text || "No 'text' content available.";
      fullJsonContent = JSON.stringify(traceContent, null, 2);
    }
    else if (
      traceContent?.trace?.orchestrationTrace?.observation
        ?.knowledgeBaseLookupOutput
    ) {
      subTraceTitle = 'Knowledge Base Response';
      traceType = traceContent.collaboratorName || 'KnowledgeBase';
      const knowledgeBaseOutput =
        traceContent.trace.orchestrationTrace.observation
          .knowledgeBaseLookupOutput?.retrievedReferences;
      displayContent =
        knowledgeBaseOutput
          ?.map((reference: any) => reference.content.text)
          .join('\n\n---\n\n') || "No 'text' content available.";
      fullJsonContent = JSON.stringify(traceContent, null, 2);
    }
    else if (
      traceContent?.trace?.orchestrationTrace?.invocationInput
        ?.agentCollaboratorInvocationInput
    ) {
      const agentName =
        traceContent.trace.orchestrationTrace.invocationInput
          .agentCollaboratorInvocationInput?.agentCollaboratorName ||
        'AgentCollaborator';
      subTraceTitle = `Agent Invocation - ${agentName}`;
      traceType = 'ROUTING_CLASSIFIER';
      const inputText =
        traceContent.trace.orchestrationTrace.invocationInput
          .agentCollaboratorInvocationInput?.input?.text;
      displayContent = inputText || "No 'input.text' content available.";
      fullJsonContent = JSON.stringify(traceContent, null, 2);
    }
    else if (traceContent.collaboratorName) {
      traceType = traceContent.collaboratorName;
      fullJsonContent = JSON.stringify(traceContent, null, 2);
    }

    if (!fullJsonContent) {
      fullJsonContent = JSON.stringify(traceContent || {}, null, 2);
    }

    // For "Observation," "Rationale," "Final Response," skip incrementing step
    const isRationaleFinalOrObservation =
      subTraceTitle === 'Rationale' ||
      subTraceTitle === 'Final Response' ||
      subTraceTitle === 'Observation' ||
      subTraceTitle === 'Observation - Final Response';

    const subTraceLabel = subTraceTitle;
    const currentTime = Date.now();
    let modelName = getModelLabelForTrace(traceType);

    // Optionally show current agent & subtrace in your UI
    setCurrentTrace(traceType || 'Unknown');
    setCurrentSubTrace(subTraceTitle || '');

    setMessages((prevMessages: Message[]) => {
      const updatedMessages = [...prevMessages];

      // We look for an existing trace-group for this agent name
      const existingGroupIndex = updatedMessages.findIndex(
        (msg): msg is Message & {
          type: 'trace-group';
          dropdownTitle: string;
          startTime: number;
        } => {
          if (!msg || typeof msg !== 'object') return false;
          return (
            msg.type === 'trace-group' &&
            !!msg.dropdownTitle &&
            typeof msg.dropdownTitle === 'string' &&
            msg.dropdownTitle.includes(traceType) &&
            Array.isArray(msg.tasks) &&
            typeof msg.startTime === 'number'
          );
        }
      );


      // If the model is unknown or if traceType is "ROUTING_CLASSIFIER," we remove the model name
      if (traceType === 'ROUTING_CLASSIFIER' || modelName === 'Unknown Model') {
        modelName = '';
      }

      const addSubTask = (
        parentTask: Task,
        subTaskTitle: string,
        subTaskContent: string | object,
        subTaskJson: string | null
      ) => {
        if (!parentTask.subTasks) {
          parentTask.subTasks = [];
        }
        parentTask.content = undefined;
        parentTask.fullJson = undefined;

        const subStepIndex = parentTask.subTasks.length + 1;
        const subTimeDifference = (
          (currentTime - parentTask.timestamp) /
          1000
        ).toFixed(2);

        parentTask.subTasks.push({
          title: `Step ${parentTask.stepNumber}.${subStepIndex} - ${subTaskTitle} (${subTimeDifference} seconds)`,
          content: subTaskContent,
          fullJson: subTaskJson,
          timestamp: currentTime
        });
      };

      if (existingGroupIndex !== -1) {
        // We already have a trace-group for this agent
        const currentGroup = updatedMessages[existingGroupIndex];
        const tasks = currentGroup.tasks || [];

        const nextStepNumber =
          tasks.filter(
            (t) =>
              !t.title.startsWith('Rationale') &&
              !t.title.startsWith('Final Response') &&
              !t.title.includes('Observation')
          ).length + 1;

        const lastTask = tasks[tasks.length - 1];
        const baseTimestamp = currentGroup.startTime || currentTime;
        const lastTimestamp = lastTask?.timestamp || baseTimestamp;
        const timeDifference = ((currentTime - lastTimestamp) / 1000).toFixed(2);

        // SubTask checks
        if (
          traceContent?.trace?.orchestrationTrace?.observation
            ?.actionGroupInvocationOutput
        ) {
          const lastActionGroup = [...tasks]
            .reverse()
            .find((t) => t.title.includes('Action Group Tool'));
          if (lastActionGroup) {
            const foundResponse = lastActionGroup.subTasks?.some((st) =>
              st.title.includes('Action Group Response')
            );
            if (!foundResponse) {
              addSubTask(
                lastActionGroup,
                'Action Group Response',
                displayContent || traceContent,
                fullJsonContent
              );
            }
            return updatedMessages;
          }
        }
        if (traceContent?.trace?.orchestrationTrace?.modelInvocationOutput) {
          const lastModel = [...tasks]
            .reverse()
            .find((t) => t.title.includes('Invoking Model'));
          if (lastModel) {
            const foundResponse = lastModel.subTasks?.some((st) =>
              st.title.includes('Model Invocation Response')
            );
            if (!foundResponse) {
              addSubTask(
                lastModel,
                'Model Invocation Response',
                displayContent || traceContent,
                fullJsonContent
              );
            }
            return updatedMessages;
          }
        }
        if (subTraceTitle === 'Knowledge Base Response') {
          const lastKB = [...tasks]
            .reverse()
            .find((t) => t.title.includes('Knowledge Base Tool'));
          if (lastKB) {
            const foundResponse = lastKB.subTasks?.some((st) =>
              st.title.includes('Knowledge Base Response')
            );
            if (!foundResponse) {
              addSubTask(
                lastKB,
                'Knowledge Base Response',
                displayContent || traceContent,
                fullJsonContent
              );
            }
            return updatedMessages;
          }
        }
        if (
          subTraceTitle === 'Observation' &&
          (
            traceContent?.trace?.routingClassifierTrace?.observation
              ?.agentCollaboratorInvocationOutput ||
            traceContent?.trace?.orchestrationTrace?.observation
              ?.agentCollaboratorInvocationOutput
          )
        ) {
          const lastAgentTask = [...tasks]
            .reverse()
            .find((t) => t.title.includes(traceType));
          if (lastAgentTask) {
            addSubTask(
              lastAgentTask,
              'Observation',
              displayContent || traceContent,
              fullJsonContent
            );
            return updatedMessages;
          }
        }

        // Otherwise, new main step
        const titlePrefix = isRationaleFinalOrObservation
          ? `${subTraceLabel} (${timeDifference} seconds)`
          : `Step ${nextStepNumber} - ${
              subTraceLabel === 'Knowledge Base Input'
                ? 'Knowledge Base Tool'
                : subTraceLabel
            } (${timeDifference} seconds)`;

        const newTask: Task = {
          stepNumber: isRationaleFinalOrObservation ? 0 : nextStepNumber,
          title: subTraceTitle
            ? titlePrefix
            : `Step ${nextStepNumber} (${timeDifference} seconds)`,
          content: displayContent || traceContent,
          fullJson: fullJsonContent,
          timestamp: currentTime,
          subTasks: undefined
        };

        // immediate sub-task creation
        if (subTraceTitle === 'Action Group Tool') {
          newTask.content = undefined;
          newTask.fullJson = undefined;
          newTask.subTasks = [
            {
              title: `Step ${nextStepNumber}.1 - Action Group Input (${timeDifference} seconds)`,
              content: displayContent || traceContent,
              fullJson: fullJsonContent,
              timestamp: currentTime
            }
          ];
        } else if (subTraceTitle === 'Knowledge Base Input') {
          newTask.content = undefined;
          newTask.fullJson = undefined;
          newTask.subTasks = [
            {
              title: `Step ${nextStepNumber}.1 - Knowledge Base Input (${timeDifference} seconds)`,
              content: displayContent || traceContent,
              fullJson: fullJsonContent,
              timestamp: currentTime
            }
          ];
        } else if (subTraceTitle === 'Invoking Model') {
          newTask.content = undefined;
          newTask.fullJson = undefined;
          newTask.subTasks = [
            {
              title: `Step ${nextStepNumber}.1 - Model Invocation Input (${timeDifference} seconds)`,
              content: displayContent || traceContent,
              fullJson: fullJsonContent,
              timestamp: currentTime
            }
          ];
        }

        const updatedActualStepCount =
          tasks.filter(
            (t) =>
              !t.title.startsWith('Rationale') &&
              !t.title.startsWith('Final Response') &&
              !t.title.includes('Observation')
          ).length + (isRationaleFinalOrObservation ? 0 : 1);

        if (!traceStepCounter[traceType]) {
          traceStepCounter[traceType] = 0;
        }
        traceStepCounter[traceType] += 1;

        // If modelName is empty, only show agent name/time/step
        // else show agent name + dash + model name
        const showTitle = modelName
          ? `${traceType} - ${modelName}`
          : traceType;

        updatedMessages[existingGroupIndex] = {
          ...currentGroup,
          tasks: [...tasks, newTask],
          dropdownTitle: `${showTitle} (${(
            (currentTime - baseTimestamp) /
            1000
          ).toFixed(2)} seconds, ${updatedActualStepCount} steps)`,
          text: `Sub-trace steps..`
        };

        return updatedMessages;
      }

      // ~~~~~~~~~~~~~~~~~~~~~~~~~
      // No existing group -> new trace-group
      // ~~~~~~~~~~~~~~~~~~~~~~~~~
      traceStepCounter[traceType] = 0;
      const firstTaskTitle = isRationaleFinalOrObservation
        ? `${subTraceLabel} (0 seconds)`
        : `Step 1 - ${
            subTraceLabel === 'Knowledge Base Input'
              ? 'Knowledge Base Tool'
              : subTraceLabel
          } (0 seconds)`;

      const firstTask: Task = {
        stepNumber: isRationaleFinalOrObservation ? 0 : 1,
        title: subTraceTitle ? firstTaskTitle : 'Step 1 (0 seconds)',
        content: displayContent || traceContent,
        fullJson: fullJsonContent,
        timestamp: currentTime,
        subTasks: undefined
      };

      // immediate sub-task creation
      if (subTraceTitle === 'Action Group Tool') {
        firstTask.content = undefined;
        firstTask.fullJson = undefined;
        firstTask.subTasks = [
          {
            title: 'Step 1.1 - Action Group Input (0 seconds)',
            content: displayContent,
            fullJson: fullJsonContent,
            timestamp: currentTime
          }
        ];
      } else if (subTraceTitle === 'Knowledge Base Input') {
        firstTask.content = undefined;
        firstTask.fullJson = undefined;
        firstTask.subTasks = [
          {
            title: 'Step 1.1 - Knowledge Base Input (0 seconds)',
            content: displayContent,
            fullJson: fullJsonContent,
            timestamp: currentTime
          }
        ];
      } else if (subTraceTitle === 'Invoking Model') {
        firstTask.content = undefined;
        firstTask.fullJson = undefined;
        firstTask.subTasks = [
          {
            title: 'Step 1.1 - Model Invocation Input (0 seconds)',
            content: displayContent,
            fullJson: fullJsonContent,
            timestamp: currentTime
          }
        ];
      } else if (subTraceTitle === 'Observation') {
        firstTask.content = undefined;
        firstTask.fullJson = undefined;
        firstTask.subTasks = [
          {
            title: 'Step 1.1 - Observation (0 seconds)',
            content: displayContent,
            fullJson: fullJsonContent,
            timestamp: currentTime
          }
        ];
      }

      if (traceType === 'ROUTING_CLASSIFIER' || modelName === 'Unknown Model') {
        modelName = '';
      }

      const showTitle = modelName
        ? `${traceType} - ${modelName}`
        : traceType;

      updatedMessages.push({
        sender: 'bot',
        type: 'trace-group',
        dropdownTitle: `${showTitle} (0 seconds, ${
          isRationaleFinalOrObservation ? 0 : 1
        } steps)`,
        startTime: currentTime,
        tasks: [firstTask],
        text: 'Sub-trace steps..'
      });

      return updatedMessages;
    });
  };




  const handleFinalMessage = async (data: any) => {
    setLoading(false);
    
    if (!data || typeof data !== 'object') {
      console.warn('Invalid data received in final message');
      return;
    }

    const finalText = data.content;
    if (!finalText) {
      console.warn('No content in final message');
      return;
    }

    // Retrieve possible prompt sources
    const storedPrompt = localStorage.getItem('tempPrompt') || '';
    const lastUserMessage = [...messages].reverse().find(
      msg =>
        msg.type === 'user' &&
        ((msg.text && msg.text.trim()) ||
         (msg.originalPrompt && msg.originalPrompt.trim()))
    );
    const promptFromLastMessage = lastUserMessage?.originalPrompt || lastUserMessage?.text || '';
    const promptFromRef = lastPromptRef.current || '';
    const promptFromMap = pendingPromptsMap.current.get(currentPromptId.current) || '';

    const promptToSave =
      storedPrompt || promptFromLastMessage || promptFromRef || promptFromMap || '';

    if (!promptToSave.trim()) {
      console.error('No prompt found to save to history.');
      return;
    }

    try {
      // Save to chat history
      const updatedHistory = addToChatHistory(promptToSave, finalText.trim());
      setChatHistory(updatedHistory);

      // Append a final message for the bot (in green box)
      setMessages(prevMessages => {
        return [
          ...prevMessages,
          {
            sender: 'bot',
            text: '',
            type: 'final',
            originalPrompt: promptToSave,
            style: {
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }
          },
        ];
      });

      // Show total time if any trace-group(s) exist
      const traceGroups = messages.filter(
        (m): m is Message & { startTime: number } =>
          m.type === 'trace-group' && typeof m.startTime === 'number'
      );
      if (traceGroups.length > 0) {
        const earliestStartTime = Math.min(...traceGroups.map((g) => g.startTime));
        const currentTime = Date.now();
        const totalTime = ((currentTime - earliestStartTime) / 1000).toFixed(2);
        setMessages(prevMessages => [
          ...prevMessages,
          {
            sender: 'bot',
            type: 'info',
            text: `Completion Time: ${totalTime} seconds.`
          }
        ]);
      }

      // Stream out the final text so user sees it appear gradually
      setTimeout(() => {
        streamText(finalText);
      }, 100);

      // Clear references
      lastPromptRef.current = undefined;
      pendingPromptsMap.current.delete(currentPromptId.current);
      localStorage.removeItem('tempPrompt');
    } catch (error) {
      console.error('Failed to save to chat history:', error);
    }
  };

  const streamText = (finalText: string) => {
    if (!finalText || typeof finalText !== 'string') {
      console.warn('No valid text to stream');
      return;
    }

    const textToStream = finalText.trim();
    if (textToStream.length === 0) {
      console.warn('Empty text to stream');
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      try {
        setMessages((prevMessages: Message[]) => {
          const updatedMessages = [...prevMessages];
          const lastMessageIndex = updatedMessages.length - 1;
          if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex]?.type === 'final') {
            const lastMsg = updatedMessages[lastMessageIndex];
            const partial = textToStream.slice(0, index + 1);

            updatedMessages[lastMessageIndex] = {
              ...lastMsg,
              text: partial,
              style: {
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }
            };
          }
          return updatedMessages;
        });

        if (index > 0 && index % 20 === 0) {
          scrollToBottom();
        }

        index++;
        if (index >= textToStream.length) {
          clearInterval(interval);
          scrollToBottom();
        }
      } catch (error) {
        console.error('Error in streamText:', error);
        clearInterval(interval);
      }
    }, 1);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ---------------
  // Submit Prompt
  // ---------------
  const handlePromptSubmit = async () => {
    const currentPromptValue = typeof prompt === 'string' ? prompt.trim() : '';
    if (currentPromptValue === '' || loading) return;

    if (sessionId.length < 3) {
      setError('Session ID must be at least 3 characters long.');
      return;
    }

    if (!websocketId || !websocketId.trim()) {
      setError('Please enter a valid WebSocket ID to connect.');
      return;
    }

    if (!agentId || !agentId.trim() || !aliasId || !aliasId.trim()) {
      setError('Please enter both Agent ID and Alias ID.');
      return;
    }

    // Clear old chat messages & increment prompt ID
    currentPromptId.current += 1;
    setMessages([]);

    // Add user message (blue background)
    setMessages([
      {
        sender: 'user',
        text: currentPromptValue,
        type: 'user',
        originalPrompt: currentPromptValue,
      },
    ]);

    setError(null);
    setLoading(true);
    setPrompt('');

    localStorage.setItem('tempPrompt', currentPromptValue);
    lastPromptRef.current = currentPromptValue;
    pendingPromptsMap.current.set(currentPromptId.current, currentPromptValue);

    const payload = {
      action: 'sendMessage',
      prompt: currentPromptValue,
      sessionId,
      agentId,
      aliasId,
    };

    setCurrentTrace(undefined);
    setCurrentSubTrace(undefined);

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        setLastWebsocketActivity(Date.now());
        ws.current.send(JSON.stringify(payload));
      } catch (error) {
        console.error('Error sending message:', error);
        setError('Failed to send message. Please try again.');
        setLoading(false);
      }
    } else {
      console.error('WebSocket is not open.');
      setError('Unable to connect to WebSocket.');
      setLoading(false);
    }
  };

  const handleKeyPress = (event: { key: string; preventDefault: () => void; shiftKey: boolean }) => {
    if (event.key === 'Enter' && !loading && !event.shiftKey) {
      event.preventDefault();
      handlePromptSubmit();
    }
  };

  // Tabs
  const [activeTabId, setActiveTabId] = useState('chat');
  const handleTabChange = ({ detail }: { detail: { activeTabId: string } }): void => {
    setActiveTabId(detail.activeTabId);
  };

  return (
    <AppLayout
      navigationHide={true}
      toolsHide={true}
      contentType="default"
      maxContentWidth={Number.MAX_VALUE}
      content={
        <div style={{ width: '100%' }}>
          <CloudBox display="block">
            <div style={{ width: '100%' }}>
              <Grid
                gridDefinition={[{ colspan: { default: 12 } }]}
                disableGutters={true}
              >
                <CloudBox display="block" className="main-content">
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', right: '20%', top: '10px', zIndex: 1000 }}>
                      <StatusIndicator type={wsConnected ? 'success' : 'error'}>
                        {wsConnected ? 'Connected' : 'Disconnected'}
                      </StatusIndicator>
                    </div>
                    <div style={{ marginRight: '150px' }}>
                      <Tabs
                        activeTabId={activeTabId}
                        onChange={handleTabChange}
                        tabs={[
                          {
                            id: 'chat',
                            label: 'Chat',
                            content: (
                              <>
                                <div className="main-content animate-fade-in" style={{ width: '100%' }}>
                                  {/* Prompt Input + Tracing + Session Info */}
                                  <div className="input-row">
                                    <div className="tracing-controls">
                                      <input
                                        type="checkbox"
                                        id="show-tracing"
                                        checked={showTracing}
                                        onChange={toggleTracing}
                                        className="tracing-checkbox"
                                      />
                                      <label htmlFor="show-tracing" className="tracing-label">
                                        Show Tracing
                                      </label>
                                    </div>

                                    {/* Session ID */}
                                    <div className="session-id-container">
                                      <span className="session-id-label">Session ID:</span>
                                      <input
                                        type="text"
                                        value={sessionId}
                                        onChange={(e) => {
                                          const newId = e.target.value.toUpperCase();
                                          if (newId.length <= 10) {
                                            setSessionId(newId);
                                            localStorage.setItem('mysessionid', newId);
                                          }
                                        }}
                                        className="session-id-input"
                                        maxLength={10}
                                        title="Auto-generated on page refresh"
                                      />
                                    </div>

                                    {/* WebSocket ID */}
                                    <div className="websocket-info">
                                      <span className="websocket-label">WebSocket ID:</span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Input
                                          value={websocketId}
                                          readOnly={true}
                                          type="text"
                                        />
                                      </div>
                                    </div>

                                    {/* Chat Input */}
                                    <div className="chat-input glass-container">
                                      <textarea
                                        className="custom-textarea glass-container animate-fade-in"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Type your question..."
                                        onKeyPress={handleKeyPress}
                                        rows={2}
                                        disabled={loading}
                                        style={{
                                          textDecoration: 'none',
                                          borderBottom: 'none',
                                          backgroundImage: 'none',
                                          textDecorationColor: 'transparent'
                                        }}
                                      />
                                      <div className="button-container">
                                        <Button
                                          onClick={handlePromptSubmit}
                                          variant="primary"
                                          className="button-modern animate-float"
                                          disabled={loading}
                                        >
                                          {loading ? 'Sending...' : 'Send'}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* SAMPLE QUESTIONS */}
                                  <div className="sample-questions">
                                    <div
                                      className="sample-question-link"
                                      onClick={() =>
                                        setPrompt(
                                          'I’ve been looking at headphones and speakers, but I’m not sure which ones would be best for me. What products are in stock, and provide some recommendations that you think i’d like. Also, share any feedback or reviews from other customers on the items you find. - Logged in as cust010'
                                        )
                                      }
                                    >
                                      Product Recommendations
                                    </div>
                                    <div
                                      className="sample-question-link"
                                      onClick={() =>
                                        setPrompt(
                                          'I recently bought a trackmaster smartwatch and would like to purchase some other watches. What other available items you think match my preference? Let me know of any known issues and warranty information for the products too. - Logged in as cust002'
                                        )
                                      }
                                    >
                                      Customer Preference
                                    </div>
                                    <div
                                      className="sample-question-link"
                                      onClick={() =>
                                        setPrompt(
                                          "My smartwatch's screen stopped responding suddenly, even though the battery is fully charged. I tried restarting it, but the issue persists. Recommend me a fix please, along with some other watches you think I might like. - Logged in as cust005"
                                        )
                                      }
                                    >
                                      Troubleshoot Watch
                                    </div>
                                    <div
                                      className="sample-question-link"
                                      onClick={() =>
                                        setPrompt(
                                          'I like affordable electronics. Are there any available products in stock that match my preference? Also, give me the most common troubleshooting steps or FAQs for these products. - Logged in as cust007'
                                        )
                                      }
                                    >
                                      Recommendation & FAQ
                                    </div>
                                    <div
                                      className="sample-question-link"
                                      onClick={() =>
                                        setPrompt(
                                          'Recommend me products that other customers liked for high-tech and eco-friendly gadgets. Then, provide me the feedback customers had for these products from the past?'
                                        )
                                      }
                                    >
                                      Recommendation & Product Inquiry
                                    </div>
                                  </div>

                                  {/* COPY STATUS */}
                                  {copyStatus && (
                                    <CloudBox margin={{ bottom: 's' }}>
                                      <StatusIndicator type="success">{copyStatus}</StatusIndicator>
                                    </CloudBox>
                                  )}

                                  {/* ERROR MESSAGE */}
                                  {error && <div className="error-message">{error}</div>}

                                  {/* WEBSOCKET WARNING */}
                                  {websocketWarning && (
                                    <div
                                      className="error-message"
                                      style={{ backgroundColor: 'darkred', padding: '10px', margin: '10px 0' }}
                                    >
                                      {websocketWarning}
                                    </div>
                                  )}

                                  {/* CHAT MAIN (history) */}
                                  <CloudBox
                                    className="chat-main"
                                    variant="div"
                                    fontSize="body-m"
                                    color="text-body-secondary"
                                    padding={{ vertical: 'xs' }}
                                  >
                                    <CloudBox className="chat-history animate-fade-in" padding={{ vertical: 'xs' }}>
                                      {messages.map((msg, index) => {
                                        // Hide trace-group messages if showTracing is false
                                        if (msg.type === 'trace-group' && !showTracing) {
                                          return null;
                                        }

                                        // Apply final green styling if msg.type==='final'
                                        // For the user bubble, it will have a blue background
                                        // For trace-group with a final step, we mark it "completed-trace"
                                        if (msg.type === 'trace-group') {
                                          // Decide if we show "completed-trace"
                                          // i.e. if tasks contain a "Final Response"
                                          const hasFinalResponse = msg.tasks?.some((task) =>
                                            task.title.includes('Final Response')
                                          );
                                          return (
                                            <div
                                              key={index}
                                              className={`chat-bubble bot-bubble trace-group-bubble ${
                                                hasFinalResponse ? 'completed-trace' : ''
                                              }`}
                                            >
                                              <ExpandableSection
                                                header={msg.dropdownTitle || ''}
                                                defaultExpanded={false}
                                              >
                                                {msg.tasks?.map((task, taskIndex) => (
                                                  <ExpandableSection
                                                    key={taskIndex}
                                                    header={task.title}
                                                    defaultExpanded={false}
                                                  >
                                                    <pre className="trace-content">
                                                      {typeof task.content === 'object'
                                                        ? JSON.stringify(task.content, null, 2)
                                                        : task.content}
                                                    </pre>
                                                    {task.fullJson && (
                                                      <details>
                                                        <summary>View Full JSON</summary>
                                                        <pre className="trace-content">
                                                          {task.fullJson}
                                                        </pre>
                                                      </details>
                                                    )}
                                                    {task.subTasks &&
                                                      task.subTasks.map((subTask, subIndex) => (
                                                        <ExpandableSection
                                                          key={subIndex}
                                                          header={subTask.title}
                                                          defaultExpanded={false}
                                                        >
                                                          <pre className="trace-content">
                                                            {typeof subTask.content === 'object'
                                                              ? JSON.stringify(subTask.content, null, 2)
                                                              : subTask.content}
                                                          </pre>
                                                          {subTask.fullJson && (
                                                            <details>
                                                              <summary>View Full JSON</summary>
                                                              <pre className="trace-content">
                                                                {subTask.fullJson}
                                                              </pre>
                                                            </details>
                                                          )}
                                                        </ExpandableSection>
                                                      ))}
                                                  </ExpandableSection>
                                                ))}
                                              </ExpandableSection>
                                            </div>
                                          );
                                        }

                                        return (
                                          <div
                                            key={index}
                                            className={`chat-bubble ${
                                              msg.sender === 'user'
                                                ? 'user-bubble user-blue-background'
                                                : msg.type === 'final'
                                                ? 'bot-bubble final-bubble-green'
                                                : 'bot-bubble'
                                            }`}
                                          >
                                            <div
                                              className="message-text"
                                              style={{
                                                ...(msg.style || {}),
                                                lineHeight: '1.5'
                                              }}
                                            >
                                              {msg.text}
                                            </div>
                                          </div>
                                        );
                                      })}

                                      {/* Loading indicator */}
                                      {loading && (
                                        <LoadingMessage
                                          currentTrace={currentTrace}
                                          currentSubTrace={currentSubTrace}
                                        />
                                      )}
                                      <div ref={chatEndRef} />
                                    </CloudBox>
                                  </CloudBox>

                                  {/* Chat History */}
                                  <ChatHistory />
                                </div>
                              </>
                            )
                          },
                          {
                            id: 'documents',
                            label: 'Data',
                            content: <Documents />
                          },
                          {
                            id: 'workflow',
                            label: 'Workflow',
                            content: <Workflow />
                          }
                        ]}
                      />
                    </div>
                  </div>
                </CloudBox>
              </Grid>
            </div>
          </CloudBox>
        </div>
      }
    />
  );
};

export default Chatbot;
