import { agentConfig, isRoutingClassifierAgent } from './agentConfig';

// Types
export interface SubTask {
  title: string;
  content: string | object;
  fullJson: string | null;
  timestamp: number;
}

export interface Task {
  stepNumber: number;
  title: string;
  content?: string | object;
  fullJson?: string | null;
  timestamp: number;
  subTasks?: SubTask[];
  // Internal properties to track related tasks
  _groupId?: string;
  _parentTaskIndex?: number;
  _agentId?: string;  // Track which agent this task belongs to
  _modelInvocationId?: string;  // For identifying paired model input/output operations
}

export interface TraceGroup {
  id: string;
  type: 'trace-group';
  sender: 'bot';
  dropdownTitle: string;
  startTime: number;
  tasks: Task[];
  text: string;
  agentId: string; // Specific agent identifier for exact matching
  originalAgentType?: string; // Original agent type from the trace data
  orchestrationTraceType?: string; // Type of orchestration trace
  lastUpdateTime?: number; // Last time this trace group was updated
  isComplete?: boolean; // Whether this trace group has completed its work
  finalElapsedTime?: string; // Final elapsed time when trace is completed
}

export interface Message {
  id: string;
  type: string;
  content: React.ReactNode;
  timestamp: string;
  sortKey?: number;
}

export interface TraceState {
  messages: (Message | TraceGroup)[];
  currentTrace: string;
  currentSubTrace: string;
  traceStepCounter: { [key: string]: number };
}

// Constants for agent types
const AGENT_TYPES = {
  ROUTING_CLASSIFIER: 'ROUTING_CLASSIFIER',
  SUPERVISOR: 'SupervisorAgent',
  PRODUCT_RECOMMENDATION: 'ProductRecommendationAgent',
  TROUBLESHOOT: 'TroubleshootAgent',
  PERSONALIZATION: 'PersonalizationAgent',
  ORDER_MANAGEMENT: 'OrderManagementAgent'
};

// Normalized names and patterns for agent identification
const AGENT_PATTERNS = {
  SUPERVISOR: ['supervisor', 'unknown', 'main', 'orchestrator'],
  ROUTING_CLASSIFIER: ['routing', 'classifier', 'router'],
  PRODUCT_RECOMMENDATION: ['product', 'recommendation', 'recommend'],
  TROUBLESHOOT: ['trouble', 'issue', 'support'],
  PERSONALIZATION: ['personal', 'preference'],
  ORDER_MANAGEMENT: ['order', 'management', 'shipping']
};

// Map known agents to model names
export function getModelLabelForTrace(traceType: string): string {
  switch (traceType) {
    case AGENT_TYPES.SUPERVISOR:
    case 'Supervisor':
      return 'Nova Pro';
    case AGENT_TYPES.PRODUCT_RECOMMENDATION:
    case 'ProductRecommendation':
      return 'Sonnet 3.5 V2';
    case AGENT_TYPES.TROUBLESHOOT:
    case 'Troubleshoot':
      return 'Haiku 3.5';
    case AGENT_TYPES.PERSONALIZATION:
    case 'Personalization':
      return 'Sonnet 3 V1';
    case AGENT_TYPES.ORDER_MANAGEMENT:
    case 'OrderManagement':
      return 'Sonnet 3 V1';
    case AGENT_TYPES.ROUTING_CLASSIFIER:
      return 'Nova Micro V1';
    default:
      // Default to Supervisor model for unknown traces
      return 'Nova Pro';
  }
}

// Parse JSON trace data from string
export function parseTraceJson(traceString: string): any {
  try {
    return JSON.parse(traceString);
  } catch (e) {
    try {
      // Try to extract JSON from the string if direct parsing fails
      const jsonMatch = traceString.match(/\{.*\}/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e2) {
      console.error('Failed to parse trace JSON:', e2);
    }
    console.error('Failed to parse trace JSON:', e);
    return null;
  }
}

// Enhanced function to identify agent type from trace data
function getAgentTypeFromTrace(traceData: any): string {
  // Handle null or undefined case
  if (!traceData) return AGENT_TYPES.SUPERVISOR;

  // Skip detailed logging to prevent console flooding

  // --- FIRST PRIORITY: Check for explicit routing classifier trace ---
  if (traceData?.trace?.routingClassifierTrace) {
    console.log('Detected routing classifier by trace structure');
    return AGENT_TYPES.ROUTING_CLASSIFIER;
  }

  // --- SECOND PRIORITY: Check for exact string matches for known agent names ---
  // These are highest priority exact matches for the common cases
  if (traceData?.agentName === 'routing_classifier' || 
      traceData?.collaboratorName === 'routing_classifier' ||
      traceData?.agentName === 'ROUTING_CLASSIFIER' || 
      traceData?.collaboratorName === 'ROUTING_CLASSIFIER') {
    console.log('Exact match for routing_classifier');
    return AGENT_TYPES.ROUTING_CLASSIFIER;
  }
  
  if (traceData?.agentName === 'Supervisor' || 
      traceData?.collaboratorName === 'Supervisor') {
    console.log('Exact match for Supervisor');
    return AGENT_TYPES.SUPERVISOR;
  }
  
  if (traceData?.agentName === 'Unknown' || 
      traceData?.collaboratorName === 'Unknown') {
    console.log('Exact match for Unknown - treating as Supervisor');
    return AGENT_TYPES.SUPERVISOR;
  }

  // --- THIRD PRIORITY: Check pattern matching on agent names ---
  // Check agent name fields (this is most reliable)
  const getAgentTypeByName = (name: string | undefined | null): string | null => {
    if (!name) return null;
    
    const normalizedName = name.toLowerCase();
    
    // Check each agent pattern
    for (const [agentType, patterns] of Object.entries(AGENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (normalizedName.includes(pattern)) {
          console.log(`Matched ${agentType} by name pattern: ${pattern} in ${normalizedName}`);
          return AGENT_TYPES[agentType as keyof typeof AGENT_TYPES];
        }
      }
    }
    
    return null;
  };
  
  // Check collaborator name first (highest priority)
  const collaboratorType = getAgentTypeByName(traceData.collaboratorName);
  if (collaboratorType) return collaboratorType;
  
  // Check agent name next
  const agentNameType = getAgentTypeByName(traceData.agentName);
  if (agentNameType) return agentNameType;
  
  // --- FOURTH PRIORITY: Check routing classifier by ID patterns ---
  if (isRoutingClassifierAgent(traceData.agentId, traceData.agentAliasId)) {
    console.log('Identified routing classifier by ID match');
    return AGENT_TYPES.ROUTING_CLASSIFIER;
  }
  
  // --- FIFTH PRIORITY: Direct ID mappings ---
  if (traceData?.agentId) {
    // Map specific agent IDs to known agent types
    const agentIdMappings: {[key: string]: string} = {
      'JLAUZVXIEP': AGENT_TYPES.SUPERVISOR,
      'C5OJLXHGGP': AGENT_TYPES.PERSONALIZATION,
      '3VN79S4INA': AGENT_TYPES.ORDER_MANAGEMENT,
      'ROUTING': AGENT_TYPES.ROUTING_CLASSIFIER,
      'ROUTER': AGENT_TYPES.ROUTING_CLASSIFIER,
      'CLASSIFIER': AGENT_TYPES.ROUTING_CLASSIFIER
    };
    
    if (agentIdMappings[traceData.agentId]) {
      console.log(`Identified agent by ID mapping: ${traceData.agentId} -> ${agentIdMappings[traceData.agentId]}`);
      return agentIdMappings[traceData.agentId];
    }
    
    // Check for substring matches in IDs
    if (traceData.agentId.toUpperCase().includes('SUPERVISOR')) {
      return AGENT_TYPES.SUPERVISOR;
    }
    if (traceData.agentId.toUpperCase().includes('ROUTING') || 
        traceData.agentId.toUpperCase().includes('CLASSIFIER')) {
      return AGENT_TYPES.ROUTING_CLASSIFIER;
    }
  }

  // --- SIXTH PRIORITY: Check orchestration trace patterns ---
  if (traceData?.trace?.orchestrationTrace) {
    const trace = traceData.trace.orchestrationTrace;
    
    // Supervisor pattern detection (highest priority in orchestration traces)
    if (trace.rationale || trace.observation?.finalResponse) {
      console.log('Identified supervisor by rationale/final response pattern');
      return AGENT_TYPES.SUPERVISOR;
    }
    
    // Check for agent collaborator patterns
    if (trace.invocationInput?.agentCollaboratorInvocationInput) {
      const agentName = trace.invocationInput.agentCollaboratorInvocationInput.agentCollaboratorName;
      if (agentName) {
        const collaboratorType = getAgentTypeByName(agentName);
        if (collaboratorType) {
          console.log(`Identified collaborator type from orchestration: ${collaboratorType}`);
          return collaboratorType;
        }
      }
    }
    
    // Check for agent collaborator observation patterns
    if (trace.observation?.agentCollaboratorInvocationOutput) {
      const agentName = trace.observation.agentCollaboratorInvocationOutput.agentCollaboratorName;
      if (agentName) {
        const collaboratorType = getAgentTypeByName(agentName);
        if (collaboratorType) {
          console.log(`Identified collaborator type from output: ${collaboratorType}`);
          return collaboratorType;
        }
      }
    }
    
    // Check for model input text patterns
    if (trace.modelInvocationInput?.text) {
      const text = trace.modelInvocationInput.text.toLowerCase();
      
      if (text.includes('supervisor') || text.includes('orchestrat')) {
        console.log('Identified supervisor by model input text');
        return AGENT_TYPES.SUPERVISOR;
      }
      
      if (text.includes('routing') || text.includes('classifier') || text.includes('ROUTING_CLASSIFIER')) {
        console.log('Identified routing classifier by model input text');
        return AGENT_TYPES.ROUTING_CLASSIFIER;
      }
    }
  }

  // Knowledge base pattern detection - identify the agent using it
  if (traceData?.trace?.orchestrationTrace?.observation?.type === 'KNOWLEDGE_BASE' ||
      traceData?.trace?.orchestrationTrace?.observation?.knowledgeBaseLookupOutput ||
      traceData?.trace?.orchestrationTrace?.invocationInput?.knowledgeBaseLookupInput) {
    
    const trace = traceData.trace.orchestrationTrace;
    
    // Try to determine which agent is using the KB
    if (trace?.invocationInput?.knowledgeBaseLookupInput?.text) {
      const query = trace.invocationInput.knowledgeBaseLookupInput.text.toLowerCase();
      
      // Check query text against agent patterns
      for (const [agentType, patterns] of Object.entries(AGENT_PATTERNS)) {
        for (const pattern of patterns) {
          if (query.includes(pattern)) {
            console.log(`Matched KB query to ${agentType} by pattern: ${pattern}`);
            return AGENT_TYPES[agentType as keyof typeof AGENT_TYPES];
          }
        }
      }
    }
    
    // Return the original agent type for KB operations
    return traceData.collaboratorName || AGENT_TYPES.SUPERVISOR;
  }
  
  // Check for specific content patterns in model invocations
  if (traceData?.trace?.orchestrationTrace?.modelInvocationOutput?.rawResponse?.content) {
    const content = traceData.trace.orchestrationTrace.modelInvocationOutput.rawResponse.content;
    if (typeof content === 'string') {
      const normalizedContent = content.toLowerCase();
      
      // Check content against agent patterns
      for (const [agentType, patterns] of Object.entries(AGENT_PATTERNS)) {
        for (const pattern of patterns) {
          if (normalizedContent.includes(pattern)) {
            console.log(`Matched content to ${agentType} by pattern: ${pattern}`);
            return AGENT_TYPES[agentType as keyof typeof AGENT_TYPES];
          }
        }
      }
    }
  }
  
  // Fallback to Supervisor for unknown traces that look like coordination
  if (traceData?.trace?.orchestrationTrace?.modelInvocationInput ||
      traceData?.trace?.orchestrationTrace?.modelInvocationOutput) {
    console.log('Identified coordination pattern - treating as Supervisor');
    return AGENT_TYPES.SUPERVISOR;
  }
  
  // Final fallback - assume it's the Supervisor
  console.log('%c🔍 [Supervisor] No specific agent type identified - defaulting to Supervisor', 'color: #9C27B0; font-weight: bold;');
  
  // Enhance trace data with explicit supervisor identification
  if (traceData) {
    // If no collaboratorName exists yet, add it
    if (!traceData.collaboratorName) {
      traceData.collaboratorName = 'Supervisor';
    }
    
    // If no agentId exists that could help identify this trace later, add one
    if (!traceData.agentId) {
      traceData.agentId = 'SUPERVISOR_MAIN';
    }
  }
  
  return AGENT_TYPES.SUPERVISOR;
}

// Helper function to determine the specific trace type for step titles
function getStepTitle(traceContent: any): string {
  if (!traceContent) return "";

  // First check for routing classifier specific traces
  if (traceContent.trace?.routingClassifierTrace) {
    // Check for various components in order of specificity
    if (traceContent.trace.routingClassifierTrace.modelInvocationInput) {
      return "Classifying Intent";
    }
    if (traceContent.trace.routingClassifierTrace.modelInvocationOutput) {
      return "Routing Classifier Decision";
    }
    if (traceContent.trace.routingClassifierTrace.invocationInput?.agentCollaboratorInvocationInput) {
      const agentName = traceContent.trace.routingClassifierTrace.invocationInput
        .agentCollaboratorInvocationInput?.agentCollaboratorName || 'Agent';
      return `Agent Invocation - ${agentName}`;
    }
    if (traceContent.trace.routingClassifierTrace.observation?.finalResponse) {
      return "Final Response";
    }
    return "Routing Classification";
  }

  // Check orchestration traces
  if (traceContent.trace?.orchestrationTrace) {
    // Model invocation
    if (traceContent.trace.orchestrationTrace.modelInvocationInput) {
      return "Invoking Model";
    }
    if (traceContent.trace.orchestrationTrace.modelInvocationOutput) {
      return "Invoking Model";
    }
    
    // Agent collaborator invocation
    if (traceContent.trace.orchestrationTrace.invocationInput?.agentCollaboratorInvocationInput) {
      const agentName = traceContent.trace.orchestrationTrace.invocationInput
        .agentCollaboratorInvocationInput?.agentCollaboratorName || 'Agent';
      return `Agent Invocation - ${agentName}`;
    }
    
    // Knowledge base lookups
    if (traceContent.trace.orchestrationTrace.invocationInput?.knowledgeBaseLookupInput) {
      // Use more descriptive name for knowledge base query
      return "Knowledge Base Tool";
    }
    if (traceContent.trace.orchestrationTrace.observation?.knowledgeBaseLookupOutput) {
      // Use more descriptive name for knowledge base results
      return "Knowledge Base Results";
    }
    
    // Action groups - combine tool and result into a unified "Action Group Tool" step
    if (traceContent.trace.orchestrationTrace.invocationInput?.actionGroupInvocationInput) {
      const actionGroup = traceContent.trace.orchestrationTrace.invocationInput.actionGroupInvocationInput;
      
      // Extract action group name for consistent pairing with outputs but don't display in title
      if (actionGroup.actionGroupName || actionGroup.name) {
        // Store the action group name as a property on the trace content for matching with outputs
        traceContent._actionGroupName = actionGroup.actionGroupName || actionGroup.name;
      }
      
      return "Action Group Tool";
    }
    if (traceContent.trace.orchestrationTrace.observation?.actionGroupInvocationOutput) {
      // Use Action Group Input instead of plain Action Group for better subtask matching
      return "Action Group Output"; // Use a clearer name for outputs
    }
    
    // Final response and rationale
    if (traceContent.trace.orchestrationTrace.observation?.finalResponse) {
      return "Final Response";
    }
    if (traceContent.trace.orchestrationTrace.rationale) {
      return "Rationale";
    }
    
    // Agent output
    if (traceContent.trace.orchestrationTrace.observation?.agentCollaboratorInvocationOutput) {
      return "Observation";
    }
  }

  // Default if no specific type found
  return "Processing";
}

// Helper function to determine model invocation operation type
function getModelInvocationOperationType(traceContent: any): string | null {
  if (!traceContent || !traceContent.trace?.orchestrationTrace) return null;
  
  if (traceContent.trace.orchestrationTrace.modelInvocationInput) {
    return "Model Input";  // Input operation
  }
  if (traceContent.trace.orchestrationTrace.modelInvocationOutput) {
    return "Model Output";  // Output operation
  }
  
  // Check for any model invocation pattern to support nesting
  if (traceContent.trace?.orchestrationTrace?.modelInvocationInput || 
      traceContent.trace?.orchestrationTrace?.modelInvocationOutput) {
    return "Model Operation";  // General operation for grouping
  }
  
  return null;
}

// Helper function to determine the knowledge base operation type
function getKnowledgeBaseOperationType(traceContent: any): string | null {
  if (!traceContent || !traceContent.trace?.orchestrationTrace) return null;
  
  if (traceContent.trace.orchestrationTrace.invocationInput?.knowledgeBaseLookupInput) {
    return "Knowledge Base Query";  // Consistently use "Query" instead of "Input"
  }
  if (traceContent.trace.orchestrationTrace.observation?.knowledgeBaseLookupOutput) {
    return "Knowledge Base Results";  // Consistently use "Results" instead of "Output"
  }
  
  return null;
}

// Helper function to determine the action group operation type
function getActionGroupOperationType(traceContent: any): string | null {
  if (!traceContent || !traceContent.trace?.orchestrationTrace) return null;
  
  if (traceContent.trace.orchestrationTrace.invocationInput?.actionGroupInvocationInput) {
    return "Action Group Input";
  }
  if (traceContent.trace.orchestrationTrace.observation?.actionGroupInvocationOutput) {
    return "Action Group Output";
  }
  
  return null;
}

// Format ResultSet data from action group output into a readable table format
function formatResultSetData(result: any): string {
  if (!result || !result.ResultSet || !result.ResultSet.Rows || !Array.isArray(result.ResultSet.Rows)) {
    return JSON.stringify(result, null, 2);
  }
  
  const rows = result.ResultSet.Rows;
  if (rows.length < 2) {
    return JSON.stringify(result, null, 2);
  }
  
  try {
    // Extract headers from first row
    const headers = rows[0].Data.map((item: any) => item.VarCharValue);
    
    // Create a markdown table
    let table = "### Query Result\n\n";
    
    // Add header row
    table += "| " + headers.join(" | ") + " |\n";
    
    // Add separator row
    table += "| " + headers.map(() => "---").join(" | ") + " |\n";
    
    // Add data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const values = row.Data.map((item: any) => item.VarCharValue || "");
      table += "| " + values.join(" | ") + " |\n";
    }
    
    // Add metadata information
    if (result.UpdateCount !== undefined) {
      table += "\n**Update Count:** " + result.UpdateCount;
    }
    
    if (result.ResultSet.ResultSetMetadata?.ColumnInfo) {
      const columnInfo = result.ResultSet.ResultSetMetadata.ColumnInfo;
      table += "\n\n### Column Metadata\n\n";
      columnInfo.forEach((col: any) => {
        table += `- **${col.Name}** (${col.Type})\n`;
      });
    }
    
    return table;
  } catch (e) {
    console.error("Error formatting ResultSet data:", e);
    return JSON.stringify(result, null, 2);
  }
}

// Handle a trace message and update trace state
export function handleTraceMessage(
  message: { type: string; content: any },
  state: TraceState,
  callback: (state: TraceState) => TraceState
): void {
  if (message.type === 'trace' && message.content) {
    // Process the trace data
    const newState = processTraceData(
      state,
      message.content.sessionId || message.content.agentId || String(Date.now()),
      message.content,
      message.content.text || 'Processing...',
      Date.now()
    );
    
    // Apply the callback with the new state
    callback(newState);
  }
}

  // Process trace data to extract content for display
function extractTraceContent(traceContent: any): { 
  displayContent: string | null, 
  fullJsonContent: string | null 
} {
  if (!traceContent) {
    return { displayContent: null, fullJsonContent: null };
  }
  
  let displayContent: string | null = null;
  let fullJsonContent: string | null = JSON.stringify(traceContent, null, 2);
  
  // Handle routing classifier traces
  if (traceContent.trace?.routingClassifierTrace) {
    // Model invocation input
    if (traceContent.trace.routingClassifierTrace.modelInvocationInput?.text) {
      displayContent = traceContent.trace.routingClassifierTrace.modelInvocationInput.text;
    }
    // Model invocation output
    else if (traceContent.trace.routingClassifierTrace.modelInvocationOutput?.rawResponse?.content) {
      displayContent = typeof traceContent.trace.routingClassifierTrace.modelInvocationOutput.rawResponse.content === 'string' 
        ? traceContent.trace.routingClassifierTrace.modelInvocationOutput.rawResponse.content
        : JSON.stringify(traceContent.trace.routingClassifierTrace.modelInvocationOutput.rawResponse.content, null, 2);
    }
    // Agent collaborator invocation
    else if (traceContent.trace.routingClassifierTrace.invocationInput?.agentCollaboratorInvocationInput?.input?.text) {
      displayContent = traceContent.trace.routingClassifierTrace.invocationInput.agentCollaboratorInvocationInput.input.text;
    }
    // Agent collaborator output
    else if (traceContent.trace.routingClassifierTrace.observation?.agentCollaboratorInvocationOutput?.output?.text) {
      displayContent = traceContent.trace.routingClassifierTrace.observation.agentCollaboratorInvocationOutput.output.text;
    }
    // Final response
    else if (traceContent.trace.routingClassifierTrace.observation?.finalResponse?.text) {
      displayContent = traceContent.trace.routingClassifierTrace.observation.finalResponse.text;
    }
  }
  
  // Handle orchestration traces
  else if (traceContent.trace?.orchestrationTrace) {
    // We're no longer setting displayContent for model invocation input here
    // Instead, we'll handle it as a subtask in processTraceData
    if (traceContent.trace.orchestrationTrace.modelInvocationOutput?.rawResponse?.content) {
      displayContent = typeof traceContent.trace.orchestrationTrace.modelInvocationOutput.rawResponse.content === 'string'
        ? traceContent.trace.orchestrationTrace.modelInvocationOutput.rawResponse.content
        : JSON.stringify(traceContent.trace.orchestrationTrace.modelInvocationOutput.rawResponse.content, null, 2);
    }
    // Knowledge base input
    else if (traceContent.trace.orchestrationTrace.invocationInput?.knowledgeBaseLookupInput) {
      console.log('Found Knowledge Base Input trace');
      const kbInput = traceContent.trace.orchestrationTrace.invocationInput.knowledgeBaseLookupInput;
      displayContent = kbInput.text || JSON.stringify(kbInput, null, 2);
    }
    // Knowledge base output
    else if (traceContent.trace.orchestrationTrace.observation?.knowledgeBaseLookupOutput) {
      console.log('[Knowledge Base] Found Knowledge Base Output trace');
      const kbOutput = traceContent.trace.orchestrationTrace.observation.knowledgeBaseLookupOutput;
      
      if (kbOutput.retrievedReferences && kbOutput.retrievedReferences.length > 0) {
        // Format references if available
        displayContent = "### KNOWLEDGE BASE RESPONSE ###\n\n" + kbOutput.retrievedReferences
          .map((ref: any, index: number) => {
            const source = ref.source ? `Source: ${ref.source}\n` : '';
            const text = ref.content && ref.content.text ? ref.content.text : 'No content available';
            return `Reference ${index + 1}:\n${source}${text}`;
          })
          .join('\n\n---\n\n');
      } else {
        // If no references, show the whole output
        displayContent = "### KNOWLEDGE BASE RESPONSE ###\n\n" + JSON.stringify(kbOutput, null, 2);
      }

      // Save the raw KB response JSON for debugging
      console.log('[Knowledge Base] Raw KB response:', kbOutput);
    }
    // Action group input
    else if (traceContent.trace.orchestrationTrace.invocationInput?.actionGroupInvocationInput) {
      console.log('Found Action Group Input trace');
      const actionInput = traceContent.trace.orchestrationTrace.invocationInput.actionGroupInvocationInput;
      
      // Try to extract meaningful content from action group input
      let actionContent = '';
      if (actionInput.requestBody?.content?.['application/json']) {
        const jsonContent = actionInput.requestBody.content['application/json'];
        if (Array.isArray(jsonContent) && jsonContent.length > 0 && jsonContent[0].value) {
          actionContent = JSON.stringify(jsonContent[0].value, null, 2);
        }
      }
      
      displayContent = actionContent || JSON.stringify(actionInput, null, 2);
    }
    // Action group output
    else if (traceContent.trace.orchestrationTrace.observation?.actionGroupInvocationOutput) {
      console.log('Found Action Group Output trace');
      const actionOutput = traceContent.trace.orchestrationTrace.observation.actionGroupInvocationOutput;
      
      if (actionOutput.text) {
        try {
          // Try to parse and prettify any JSON in the text
          const parsedOutput = JSON.parse(actionOutput.text as string);

          // Check for the specific ResultSet structure
          if (parsedOutput.result && parsedOutput.result.ResultSet && 
              parsedOutput.result.ResultSet.Rows && Array.isArray(parsedOutput.result.ResultSet.Rows)) {
            console.log('Detected ResultSet structure in action group output');
            displayContent = formatResultSetData(parsedOutput.result);
          } else {
            // Standard JSON formatting
            displayContent = JSON.stringify(parsedOutput, null, 2);
          }
        } catch (e) {
          // Not JSON, use as is
          displayContent = actionOutput.text as string;
        }
      } else {
        // Fall back to full output
        displayContent = JSON.stringify(actionOutput, null, 2);
      }
    }
    // Rationale
    else if (traceContent.trace.orchestrationTrace.rationale?.text) {
      displayContent = traceContent.trace.orchestrationTrace.rationale.text;
    }
    // Final response
    else if (traceContent.trace.orchestrationTrace.observation?.finalResponse?.text) {
      displayContent = traceContent.trace.orchestrationTrace.observation.finalResponse.text;
    }
    // Agent collaborator invocation
    else if (traceContent.trace.orchestrationTrace.invocationInput?.agentCollaboratorInvocationInput?.input?.text) {
      displayContent = traceContent.trace.orchestrationTrace.invocationInput.agentCollaboratorInvocationInput.input.text;
    }
    // Agent collaborator output
    else if (traceContent.trace.orchestrationTrace.observation?.agentCollaboratorInvocationOutput?.output?.text) {
      displayContent = traceContent.trace.orchestrationTrace.observation.agentCollaboratorInvocationOutput.output.text;
    }
  }
  
  return { displayContent, fullJsonContent };
}

// Helper to determine if a trace should increment the step counter
function shouldIncrementStepCounter(stepTitle: string, existingTraceGroup: TraceGroup | null): boolean {
  // Get previous step title if available
  const previousTitle = existingTraceGroup?.tasks?.length 
    ? existingTraceGroup.tasks[existingTraceGroup.tasks.length - 1].title 
    : null;
  
  // Group these related pairs together as single steps
  if (previousTitle) {
    // If previous step was Knowledge Base Query, don't increment for Knowledge Base Results
    if (previousTitle.includes("Knowledge Base Query") && stepTitle === "Knowledge Base Results") {
      return false;
    }
    
    // ActionGroupTool should always get its own step number, don't use this pairing logic for it
    
    // ALWAYS increment for Invoking Model steps to ensure each gets its own step number
    if (stepTitle === "Invoking Model") {
      return true;
    }
  }
  
  // These specific titles should always increment the step counter
  return stepTitle === "Invoking Model" || 
         // Removed "rationale" and "Rationale" from the list to fix step numbering issue
         stepTitle === "Knowledge Base Tool" ||
         stepTitle === "Action Group Tool" ||  // Always increment for Action Group Tool steps
         stepTitle.includes("Action Group Tool:"); 
}

// Classify a trace item to determine if it should be a subtask
function isSubtaskTrace(traceType: string, stepTitle: string): boolean {
  // These are parent task titles - they should be top-level steps
  if (stepTitle === "Knowledge Base" || 
      stepTitle.includes("Knowledge Base (") ||
      stepTitle === "Knowledge Base Tool" || 
      stepTitle.includes("Knowledge Base Tool (") ||
      stepTitle.includes("Action Group Tool") ||
      shouldIncrementStepCounter(stepTitle, null)) {
    // Special case for "Invoking Model" - first occurrence is a main step,
    // subsequent occurrences should be subtasks handled in processTraceData
    if (stepTitle === "Invoking Model") {
      console.log('Found Invoking Model. Will be treated as main step or subtask based on context');
      // Let the context in processTraceData determine whether this is a subtask
      return false;
    }
    return false; // These are main steps
  }
  
  // Specific operation types that should always be treated as subtasks
  if (stepTitle === "Knowledge Base Input" || 
      stepTitle === "Knowledge Base Output" ||
      stepTitle === "Action Group Input" ||
      stepTitle === "Action Group Output" ||
      stepTitle === "Action Group" || // Plain "Action Group" is always a subtask
      stepTitle === "Model Input" ||  // Model invocation subtasks
      stepTitle === "Model Output" || // Model invocation subtasks
      stepTitle.toLowerCase().includes("knowledge base query") ||
      stepTitle.toLowerCase().includes("knowledge base results") ||
      stepTitle.toLowerCase().includes("action group input") ||
      stepTitle.toLowerCase().includes("action group output") ||
      stepTitle.toLowerCase().includes("action group result")) {
    console.log(`Identified subtask: ${stepTitle}`);
    return true;
  }
  
  return false;
}

// Helper to determine if a trace is a "special" type outside the normal step numbering
function isSpecialTraceType(stepTitle: string): boolean {
  return stepTitle === 'Final Response' || 
         stepTitle === 'Observation' || 
         stepTitle === 'Rationale';
}

// Helper function to add a subtask to a parent task
export function addSubTask(
  parentTask: Task,
  subTaskTitle: string,
  subTaskContent: string | object,
  subTaskJson: string | null,
  currentTime: number
): void {
  if (!parentTask.subTasks) {
    parentTask.subTasks = [];
  }
  
  // Special handling for content - make sure it's visible as a property
  if (!parentTask.content) {
    // If the parent task doesn't have content but the subtask does,
    // add a placeholder to ensure the dropdown displays properly
    parentTask.content = "This step contains multiple substeps...";
  }
  
  // Check if we already have a subtask with a similar title (ignoring timing info)
  const normalizedTitle = subTaskTitle.replace(/\(\d+\.?\d* seconds\)/, '').trim();
  const existingSubtaskIndex = parentTask.subTasks.findIndex(subtask => 
    subtask.title.includes(normalizedTitle)
  );
  
  // Calculate elapsed time from parent task start
  const subTimeDifference = (
    (currentTime - parentTask.timestamp) /
    1000
  ).toFixed(2);

  const formattedSubTaskTime = parseFloat(subTimeDifference).toFixed(2);
  
  if (existingSubtaskIndex >= 0) {
    // Update existing subtask with new timing
    const existingSubtask = parentTask.subTasks[existingSubtaskIndex];
    // Calculate time since last update for this subtask
    const timeSinceUpdate = ((currentTime - existingSubtask.timestamp) / 1000).toFixed(2);
    
    const stepMatch = existingSubtask.title.match(/Step (\d+\.\d+)/);
    if (stepMatch) {
      // Update the subtask with new content and timestamp
      parentTask.subTasks[existingSubtaskIndex] = {
        ...existingSubtask,
        content: subTaskContent,
        fullJson: subTaskJson,
        timestamp: currentTime,
        title: `${stepMatch[0]} (${formattedSubTaskTime}s, +${timeSinceUpdate}s): ${normalizedTitle}`
      };
    } else {
      // No step number in title, just update with new timing
      parentTask.subTasks[existingSubtaskIndex] = {
        ...existingSubtask,
        content: subTaskContent,
        fullJson: subTaskJson,
        timestamp: currentTime,
        title: `${normalizedTitle} (${formattedSubTaskTime}s, +${timeSinceUpdate}s)`
      };
    }
  } else {
    // Add new subtask
    const newSubTask: SubTask = {
      title: `${normalizedTitle} (${formattedSubTaskTime}s)`,
      content: subTaskContent,
      fullJson: subTaskJson,
      timestamp: currentTime
    };
    parentTask.subTasks.push(newSubTask);
  }
}

  // Process trace data into organized TraceGroup records
export function processTraceData(
  state: TraceState,
  traceId: string,
  rawTraceData: any,
  message: string,
  currentTime: number = Date.now()
): TraceState {
  console.log('Processing trace data...', { traceId, trace: rawTraceData });
  
  if (!traceId || !rawTraceData) {
    console.error('Invalid trace data:', { traceId, trace: rawTraceData });
    return state;
  }
  
  // Make a fresh copy of the state to modify
  const newState = { ...state };
  
  // Extract agent details and set trace type
  const agentType = getAgentTypeFromTrace(rawTraceData);
  const traceType = rawTraceData.trace?.routingClassifierTrace ? 'routingClassifierTrace' : 'orchestrationTrace';
  
  // Create a base model for the agent identifier - we'll need this to identify
  // and group related traces
  let agentId = rawTraceData.agentId || rawTraceData.collaboratorName || agentType;
  
  // Generate a group ID that uniquely identifies this conversation thread
  let groupId = rawTraceData.sessionId || traceId;
  
  // First look for traceId in existing traces to see if this is an update
  const existingTraceGroup = newState.messages.find(
    (msg): msg is TraceGroup => 
      msg.type === 'trace-group' && msg.id === groupId
  );
  
  // Extract specific trace step details
  const stepTitle = getStepTitle(rawTraceData);
  const knowledgeBaseType = getKnowledgeBaseOperationType(rawTraceData);
  const actionGroupType = getActionGroupOperationType(rawTraceData);
  const modelInvocationType = getModelInvocationOperationType(rawTraceData);
  
  // Extract content for display, but also capture model input content separately
  // if it exists, so we can add it as a subtask
  const { displayContent, fullJsonContent } = extractTraceContent(rawTraceData);
  
  // Extract model input content if it exists
  let modelInputContent: string | null = null;
  if (rawTraceData.trace?.orchestrationTrace?.modelInvocationInput?.text) {
    modelInputContent = rawTraceData.trace.orchestrationTrace.modelInvocationInput.text;
  }
  
  console.log('Trace analysis:', {
    agentType,
    traceType,
    groupId,
    isExisting: !!existingTraceGroup,
    stepTitle,
    knowledgeBaseType,
    actionGroupType,
    modelInvocationType,
    hasContent: !!displayContent
  });

  // Calculate time since trace start (for existing trace group)
  let formattedTimeDifference = "0.00";
  if (existingTraceGroup) {
    const timeDifference = ((currentTime - existingTraceGroup.startTime) / 1000);
    formattedTimeDifference = parseFloat(timeDifference.toString()).toFixed(2);
  }
  
  // Determine step number and check if we have a subtask type
  let stepNumber = 1;
  let parentTaskIndex = -1;
  let subtaskType = null;
  
  if (knowledgeBaseType) {
    subtaskType = knowledgeBaseType;
  } else if (actionGroupType) {
    subtaskType = actionGroupType;
  } else if (modelInvocationType) {
    subtaskType = modelInvocationType;
  }
  
  // Process cases for existing trace groups
  if (existingTraceGroup) {
    // Update the last update time for the trace group
    existingTraceGroup.lastUpdateTime = currentTime;
    
    // Get previous task's timestamp to calculate individual step time (if available)
    let previousTaskTime = existingTraceGroup.startTime;
    if (existingTraceGroup.tasks && existingTraceGroup.tasks.length > 0) {
      previousTaskTime = existingTraceGroup.tasks[existingTraceGroup.tasks.length - 1].timestamp;
    }
    
    // Calculate time since last step (individual step time)
    const individualStepTime = ((currentTime - previousTaskTime) / 1000).toFixed(2);
    
    // Process steps differently based on whether we should increment or not
    if (!existingTraceGroup.tasks || existingTraceGroup.tasks.length === 0) {
      // First step in trace group
      stepNumber = 1;
    } else {
      // Find the highest step number used so far to ensure continuity
      const taskNumbers = existingTraceGroup.tasks
        .filter(task => task.stepNumber > 0)
        .map(task => task.stepNumber);
      
      // Default to 1 if no numbered tasks exist yet
      const highestStepNumber = taskNumbers.length > 0 ? Math.max(...taskNumbers) : 0;
      
      // Special handling for "Invoking Model" to ensure proper sequence numbering
      if (stepTitle === "Invoking Model") {
        // Create or extract model invocation ID
        let modelInvocationId;
        
        // Check if this trace has an input or output
        const hasInput = !!rawTraceData.trace?.orchestrationTrace?.modelInvocationInput;
        const hasOutput = !!rawTraceData.trace?.orchestrationTrace?.modelInvocationOutput;
        
        // Extract data that can help identify this specific model invocation
        if (hasInput && rawTraceData.trace?.orchestrationTrace?.modelInvocationInput) {
          // For input traces, create an ID based on input content
          const input = rawTraceData.trace.orchestrationTrace.modelInvocationInput;
          // Use timestamp or hash of input text as identifier
          modelInvocationId = `model-${agentId}-${traceId}-${input.timestamp || Date.now()}`;
          
          console.log(`Generated model input ID: ${modelInvocationId}`);
        } else if (hasOutput && rawTraceData.trace?.orchestrationTrace?.modelInvocationOutput) {
          // For output traces, try to match to an existing input
          const output = rawTraceData.trace.orchestrationTrace.modelInvocationOutput;
          // Use timestamp or id from output if available
          modelInvocationId = `model-${agentId}-${traceId}-${output.timestamp || Date.now()}`;
          
          console.log(`Generated model output ID: ${modelInvocationId}`);
        }
        
        // Check if we already have an Invoking Model step with matching agent
        const agentIdToMatch = rawTraceData.agentId || rawTraceData.collaboratorName || agentType;
        
        // We need each model invocation to be its own step, so we treat each one as new
        // Only pair input with output if they're from the same operation
        let existingModelStepIndex = -1;
        
        // For output traces, see if there's a recent model input from the same agent without an output already
        if (hasOutput && !hasInput) {
          // Look back through the most recent 3 tasks for a model input without an output
          for (let i = existingTraceGroup.tasks.length - 1; i >= Math.max(0, existingTraceGroup.tasks.length - 3); i--) {
            const task = existingTraceGroup.tasks[i];
            
            // Check if this is a model invocation step for the same agent
            if (task.title.includes("Invoking Model") && 
                (task._agentId === agentIdToMatch || !task._agentId)) {
              
              // Check if it has an input but no output subtask yet
              if (task.subTasks && 
                  task.subTasks.some(subtask => subtask.title.includes("Model Input")) &&
                  !task.subTasks.some(subtask => subtask.title.includes("Model Output"))) {
                
                console.log(`Found matching model input step without output at index ${i}`);
                existingModelStepIndex = i;
                break;
              }
            }
          }
        }
        
        // If we found an existing Invoking Model step
        if (existingModelStepIndex >= 0) {
          const existingModelStep = existingTraceGroup.tasks[existingModelStepIndex];
          
          // Use the existing step number
          stepNumber = existingModelStep.stepNumber;
          console.log(`Found existing Invoking Model step with number ${stepNumber}`);
          
          // Update model invocation ID if it's not already set
          if (modelInvocationId && !existingModelStep._modelInvocationId) {
            existingModelStep._modelInvocationId = modelInvocationId;
          }
          
          // Instead of creating a new task, we'll update this existing task
          // by adding the new data as a subtask
          parentTaskIndex = existingModelStepIndex;
          
          // Set subtask type based on what we're processing
          if (hasInput) {
            subtaskType = "Model Input";
          } else if (hasOutput) {
            subtaskType = "Model Output";
          }
        } else {
          // No existing Invoking Model step found, create a new one with a new step number
          stepNumber = highestStepNumber + 1;
          console.log(`Creating new Invoking Model step with number ${stepNumber} and ID ${modelInvocationId}`);
          
          // Pass the model invocation ID to the new task
          rawTraceData._modelInvocationId = modelInvocationId;
        }
      } 
      // Check if we should increment step or add subtask for other types
      else if (isSpecialTraceType(stepTitle)) {
        // Special trace types like "Final Response" aren't numbered normally
        stepNumber = 0;
      } else if (isSubtaskTrace(agentType, stepTitle)) {
        // Check if this is a consecutive "Invoking Model" step that should be treated as a subtask
        const isConsecutiveModelInvocation = stepTitle === "Invoking Model" && 
          existingTraceGroup.tasks.some(task => task.title.includes("Invoking Model"));
            
        // Log the detection of consecutive model invocations
        if (isConsecutiveModelInvocation) {
          console.log('Detected consecutive Invoking Model - treating as subtask');
          subtaskType = subtaskType || "Model Operation";
        }
          
        // Look for a relevant parent task, which should be recently added
        for (let i = existingTraceGroup.tasks.length - 1; i >= 0; i--) {
          const task = existingTraceGroup.tasks[i];
          
          // For model invocation subtasks, we need special handling
          if (modelInvocationType || stepTitle === "Invoking Model") {
            // Always ensure model operations create a new task or go under an existing Invoking Model
            // Never nest them under other types like Action Group or Knowledge Base
            if (task.title.includes("Invoking Model")) {
              console.log(`Found Model Invocation parent task: ${task.title} for model operation`);
              parentTaskIndex = i;
              subtaskType = subtaskType || "Model Operation";
              break;
            } else {
              // If this is a model trace but there's no Invoking Model parent recently,
              // don't attach it as a subtask to anything else - force it to be a new task
              console.log(`No suitable Model Invocation parent found - creating new task for model operation`);
              parentTaskIndex = -1; // Force creation of a new task
              break;  // Exit the loop - we don't want to find any other parent
            }
          }
          // For action group subtasks, find a matching action group parent
          else if (actionGroupType && (
              task.title.includes("Action Group Tool") || 
              task.title.includes("Action Group ")
            )) {
            console.log(`Found Action Group parent task: ${task.title} for subtask: ${subtaskType}`);
            parentTaskIndex = i;
            break;
          }
          // For knowledge base subtasks, find a matching knowledge base parent
          else if (knowledgeBaseType && (
              task.title.includes("Knowledge Base") || 
              task.title.includes("Knowledge Base Tool")
            )) {
            console.log(`Found Knowledge Base parent task: ${task.title} for subtask: ${subtaskType}`);
            parentTaskIndex = i;
            break;
          }
          // Default fallback - any task with a step number
          else if (task.stepNumber > 0) {
            // Found a suitable parent task
            parentTaskIndex = i;
            break;
          }
        }
      } else {
        // Regular step with incremented number
        const lastStepNumber = Math.max(
          ...existingTraceGroup.tasks
            .filter(task => task.stepNumber > 0)
            .map(task => task.stepNumber)
        );
        
        // Only increment for specific types that are truly new steps
        if (shouldIncrementStepCounter(stepTitle, existingTraceGroup)) {
          stepNumber = lastStepNumber + 1;
        } else {
          stepNumber = lastStepNumber;
        }
      }
    }
    
    // Format title with step number if applicable
    let taskTitle = stepTitle || 'Processing';
    // Special handling for special trace types - don't label with step numbers
    if (isSpecialTraceType(stepTitle)) {
      taskTitle = stepTitle;
      // Make sure step number is 0 for special trace types
      stepNumber = 0;
    } else if (stepNumber > 0) {
      taskTitle = `Step ${stepNumber}: ${taskTitle}`;
    }
    
    if (isSpecialTraceType(stepTitle)) {
      // Special trace types may not need time indicators
      taskTitle = stepTitle;
    } else {
      // Show individual step time instead of accumulated time
      taskTitle = `${taskTitle} (${individualStepTime}s)`;
    }
    
      // Create trace task entry
    const traceTask: Task = {
      stepNumber: stepNumber,
      title: taskTitle,
      // For special step types, set content appropriately
      content: (stepTitle === "Invoking Model") ? 
                 "Model invocation details in subtasks below" : 
               (stepTitle.includes("Knowledge Base Tool")) ?
                 displayContent || message :
               (stepTitle.includes("Action Group Tool")) ?
                 displayContent || message :
                 displayContent || message,
      fullJson: fullJsonContent,
      timestamp: currentTime,
      _agentId: agentId,  // Track which agent this task belongs to
      _modelInvocationId: rawTraceData._modelInvocationId  // Use the model invocation ID if available
    };
    
    // Special case for subtasks
    if (parentTaskIndex >= 0 && subtaskType) {
      const parentTask = existingTraceGroup.tasks[parentTaskIndex];
      addSubTask(
        parentTask,
        subtaskType,
        displayContent || message,
        fullJsonContent,
        currentTime
      );
    } else {
      // Add as a normal task
      existingTraceGroup.tasks.push(traceTask);
      
      // If this is a special step type that needs subtasks created automatically
      const parentTask = existingTraceGroup.tasks[existingTraceGroup.tasks.length - 1];
      
      // Always initialize subTasks array if it doesn't exist
      if (!parentTask.subTasks) {
        parentTask.subTasks = [];
      }
        
      // Handle different step types with appropriate subtasks
      if (stepTitle === "Invoking Model") {
        // Add Model Input subtask only if we're handling the input trace
        if (rawTraceData.trace?.orchestrationTrace?.modelInvocationInput) {
          // Get the model input content to display
          let inputContent: string | object = modelInputContent || "Model input data";
          if (rawTraceData.trace?.orchestrationTrace?.modelInvocationInput) {
            inputContent = modelInputContent || JSON.stringify(rawTraceData.trace.orchestrationTrace.modelInvocationInput, null, 2);
          }
          
          // Explicitly add a Model Input subtask with proper timing
          const timeDifference = ((currentTime - parentTask.timestamp) / 1000).toFixed(2);
          const formattedTime = parseFloat(timeDifference).toFixed(2);
          
          // Create and add the Model Input subtask
          const modelInputSubtask: SubTask = {
            title: `Model Input (${formattedTime}s)`,
            content: inputContent,
            fullJson: fullJsonContent,
            timestamp: currentTime
          };
          
          // Add this at the beginning of subtasks array to ensure it's first
          parentTask.subTasks.unshift(modelInputSubtask);
        }
        
        // Only add Model Output subtask if we're handling the output trace
        if (rawTraceData.trace?.orchestrationTrace?.modelInvocationOutput) {
          // If we have display content from the output, use it, otherwise show the raw output
          const outputContent = displayContent || 
            (rawTraceData.trace?.orchestrationTrace?.modelInvocationOutput ? 
              JSON.stringify(rawTraceData.trace.orchestrationTrace.modelInvocationOutput, null, 2) : 
              "Model output details");
              
          addSubTask(
            parentTask,
            "Model Output",
            outputContent,
            fullJsonContent,
            currentTime
          );
        }
      }
      // Handle Knowledge Base Tool tasks
      else if (stepTitle.includes("Knowledge Base Tool")) {
        // Create a KB Query Input subtask with the query text
        const timeDifference = ((currentTime - parentTask.timestamp) / 1000).toFixed(2);
        const formattedTime = parseFloat(timeDifference).toFixed(2);
        
        // Get the query content
        let queryContent = displayContent || "Knowledge base query";
        if (rawTraceData.trace?.orchestrationTrace?.invocationInput?.knowledgeBaseLookupInput?.text) {
          queryContent = rawTraceData.trace.orchestrationTrace.invocationInput.knowledgeBaseLookupInput.text;
        }
        
        // Set the parent task content to be the query content directly
        // This prevents an intermediate dropdown from forming
        parentTask.content = "Knowledge base tool details:";
        
        // Create and add the KB Query subtask
        const kbQuerySubtask: SubTask = {
          title: `Knowledge Base Query (${formattedTime}s)`,
          content: queryContent,
          fullJson: fullJsonContent,
          timestamp: currentTime
        };
        
        // Add this at the beginning of subtasks array
        parentTask.subTasks.unshift(kbQuerySubtask);
      }
      // Handle Action Group tasks
      else if (stepTitle.includes("Action Group Tool")) {
        // Create an Action Group Input subtask with the input data
        const timeDifference = ((currentTime - parentTask.timestamp) / 1000).toFixed(2);
        const formattedTime = parseFloat(timeDifference).toFixed(2);
        
        // Get the action group input content
        let actionContent = displayContent || "Action group input";
        if (rawTraceData.trace?.orchestrationTrace?.invocationInput?.actionGroupInvocationInput) {
          const actionInput = rawTraceData.trace.orchestrationTrace.invocationInput.actionGroupInvocationInput;
          
          // Try to extract meaningful content
          if (actionInput.requestBody?.content?.['application/json']) {
            const jsonContent = actionInput.requestBody.content['application/json'];
            if (Array.isArray(jsonContent) && jsonContent.length > 0 && jsonContent[0].value) {
              actionContent = JSON.stringify(jsonContent[0].value, null, 2);
            } else {
              actionContent = JSON.stringify(jsonContent, null, 2);
            }
          } else {
            actionContent = JSON.stringify(actionInput, null, 2);
          }
        }
        
        // Set the parent task content to be a descriptive text (not just placeholder)
        // This prevents an intermediate dropdown from forming
        parentTask.content = "Action group tool details:";
        
        // Create and add the Action Group Input subtask
        const actionGroupSubtask: SubTask = {
          title: `Action Group Input (${formattedTime}s)`,
          content: actionContent,
          fullJson: fullJsonContent,
          timestamp: currentTime
        };
        
        // Add this at the beginning of subtasks array
        parentTask.subTasks.unshift(actionGroupSubtask);
      }
    }
    
    // Check if this trace indicates completion (e.g. final response)
    if (stepTitle === 'Final Response' || 
        rawTraceData.trace?.orchestrationTrace?.observation?.finalResponse) {
      console.log('Marked trace as complete - Final Response detected');
      existingTraceGroup.isComplete = true;
      existingTraceGroup.finalElapsedTime = formattedTimeDifference;
    }
    
    // Also update the text content for summary display
    if (displayContent) {
      // Only update text if we have meaningful content
      existingTraceGroup.text = displayContent;
    }
  } else {
    // Create new trace group and add to state
    const traceGroup: TraceGroup = {
      id: groupId,
      type: 'trace-group',
      sender: 'bot',
      dropdownTitle: `${agentType} (${message.slice(0, 30)}${message.length > 30 ? '...' : ''})`,
      startTime: currentTime,
      tasks: [],
      text: message || displayContent || '[Processing...]',
      agentId: agentId,
      originalAgentType: rawTraceData.collaboratorName || agentType,
      orchestrationTraceType: traceType,
      lastUpdateTime: currentTime
    };
    
    // Format title with step number
    // Calculate the appropriate step number for this trace
    // If it's the first step, use 1, otherwise find the highest step number and increment
    let calculatedStepNumber = 1; // default step number
    
    if (existingTraceGroup && existingTraceGroup.tasks && existingTraceGroup.tasks.length > 0) {
      // Find the highest step number used so far
      const highestStep = Math.max(
        ...existingTraceGroup.tasks
          .filter(task => task.stepNumber > 0)
          .map(task => task.stepNumber)
      );
      calculatedStepNumber = highestStep + 1;
    }
    
    // Special handling for special trace types - don't label with step numbers
    let taskTitle = "";
    if (isSpecialTraceType(stepTitle)) {
      // For special trace types like Rationale, use the type name directly
      taskTitle = `${stepTitle} (0.00s)`;
      stepNumber = 0; // Use 0 to indicate no step number
    } else {
      taskTitle = `Step ${calculatedStepNumber}: ${stepTitle || 'Processing'} (0.00s)`;
      // Update the step number to match the title
      stepNumber = calculatedStepNumber;
    }
    
    // Generate model invocation ID if needed
    if (stepTitle === "Invoking Model") {
      // Create a unique model invocation ID for this new model step
      const hasInput = !!rawTraceData.trace?.orchestrationTrace?.modelInvocationInput;
      const hasOutput = !!rawTraceData.trace?.orchestrationTrace?.modelInvocationOutput;
      
      if (hasInput || hasOutput) {
        // Generate a model invocation ID using the agent ID and timestamp
        rawTraceData._modelInvocationId = `model-${agentId}-${traceId}-${Date.now()}`;
        console.log(`Generated new model invocation ID for new trace: ${rawTraceData._modelInvocationId}`);
      }
    }
    
    // Create initial trace task entry
    const traceTask: Task = {
      stepNumber: stepNumber,
      title: taskTitle,
      // For special step types, set content appropriately
      content: (stepTitle === "Invoking Model") ? 
                 "Model invocation details in subtasks below" : 
               (stepTitle.includes("Knowledge Base Tool")) ?
                 displayContent || message :
               (stepTitle.includes("Action Group Tool")) ?
                 displayContent || message :
                 displayContent || message,
      fullJson: fullJsonContent,
      timestamp: currentTime,
      _groupId: groupId,
      _agentId: agentId,  // Track which agent this task belongs to
      _modelInvocationId: rawTraceData._modelInvocationId  // Set model invocation ID if available
    };
    
    traceGroup.tasks.push(traceTask);
    
    // Handle special step types with appropriate subtasks for new trace groups
    
    // Initialize subTasks array if needed for any special step type
    if (stepTitle === "Invoking Model" || 
        stepTitle.includes("Knowledge Base Tool") || 
        stepTitle.includes("Action Group Tool:")) {
      if (!traceTask.subTasks) {
        traceTask.subTasks = [];
      }
      
      const timeDifference = ((currentTime - traceTask.timestamp) / 1000).toFixed(2);
      const formattedTime = parseFloat(timeDifference).toFixed(2);
        
      // Handle specific step types with appropriate subtasks
      if (stepTitle === "Invoking Model") {
        // Add Model Input subtask only if we're handling the input trace
        if (rawTraceData.trace?.orchestrationTrace?.modelInvocationInput) {
          // Get the model input content to display
          let inputContent: string | object = "Model input data";
          if (modelInputContent) {
            inputContent = modelInputContent;
          } else if (rawTraceData.trace?.orchestrationTrace?.modelInvocationInput) {
            inputContent = JSON.stringify(rawTraceData.trace.orchestrationTrace.modelInvocationInput, null, 2);
          }
          
          // Create and add the Model Input subtask
          const modelInputSubtask: SubTask = {
            title: `Model Input (${formattedTime}s)`,
            content: inputContent,
            fullJson: fullJsonContent,
            timestamp: currentTime
          };
          
          // Add this at the beginning of subtasks array
          traceTask.subTasks.unshift(modelInputSubtask);
        }
        
        // Add Model Output subtask only if we're handling the output trace
        if (rawTraceData.trace?.orchestrationTrace?.modelInvocationOutput) {
          // If we have display content from the output, use it, otherwise show the raw output
          const outputContent = displayContent || 
            (rawTraceData.trace?.orchestrationTrace?.modelInvocationOutput ? 
              JSON.stringify(rawTraceData.trace.orchestrationTrace.modelInvocationOutput, null, 2) : 
              "Model output details");
              
          const modelOutputSubtask: SubTask = {
            title: `Model Output (${formattedTime}s)`,
            content: outputContent,
            fullJson: fullJsonContent,
            timestamp: currentTime
          };
          
          // Add this after the input subtask (if it exists)
          traceTask.subTasks.push(modelOutputSubtask);
        }
      }
      // Handle Knowledge Base Tool tasks
      else if (stepTitle.includes("Knowledge Base Tool")) {
        // Get the query content
        let queryContent = displayContent || "Knowledge base query";
        if (rawTraceData.trace?.orchestrationTrace?.invocationInput?.knowledgeBaseLookupInput?.text) {
          queryContent = rawTraceData.trace.orchestrationTrace.invocationInput.knowledgeBaseLookupInput.text;
        }
        
        // Set the parent task content to be descriptive
        // This prevents an intermediate dropdown from forming
        traceTask.content = "Knowledge base tool details:";
        
        // Create and add the KB Query subtask
        const kbQuerySubtask: SubTask = {
          title: `Knowledge Base Query (${formattedTime}s)`,
          content: queryContent,
          fullJson: fullJsonContent,
          timestamp: currentTime
        };
        
        // Add this at the beginning of subtasks array
        traceTask.subTasks.unshift(kbQuerySubtask);
      }
      // Handle Action Group tasks
      else if (stepTitle.includes("Action Group Tool:")) {
        // Get the action group input content
        let actionContent = displayContent || "Action group input";
        if (rawTraceData.trace?.orchestrationTrace?.invocationInput?.actionGroupInvocationInput) {
          const actionInput = rawTraceData.trace.orchestrationTrace.invocationInput.actionGroupInvocationInput;
          
          // Try to extract meaningful content
          if (actionInput.requestBody?.content?.['application/json']) {
            const jsonContent = actionInput.requestBody.content['application/json'];
            if (Array.isArray(jsonContent) && jsonContent.length > 0 && jsonContent[0].value) {
              actionContent = JSON.stringify(jsonContent[0].value, null, 2);
            } else {
              actionContent = JSON.stringify(jsonContent, null, 2);
            }
          } else {
            actionContent = JSON.stringify(actionInput, null, 2);
          }
        }
        
        // Set the parent task content to be descriptive
        // This prevents an intermediate dropdown from forming
        traceTask.content = "Action group tool details:";
        
        // Create and add the Action Group Input subtask
        const actionGroupSubtask: SubTask = {
          title: `Action Group Input (${formattedTime}s)`,
          content: actionContent,
          fullJson: fullJsonContent,
          timestamp: currentTime
        };
        
        // Add this at the beginning of subtasks array
        traceTask.subTasks.unshift(actionGroupSubtask);
      }
    }
    
    newState.messages.push(traceGroup);
  }
  
  return newState;
}
