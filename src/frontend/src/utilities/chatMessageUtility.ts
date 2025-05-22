/**
 * Chat Message Utility
 * 
 * Functions for managing chat messages and associated animations
 */

import { resetFlowAnimations } from '../common/components/react_flow/FlowReset';

/**
 * Reset all necessary states before sending a new chat message
 * 
 * This function:
 * 1. Resets all flow animations
 * 2. Dispatches chat clear event for the UI
 * 
 * @param resetCompletedStates - Whether to reset completed states too (default: true)
 */
export function resetBeforeMessage(resetCompletedStates: boolean = true): void {
  console.log('Resetting animations and chat states before sending message');
  
  // Reset flow animations
  resetFlowAnimations(resetCompletedStates);
  
  // Dispatch an event to clear chat messages in the UI
  document.dispatchEvent(new CustomEvent('clearChatMessages', {
    detail: {
      timestamp: Date.now()
    }
  }));
  
  // If your app uses localStorage to store chat state, you can clear that too
  try {
    // Clear any temporary message state from localStorage
    localStorage.removeItem('temp-message-draft');
    
    // You might want to keep conversation history but clear current state
    // This is just an example, adjust based on your actual storage schema
    const chatStateKey = 'chat-state';
    const savedChatState = localStorage.getItem(chatStateKey);
    
    if (savedChatState) {
      const parsedState = JSON.parse(savedChatState);
      // Clear current message but keep history
      const updatedState = {
        ...parsedState,
        currentMessage: '',
        isProcessing: false,
        currentResponseId: null
      };
      localStorage.setItem(chatStateKey, JSON.stringify(updatedState));
    }
  } catch (error) {
    console.error('Error clearing chat state from localStorage:', error);
  }
}

/**
 * Wrapper for message sending functions
 * 
 * Use this to wrap your existing message sending functions to ensure
 * animations and chat state are reset before sending.
 * 
 * @example
 * // Original message sending function
 * function sendMessage(message) {
 *   // Send message logic
 * }
 * 
 * // Wrapped version that resets animations first
 * const sendMessageWithReset = wrapMessageSender(sendMessage);
 * 
 * // Use the wrapped function instead
 * sendMessageWithReset("Hello world");
 * 
 * @param messageSender - The original function that sends messages
 * @returns A wrapped function that resets animations before sending
 */
export function wrapMessageSender<T extends (...args: any[]) => any>(
  messageSender: T
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    // Reset animations and chat state
    resetBeforeMessage();
    
    // Call the original message sender function
    return messageSender(...args);
  };
}

/**
 * Usage Instructions:
 * 
 * Option 1: Direct import and use
 * ----------------------------
 * import { resetBeforeMessage } from 'path/to/chatMessageUtility';
 * 
 * function handleSendMessage() {
 *   resetBeforeMessage();
 *   // Your existing code to send message
 * }
 * 
 * Option 2: Use the wrapper function
 * ----------------------------
 * import { wrapMessageSender } from 'path/to/chatMessageUtility';
 * 
 * // Your existing send message function
 * function originalSendMessage(text) {
 *   // Send message logic
 * }
 * 
 * // Create wrapped version
 * const sendMessage = wrapMessageSender(originalSendMessage);
 * 
 * // Now use sendMessage instead of originalSendMessage
 */
