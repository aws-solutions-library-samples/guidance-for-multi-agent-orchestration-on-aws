import { TraceGroup, TraceState } from './traceParser';

/**
 * Type guard to check if an object is a TraceGroup
 */
export const isTraceGroup = (msg: any): msg is TraceGroup => (
  msg?.type === 'trace-group' && 
  'tasks' in msg && 
  Array.isArray(msg.tasks) &&
  'dropdownTitle' in msg
);

/**
 * Safely get all actual trace groups from a messages array
 * @param messages Array that may contain both TraceGroup and other message types
 * @returns Array of only valid TraceGroup objects
 */
export function getSafeTraceGroups(messages: any[]): TraceGroup[] {
  return messages.filter(isTraceGroup);
}

/**
 * Type-safe helper function to find a trace group by agent ID
 * @param messages Array of messages that may include trace groups
 * @param agentId Agent ID to search for
 * @returns The matching trace group or undefined if not found
 */
export function findTraceGroupByAgentId(messages: any[], agentId: string): TraceGroup | undefined {
  return getSafeTraceGroups(messages)
    .find(group => group.agentId === agentId);
}

/**
 * Safely get the start time for a trace group by agent ID
 * @param messages Array of messages that may include trace groups
 * @param agentId Agent ID to search for
 * @param fallback Fallback time if no trace group is found (defaults to current time)
 * @returns The start time of the trace group or the fallback time
 */
export function getTraceGroupStartTime(messages: any[], agentId: string, fallback?: number): number {
  const traceGroup = findTraceGroupByAgentId(messages, agentId);
  return traceGroup?.startTime || fallback || Date.now();
}

/**
 * Find the newest trace group based on lastUpdateTime
 * @param messages Array of messages that may include trace groups
 * @returns The most recently updated trace group or undefined if no trace groups exist
 */
export function getNewestTraceGroup(messages: any[]): TraceGroup | undefined {
  const traceGroups = getSafeTraceGroups(messages);
  if (traceGroups.length === 0) return undefined;
  
  return traceGroups.reduce((newest, current) => {
    return (newest.lastUpdateTime || 0) > (current.lastUpdateTime || 0) ? newest : current;
  });
}

/**
 * Safely parse an attribute from a DOM element as a number
 * @param selector CSS selector for the element
 * @param attributeName Name of the attribute to parse
 * @param fallback Fallback value if the element or attribute is not found
 * @returns The parsed number or fallback value
 */
export function parseAttributeAsNumber(selector: string, attributeName: string, fallback: number): number {
  try {
    const element = document.querySelector(selector);
    if (!element) {
      console.log(`Element not found: ${selector}`);
      return fallback;
    }
    
    const attributeValue = element.getAttribute(attributeName);
    if (!attributeValue) {
      console.log(`Attribute not found: ${attributeName}`);
      return fallback;
    }
    
    const parsedValue = parseInt(attributeValue, 10);
    return isNaN(parsedValue) ? fallback : parsedValue;
  } catch (error) {
    console.error(`Error parsing attribute ${attributeName} from ${selector}:`, error);
    return fallback;
  }
}
