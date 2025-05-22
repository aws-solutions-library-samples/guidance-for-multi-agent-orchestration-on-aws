/**
 * FlowResetControls Component
 * 
 * This file contains a React component that provides UI controls for resetting
 * React Flow animations in an application.
 * 
 * Key features:
 * - Button to reset all flow animations including completed states
 * - Button to reset only active animations while preserving completed states
 * - Styled buttons with visual feedback
 * - Integration with resetFlowAnimations utility function
 * 
 * The component can be imported and used anywhere in the application that needs
 * animation reset controls for React Flow diagrams/visualizations.
 */

import React from 'react';
import { resetFlowAnimations } from './FlowReset';

/**
 * Example component demonstrating how to use the resetFlowAnimations function
 * 
 * This component provides buttons to reset flow animations in different ways.
 * It can be imported anywhere in the application that needs to control the
 * React Flow animations.
 */
export const FlowResetControls: React.FC = () => {
  // Reset all animations including completed states
  const handleResetAll = () => {
    console.log('Resetting all flow animations including completed states');
    resetFlowAnimations(true);
  };

  // Reset only active animations, preserving completed states
  const handleResetActive = () => {
    console.log('Resetting only active flow animations, preserving completed states');
    resetFlowAnimations(false);
  };

  return (
    <div className="flow-reset-controls" style={{ margin: '10px 0' }}>
      <button 
        onClick={handleResetAll}
        style={{ 
          marginRight: '10px',
          padding: '6px 12px',
          background: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Reset All Animations
      </button>
      
      <button 
        onClick={handleResetActive}
        style={{ 
          padding: '6px 12px',
          background: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Reset Active Animations Only
      </button>
    </div>
  );
};

/**
 * Usage example:
 * 
 * import { FlowResetControls } from './common/components/react_flow/FlowResetExample';
 * 
 * function MyComponent() {
 *   return (
 *     <div>
 *       <h1>My Component</h1>
 *       <FlowResetControls />
 *       // Other content would go here
 *     </div>
 *   );
 * }
 */
import React from 'react';
import { resetFlowAnimations } from './FlowReset';

/**
 * Example component demonstrating how to use the resetFlowAnimations function
 * 
 * This component provides buttons to reset flow animations in different ways.
 * It can be imported anywhere in the application that needs to control the
 * React Flow animations.
 */
export const FlowResetControls: React.FC = () => {
  // Reset all animations including completed states
  const handleResetAll = () => {
    console.log('Resetting all flow animations including completed states');
    resetFlowAnimations(true);
  };

  // Reset only active animations, preserving completed states
  const handleResetActive = () => {
    console.log('Resetting only active flow animations, preserving completed states');
    resetFlowAnimations(false);
  };

  return (
    <div className="flow-reset-controls" style={{ margin: '10px 0' }}>
      <button 
        onClick={handleResetAll}
        style={{ 
          marginRight: '10px',
          padding: '6px 12px',
          background: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Reset All Animations
      </button>
      
      <button 
        onClick={handleResetActive}
        style={{ 
          padding: '6px 12px',
          background: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Reset Active Animations Only
      </button>
    </div>
  );
};

/**
 * Usage example:
 * 
 * import { FlowResetControls } from './common/components/react_flow/FlowResetExample';
 * 
 * function MyComponent() {
 *   return (
 *     <div>
 *       <h1>My Component</h1>
 *       <FlowResetControls />
 *       // Other content would go here
 *     </div>
 *   );
 * }
 */
