import { useEffect, useRef } from 'react';
import { TraceGroup, TraceState } from '../../../utilities/traceParser';

/**
 * Custom hook to handle trace timer updates with proper cleanup and completion detection
 * This implementation fixes the continuous process issue by ensuring proper interval cleanup
 */
export const useTraceTimer = (
  showTrace: boolean, 
  traceState: TraceState, 
  setTraceState: React.Dispatch<React.SetStateAction<TraceState>>
) => {
  // Use refs to maintain state across renders and prevent stale closures
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const allTracesCompleteRef = useRef(false);
  const updateCountRef = useRef(0);
  const isProcessingRef = useRef(false);
  const MAX_UPDATES = 300; // Stop updating after ~5 minutes

  // Add event listener for force-stopping all timers
  useEffect(() => {
    const forceCleanup = () => {
      console.log('🧹 Force cleanup of all trace timers triggered by external event');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        isProcessingRef.current = false;
      }
      // Mark the state as completed immediately to avoid re-starting timers
      allTracesCompleteRef.current = true;
    };
    
    document.addEventListener('clearAllTimers', forceCleanup);
    return () => document.removeEventListener('clearAllTimers', forceCleanup);
  }, []);
  
  // Add live updating of trace timers with better stop logic
  useEffect(() => {
    // Don't start a new timer if we're already processing to prevent duplicates
    if (isProcessingRef.current) {
      console.log('Trace timer update already in progress, not starting a new one');
      return;
    }

    // Clear any existing timer when dependencies change
    if (timerIntervalRef.current) {
      console.log('Clearing previous timer interval');
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Reset counter and complete flag when trace state changes
    updateCountRef.current = 0;
    allTracesCompleteRef.current = false;

    // Only set up the timer if we have trace groups and they're visible
    if (!showTrace || traceState.messages.length === 0) {
      return;
    }

    // Check if we have any incomplete trace groups
    const incompleteTraceGroups = traceState.messages.filter(msg => 
    msg.type === 'trace-group' && 
    !(msg as TraceGroup).isComplete
    );
    
    // Don't start a timer if all traces are already complete
    if (incompleteTraceGroups.length === 0) {
      allTracesCompleteRef.current = true;
      console.log('All trace groups are already complete, not starting timer');
      return;
    }
    
    console.log('Starting trace timer update interval');
    isProcessingRef.current = true;
    
    // Update timers every second
    timerIntervalRef.current = setInterval(() => {
      // Safety check - stop updating after MAX_UPDATES
      if (updateCountRef.current > MAX_UPDATES) {
        console.log('Reached max timer updates, stopping interval');
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          isProcessingRef.current = false;
        }
        return;
      }
      
      updateCountRef.current += 1;
      
      // Check if all traces are marked complete - use a function for checking
      const checkAllComplete = (state: TraceState) => state.messages.every(msg => 
        msg.type !== 'trace-group' || // Not a trace group
        (msg as TraceGroup).isComplete // Or is already complete
      );
      
      // Store the result for the next check
      allTracesCompleteRef.current = checkAllComplete(traceState);
      
      console.log('🔍 TIMER DEBUG: Trace completion check:', 
        allTracesCompleteRef.current ? 'All traces complete!' : 'Some traces still running', 
        'Running for', updateCountRef.current, 'updates');
      
      if (allTracesCompleteRef.current) {
        console.log('🛑 All trace groups are complete, stopping interval');
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          isProcessingRef.current = false;
        }
        return;
      }
      
      setTraceState(prevState => {
        // Only update if we have trace groups that are not complete
        if (checkAllComplete(prevState)) {
          return prevState; // No changes needed
        }

        // Make a copy to avoid direct mutation
        const newState = JSON.parse(JSON.stringify(prevState));
        const currentTimestamp = Date.now();
        let hasUpdates = false;
        
        // Update all trace groups
        newState.messages = newState.messages.map(msg => {
          if (msg.type === 'trace-group') {
            // Safe cast since we already checked type
            const traceGroup = msg as TraceGroup;
            
            // Skip if already marked complete
            if (traceGroup.isComplete) {
              return traceGroup;
            }
            
            // Check if this trace group has a completed final response
            const hasFinalResponse = 'tasks' in traceGroup && traceGroup.tasks && traceGroup.tasks.some(task => 
              task.title.includes("Final Response") || 
              (task.content && typeof task.content === 'string' && 
                (task.content.includes("Can I help you with anything else?") ||
                task.content.includes("Is there anything else") || 
                task.content.includes("In conclusion") ||
                task.content.includes("To summarize")))
            );
            
            // Only update active trace groups that don't have final responses
            if (!hasFinalResponse) {
              // Calculate elapsed time from when this trace group started
              const totalElapsedTime = ((currentTimestamp - traceGroup.startTime) / 1000).toFixed(2);
              
              // Count regular tasks (non-special)
              const regularTaskCount = 'tasks' in traceGroup && traceGroup.tasks ? 
                traceGroup.tasks.filter(t => t.stepNumber > 0).length : 0;
              
              // Extract base title (remove timing info)
              const baseTitleParts = traceGroup.dropdownTitle.split('(');
              if (baseTitleParts.length > 0) {
                const baseTitle = baseTitleParts[0].trim();
                
                // Update the dropdown title with current timing
                const newTitle = `${baseTitle} (${totalElapsedTime} seconds, ${regularTaskCount} steps)`;
                
                // Only update if changed
                if (traceGroup.dropdownTitle !== newTitle) {
                  traceGroup.dropdownTitle = newTitle;
                  hasUpdates = true;
                }
              }
            } else if (!traceGroup.isComplete) {
              // Mark this trace group as complete so we don't update it anymore
              console.log(`Marking trace group ${traceGroup.agentId || 'unknown'} as complete`);
              traceGroup.isComplete = true;
              hasUpdates = true;
              
              // For completed traces, update the title one last time but replace "seconds" with "total"
              // to indicate it's a final time
              const baseTitleParts = traceGroup.dropdownTitle.split('(');
              if (baseTitleParts.length > 0) {
                const baseTitle = baseTitleParts[0].trim();
                const timeMatch = traceGroup.dropdownTitle.match(/\(([\d.]+) seconds/);
                const stepCountMatch = traceGroup.dropdownTitle.match(/(\d+) steps\)/);
                
                const elapsedTime = timeMatch ? timeMatch[1] : "0.00";
                
                // Use the actual task count instead of relying on regex match
                const regularTaskCount = 'tasks' in traceGroup && traceGroup.tasks ? 
                  traceGroup.tasks.filter(t => t.stepNumber > 0).length : 0;
                const stepCount = regularTaskCount > 0 ? regularTaskCount.toString() : (stepCountMatch ? stepCountMatch[1] : "0");
                
                // Format the title to show it's complete
                const newTitle = `${baseTitle} (${elapsedTime}s total, ${stepCount} steps)`;
                
                if (traceGroup.dropdownTitle !== newTitle) {
                  traceGroup.dropdownTitle = newTitle;
                }
              }
            }
          }
          return msg;
        });
        
        // Only return new state if we actually made changes
        return hasUpdates ? newState : prevState;
      });
    }, 1000);
    
    // Clean up interval when component unmounts or dependencies change
    return () => {
      if (timerIntervalRef.current) {
        console.log('Cleaning up timer interval on effect cleanup');
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        isProcessingRef.current = false;
      }
    };
  }, [showTrace, traceState.messages.length]);
};
