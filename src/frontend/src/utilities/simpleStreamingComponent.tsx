import React, { useState, useEffect, useRef } from 'react';

interface StreamingTextProps {
  text: string;
  speed?: 'slow' | 'medium' | 'fast';
  onComplete?: () => void;
}

export const StreamingText: React.FC<StreamingTextProps> = ({ 
  text, 
  speed = 'medium',
  onComplete
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isDone, setIsDone] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const textRef = useRef(text);
  
  // Speed settings in milliseconds
  const speeds = {
    slow: 80,
    medium: 30,
    fast: 15
  };
  
  // Update the text reference when props change
  useEffect(() => {
    textRef.current = text;
    setDisplayedText('');
    setIsDone(false);
    
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Start streaming the new text
    streamText();
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [text]);
  
  // Text streaming function
  const streamText = () => {
    if (displayedText.length >= textRef.current.length) {
      setIsDone(true);
      if (onComplete) {
        onComplete();
      }
      return;
    }
    
    // Add a random number of characters each time for a more natural feel
    const charsToAdd = Math.floor(Math.random() * 3) + 1;
    const nextLength = Math.min(displayedText.length + charsToAdd, textRef.current.length);
    const nextText = textRef.current.substring(0, nextLength);
    
    setDisplayedText(nextText);
    
    // Schedule the next update
    timerRef.current = setTimeout(streamText, speeds[speed]);
  };
  
  // Cursor style
  const cursorStyle = {
    display: isDone ? 'none' : 'inline-block',
    width: '2px',
    height: '1em',
    backgroundColor: '#333',
    marginLeft: '2px',
    animation: 'blink 1s infinite'
  };
  
  // Add styles for cursor blinking animation
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return (
    <div>
      {displayedText}
      <span style={cursorStyle}></span>
    </div>
  );
};

// Demo component that shows how to use StreamingText
export const StreamingDemo: React.FC = () => {
  const [message, setMessage] = useState("Hello! How can I help you today?");
  const [isStreaming, setIsStreaming] = useState(false);
  
  const handleClick = () => {
    setIsStreaming(true);
    setMessage("This is a demonstration of character-by-character text streaming with a blinking cursor at the end. The cursor disappears when the text is fully displayed. This creates a much better user experience than showing static text all at once or having just a blinking cursor with no text appearing.");
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        border: '1px solid #ccc', 
        borderRadius: '5px', 
        padding: '15px',
        marginBottom: '15px',
        minHeight: '100px'
      }}>
        <StreamingText 
          text={message} 
          speed="medium"
          onComplete={() => console.log("Streaming complete!")}
        />
      </div>
      
      <button 
        onClick={handleClick}
        disabled={isStreaming}
        style={{
          padding: '8px 16px',
          backgroundColor: isStreaming ? '#cccccc' : '#0073bb',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isStreaming ? 'default' : 'pointer'
        }}
      >
        {isStreaming ? 'Streaming...' : 'Start Demo'}
      </button>
    </div>
  );
};

export default StreamingDemo;
