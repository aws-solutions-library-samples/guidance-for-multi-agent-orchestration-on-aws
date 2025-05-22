import React, { useState, useRef, useEffect } from 'react';
import { TraceGroup as TraceGroupType } from './traceParser';
import { getAgentTrace, storeAgentTrace } from './agentTraceStorage';
import { parseAttributeAsNumber } from './safeTraceUtils';

// Helper function to determine if a text contains final response markers
export const isFinalResponseContent = (content: string): boolean => {
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

// Debug console log for animation state
const debugAnimationState = (id: string, status: string) => {
  console.log(`🎬 ANIMATION ${status}: ${id} at ${Date.now()}`);
};

// Use memo with custom equality function to prevent unnecessary re-renders
export const FormattedAssistantResponse = React.memo(
  ({ content, onAnimationComplete, messageId }: FormattedAssistantResponseProps) => {
    // Calculate initial state values
    const isGreeting = content === "Hello, how can I assist you?";
    const isFinal = content && typeof content === 'string' && isFinalResponseContent(content);
    
    // Set the initial state based on message type
    const [displayedText, setDisplayedText] = useState(isGreeting || isFinal ? content : '');
    const [isDone, setIsDone] = useState(isGreeting || isFinal);
    
    // Message state tracking refs
    const fullContentRef = useRef(content);
    const streamTimerRef = useRef<NodeJS.Timeout | null>(null);
    const responseIdRef = useRef(`response-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    const initialRenderRef = useRef(true);
    const hasFinalResponseRef = useRef(isGreeting || isFinal);
    
    // Check if this is a final response to prevent further streaming
    useEffect(() => {
      // Only process if content changed and we're not already done with this response
      if (content !== fullContentRef.current || !isDone) {
        fullContentRef.current = content;
        
        // Check for final response markers
        if (content && typeof content === 'string' && isFinalResponseContent(content)) {
          const id = responseIdRef.current.substring(0, 6);
          debugAnimationState(id, "FINAL DETECTED");
          hasFinalResponseRef.current = true;
          
          // For final responses, immediately show full content
          setDisplayedText(content);
          setIsDone(true);
          
          // Clean up any streaming timer
          if (streamTimerRef.current) {
            clearTimeout(streamTimerRef.current);
            streamTimerRef.current = null;
          }

          // Explicitly notify parent when we detect final content
          if (onAnimationComplete) {
            setTimeout(() => onAnimationComplete(true), 10);
          }
        }
      }
    }, [content, isDone, onAnimationComplete]);
    
    // Helper to clear any existing timer
    const clearStreamTimer = () => {
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    };

    // Clean up on unmount
    useEffect(() => {
      return () => {
        debugAnimationState(responseIdRef.current.substring(0, 6), "UNMOUNT CLEANUP");
        clearStreamTimer();
      };
    }, []);

    // Update the full content reference when it changes significantly
    useEffect(() => {
      // Skip the first render since we already set initial state
      if (initialRenderRef.current) {
        initialRenderRef.current = false;
        return;
      }
      
      // Skip if this is a final response - we've already set it to done
      if (hasFinalResponseRef.current) {
        return;
      }
      
      // Only restart streaming if the content actually changed substantially
      // This prevents flickering when minor updates happen or when typing in input field
      const contentLengthDiff = Math.abs(fullContentRef.current.length - content.length);
      
      if (fullContentRef.current !== content && contentLengthDiff > 30) {
        console.log("Content changed significantly, restarting streaming");
        fullContentRef.current = content;
        
        // Reset streaming state
        clearStreamTimer();
        setDisplayedText('');
        setIsDone(false);
      } else if (fullContentRef.current !== content) {
        // For minor updates, just silently update the reference without restarting
        // This prevents flickering when typing a new message
        fullContentRef.current = content;
      }
    }, [content]);

    // Stream effect with anti-flicker protection
    useEffect(() => {
      // Skip streaming for initial greeting or final messages
      if (content === "Hello, how can I assist you?" || hasFinalResponseRef.current) {
        setDisplayedText(content);
        setIsDone(true);
        // Notify parent that animation is complete
        if (onAnimationComplete) {
          onAnimationComplete(true);
        }
        return;
      }
      
      // Check if this content itself is a final response
      if (isFinalResponseContent(content)) {
        // For final responses, skip streaming and show full content immediately
        setDisplayedText(content);
        setIsDone(true);
        hasFinalResponseRef.current = true;
        return;
      }
      
      // Skip if we're already done or content is unstable
      if (isDone || displayedText.length >= fullContentRef.current.length) {
        if (!isDone && displayedText.length >= fullContentRef.current.length) {
          const id = responseIdRef.current.substring(0, 6);
          debugAnimationState(id, "AUTO COMPLETE - reached end");
          setIsDone(true);
          
          // Notify parent of completion
          if (onAnimationComplete) {
            setTimeout(() => onAnimationComplete(true), 10);
          }
        }
        return;
      }

      // Ensure we don't keep streaming if we already have all the content
      if (displayedText === fullContentRef.current) {
        setIsDone(true);
        return;
      }

      // Stream the text character by character
      clearStreamTimer(); // Clear any existing timer
      
      // Use a stable timer duration that's not affected by re-renders
      const timerDuration = 15; // slightly slower is more stable
      
      // Create a stable timer ID to prevent duplicate timers
      const timerId = `stream-${responseIdRef.current}-${Date.now()}`;
      console.log(`Creating stream timer ${timerId}, length: ${displayedText.length}/${fullContentRef.current.length}`);
      
      // Define a recursive streaming function that continues until text is fully displayed
      const streamNextChunk = () => {
        // Safety check - if we're somehow called after we're done, don't continue
        if (isDone || displayedText.length >= fullContentRef.current.length) {
          console.log(`Stream timer ${timerId} aborted, already at end`);
          setIsDone(true);
          return;
        }
        
        // Add a constant but random number of characters each time for a more natural effect
        // Using a consistent algorithm reduces render jitter
        const charsToAdd = Math.floor(Math.random() * 6) + 3;
        const nextTextLength = Math.min(displayedText.length + charsToAdd, fullContentRef.current.length);
        const nextText = fullContentRef.current.substring(0, nextTextLength);
        
        // Check if we've reached a final response marker
        if (isFinalResponseContent(nextText) && !isFinalResponseContent(displayedText)) {
          // If this chunk contains the completion marker, jump straight to the complete text
          console.log(`Stream timer ${timerId} detected final response marker, showing full text`);
          setDisplayedText(fullContentRef.current);
          setIsDone(true);
          return;
        }
        
        // Only update if we're adding characters and haven't reached the end
        if (nextText.length > displayedText.length && nextText !== fullContentRef.current) {
          console.log(`Stream timer ${timerId} updating text: ${displayedText.length} -> ${nextText.length}`);
          setDisplayedText(nextText);
          
          // Get the existing browser trace or create a new one
          const existingTrace = getAgentTrace('customer');
          
          // Create trace with both user message and streaming response
          const browserStreamingTrace: TraceGroupType = {
            id: existingTrace?.id || `browser-trace-${Date.now()}`,
            type: 'trace-group' as const,
            sender: 'bot',
            dropdownTitle: 'Browser - Conversation',
            agentId: 'customer', // Browser node ID
            originalAgentType: 'Browser',
            tasks: [
              // Keep the existing user message task
              ...(existingTrace?.tasks?.filter(t => t.stepNumber === 1) || [{
                stepNumber: 1,
                title: `Step 1 - User Message (0.00 seconds)`,
                content: "User message",
                timestamp: Date.now() - 1000 // Ensure this appears first
              }]),
              // Add/update the response task
              {
                stepNumber: 2,
                title: `Step 2 - Response Streaming (${((Date.now() - 
                  parseAttributeAsNumber('.custom-agent-node[id="customer"]', 'data-start-time', Date.now())) / 1000).toFixed(2)} seconds)`,
                content: nextText,
                timestamp: Date.now()
              }
            ],
            text: "Conversation",
            startTime: existingTrace?.startTime || Date.now() - 1000,
            lastUpdateTime: Date.now()
          };
          
          // Store the updated browser trace
          storeAgentTrace('customer', browserStreamingTrace);
          
          // Update the browser node with streaming content
          const browserNodeUpdateEvent = new CustomEvent('agentNodeUpdate', {
            detail: {
              nodeId: 'customer',
              traceGroup: browserStreamingTrace,
              isStreaming: true
            }
          });
          document.dispatchEvent(browserNodeUpdateEvent);
          
          // Continue streaming with the next chunk
          streamTimerRef.current = setTimeout(streamNextChunk, timerDuration);
        } else if (nextText.length >= fullContentRef.current.length) {
          // We've reached the end of content
          console.log(`Stream timer ${timerId} reached end of content`);
          setDisplayedText(fullContentRef.current);
          setIsDone(true);
          
          // Final update to browser node with complete response
          const browserFinalTrace: TraceGroupType = {
            id: `browser-trace-final-${Date.now()}`,
            type: 'trace-group' as const,
            sender: 'bot',
            dropdownTitle: 'Browser - Final Response',
            agentId: 'customer', // Browser node ID
            originalAgentType: 'Browser',
            tasks: [{
              stepNumber: 2,
                title: `Step 2 - Final Response (${((Date.now() - 
                parseAttributeAsNumber('.custom-agent-node[id="customer"]', 'data-start-time', Date.now())) / 1000).toFixed(2)} seconds)`,
              content: fullContentRef.current,
              timestamp: Date.now()
            }],
            text: "Final response",
            startTime: parseAttributeAsNumber('.custom-agent-node[id="customer"]', 'data-start-time', Date.now()),
            lastUpdateTime: Date.now(),
            isComplete: true
          };
          
          // Store the final browser trace
          storeAgentTrace('customer', browserFinalTrace);
          
          // Update browser node with final content
          const browserNodeUpdateEvent = new CustomEvent('agentNodeUpdate', {
            detail: {
              nodeId: 'customer',
              traceGroup: browserFinalTrace,
              isComplete: true
            }
          });
          document.dispatchEvent(browserNodeUpdateEvent);
        }
      };
      
      // Start the streaming process
      streamTimerRef.current = setTimeout(streamNextChunk, timerDuration);

      return clearStreamTimer;
    }, [displayedText, isDone, content, onAnimationComplete]);

    // Define CSS for blinking cursor with fixed properties to prevent re-renders
    const cursorStyle = React.useMemo(() => ({
      display: 'inline-block',
      width: '2px',
      height: '14px',
      backgroundColor: '#4299E1',
      verticalAlign: 'middle',
      marginLeft: '1px',
      animation: 'blinkCursor 1s infinite',
      animationTimingFunction: 'steps(2, start)'
    }), []);

    // Add global style for the blinking cursor animation if it doesn't exist
    useEffect(() => {
      if (!document.getElementById('animation-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'animation-styles';
        styleEl.innerHTML = `
          @keyframes blinkCursor {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        `;
        document.head.appendChild(styleEl);

        return () => {
          const element = document.getElementById('animation-styles');
          if (element) element.remove();
        };
      }
    }, []);

    // Memoize the container style
    const containerStyle = React.useMemo(() => ({
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 'inherit',
      lineHeight: '1.5',
      color: '#2D3748'
    }), []);

    return (
      <div style={containerStyle}>
        {displayedText}
        {!isDone && <span style={cursorStyle}></span>}
      </div>
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
