// Fixed timer effect that prevents infinite loops
import { useEffect, useRef } from 'react';
import { TraceGroup as TraceGroupType, TraceState } from '../../../utilities/traceParser';

// Create a timer effect that properly stops when all traces are complete
export function useTraceTimer(
  showTrace: boolean, 
  traceState: TraceState, 
  setTraceState: React.Dispatch<React.SetStateAction<TraceState>>
) {
  // Use refs to track interval state across renders
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const allTracesCompleteRef = useRef(false);
  const updateCountRef = useRef(0);
  const MAX_UPDATES = 300; // Stop updating after ~5 minutes

  // Add live updating of trace timers with better stop logic
  useEffect(() => {
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
      !(msg as TraceGroupType).isComplete
    );
    
    // Don't start a timer if all traces are already complete
    if (incompleteTraceGroups.length === 0) {
      allTracesCompleteRef.current = true;
      console.log('All trace groups are already complete, not starting timer');
      return;
    }
    
    console.log('Starting trace timer update interval');
    
    // Update timers every second
    timerIntervalRef.current = setInterval(() => {
      // Safety check - stop updating after MAX_UPDATES
      if (updateCountRef.current > MAX_UPDATES) {
        console.log('Reached max timer updates, stopping interval');
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        return;
      }
      
      updateCountRef.current += 1;
      
      // Check if all traces are marked complete - use a function for checking
      const checkAllComplete = (state: TraceState) => state.messages.every(msg => 
        msg.type !== 'trace-group' || // Not a trace group
        (msg as TraceGroupType).isComplete // Or is already complete
      );
      
      // Store the result for the next check
      allTracesCompleteRef.current = checkAllComplete(traceState);
      
      if (allTracesCompleteRef.current) {
        console.log('All trace groups are complete, stopping interval');
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
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
            const traceGroup = msg as TraceGroupType;
            
            // Skip if already marked complete
            if (traceGroup.isComplete) {
              return traceGroup;
            }
            
            // Check if this trace group has a completed final response
            const hasFinalResponse = 'tasks' in traceGroup && traceGroup.tasks && traceGroup.tasks.some(task => 
              task.title?.includes("Final Response") || 
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
              
              // IMPORTANT: Calculate the final elapsed time BEFORE marking as complete
              const finalElapsedTime = ((currentTimestamp - traceGroup.startTime) / 1000).toFixed(2);
              console.log(`Final time for ${traceGroup.agentId || 'unknown'}: ${finalElapsedTime}s`);
              
              // Store the final time directly in the trace group
              traceGroup.finalElapsedTime = finalElapsedTime;
              
              // Now mark as complete
              traceGroup.isComplete = true;
              hasUpdates = true;
              
              // For completed traces, update the title using our calculated final time
              const baseTitleParts = traceGroup.dropdownTitle.split('(');
              if (baseTitleParts.length > 0) {
                const baseTitle = baseTitleParts[0].trim();
                const stepCountMatch = traceGroup.dropdownTitle.match(/(\d+) steps\)/);
                
                // Use the actual task count instead of relying on regex match
                const regularTaskCount = 'tasks' in traceGroup && traceGroup.tasks ? 
                  traceGroup.tasks.filter(t => t.stepNumber > 0).length : 0;
                const stepCount = regularTaskCount > 0 ? regularTaskCount.toString() : (stepCountMatch ? stepCountMatch[1] : "0");
                
                // Use our calculated finalElapsedTime - this is critical
                const newTitle = `${baseTitle} (${finalElapsedTime}s total, ${stepCount} steps)`;
                
                traceGroup.dropdownTitle = newTitle;
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
      }
    };
  }, [showTrace, traceState.messages.length, setTraceState]);
}
