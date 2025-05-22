# React Flow Animation Reset Solution

This solution provides a way to reset active animations in the React Flow diagram before sending new messages. The implementation consists of several components that work together to provide a clean way to reset animations.

## 1. Core Animation Reset Functionality

### Files:
- `src/frontend/src/common/components/react_flow/FlowReset.ts` - Contains the core animation reset functions
- `src/frontend/src/utilities/chatMessageUtility.ts` - Provides integration with chat functionality

### Key Functions:

#### From `FlowReset.ts`:
- `resetFlowAnimations(resetCompletedStates = true)` - Primary API function to reset all animations
- `resetAllFlowAnimations(resetCompletedStates = true)` - Direct DOM manipulation for resetting animations
- `resetNodeAnimation(nodeId, resetCompletedState = true)` - Reset animations for a specific node
- `dispatchFlowReset(resetCompletedStates = true)` - Dispatches events to notify components

#### From `chatMessageUtility.ts`:
- `resetBeforeMessage(resetCompletedStates = true)` - Resets animations and clears chat state before sending
- `wrapMessageSender(originalSender)` - Higher-order function to wrap message sending functions

## 2. Integration Instructions

### Option 1: Direct Integration
The simplest way to integrate the animation reset functionality is to call the `resetBeforeMessage()` function directly before sending a message:

```typescript
import { resetBeforeMessage } from '../utilities/chatMessageUtility';

function handleSendMessage() {
  // Reset animations and chat state
  resetBeforeMessage();
  
  // Then proceed with your existing message sending logic
  sendMessageToAPI(message);
}
```

### Option 2: Using the Wrapper Function
If you prefer a cleaner approach, you can use the wrapper function to create a new message sending function that automatically handles the reset:

```typescript
import { wrapMessageSender } from '../utilities/chatMessageUtility';

// Your original function
function originalSendMessage(text) {
  // Original message sending logic
  sendToAPI(text);
}

// Create a wrapped version that handles resets
const sendMessage = wrapMessageSender(originalSendMessage);

// Use this wrapped version instead
function handleSend() {
  sendMessage("Hello world");  // This automatically resets animations before sending
}
```

### Option 3: Adding Reset Controls to React Flow Component
You can also add reset controls directly to your React Flow component:

```typescript
import { FlowResetControls } from '../common/components/react_flow/FlowResetExample';

function MyFlowComponent() {
  return (
    <div>
      <FlowResetControls />
      {/* Your existing Flow component */}
    </div>
  );
}
```

## 3. Example Implementation

See the `src/frontend/src/examples/ChatResetIntegrationExample.tsx` file for a complete example showing how to integrate the reset functionality into a chat component.

This example demonstrates:
- How to reset animations before sending messages
- Two different integration approaches (direct and wrapper)
- A simple chat UI that uses the reset functionality

## 4. How It Works

1. When you call `resetFlowAnimations()` or `resetBeforeMessage()`:
   - All active edge animation timeouts are cleared
   - CSS classes for active animations are removed from nodes and edges
   - React state for active animations is reset via custom events
   - Chat state is cleared (when using `resetBeforeMessage()`)

2. The solution uses both React state updates and direct DOM manipulation to ensure animations are reset immediately and reliably.

3. An event-based architecture allows any component to trigger animation resets without direct references to the flow component.

## 5. Advanced Usage

### Resetting Only Active Animations
If you want to preserve completed animations but reset only currently active ones:

```typescript
resetBeforeMessage(false);
// or
resetFlowAnimations(false);
```

### Resetting Individual Nodes
If you need to reset only specific nodes:

```typescript
import { resetNodeAnimation } from '../common/components/react_flow/FlowReset';

// Reset a specific node's animation
resetNodeAnimation('node-id');
```

### Adding Event Listeners
Your components can also listen for reset events to perform additional actions:

```typescript
useEffect(() => {
  const handleReset = (event) => {
    // Custom reset logic here
    console.log('Flow animations were reset', event.detail);
  };
  
  document.addEventListener('flowAnimationReset', handleReset);
  
  return () => {
    document.removeEventListener('flowAnimationReset', handleReset);
  };
}, []);
```

## 6. Troubleshooting

If animations aren't being reset properly:

1. **Verify DOM Structure**: Ensure the node and edge elements have the expected class names ('node-processing', 'edge-processing', etc.).

2. **Check Event Listeners**: Make sure the `AgentFlowPanel` component is properly listening for the reset events.

3. **Try Direct DOM Manipulation**: As a fallback, you can use:
   ```javascript
   document
     .querySelectorAll('.node-processing, .edge-processing')
     .forEach(el => el.classList.remove('node-processing', 'edge-processing'));
   ```

4. **Dispatch Events Manually**: You can trigger the reset events manually:
   ```javascript
   document.dispatchEvent(new CustomEvent('flowAnimationReset', { detail: { resetCompletedStates: true } }));
   document.dispatchEvent(new Event('clearAllTimers'));
