import React, { useEffect, useRef, useState } from "react";

interface FormattedAssistantResponseProps {
  content: string;
  messageId?: string;
  onAnimationComplete?: (isDone: boolean) => void;
}

export const FormattedAssistantResponse: React.FC<FormattedAssistantResponseProps> = ({
  content,
  messageId = "msg-" + Date.now(),
  onAnimationComplete
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isDone, setIsDone] = useState(false);
  const contentRef = useRef(content);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    contentRef.current = content;
    
    // For the initial greeting, or very short content, display immediately
    if (content === "Hello, how can I assist you?" || content.length < 15) {
      setDisplayedText(content);
      setIsDone(true);
      if (onAnimationComplete) onAnimationComplete(true);
      return;
    }
    
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Only restart streaming if already streaming or starting fresh
    if (!isDone || displayedText === "") {
      setDisplayedText("");
      streamText();
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [content]);
  
  const streamText = () => {
    // Add characters with a natural feel (more at a time)
    const streamNextChunk = () => {
      if (displayedText.length >= contentRef.current.length) {
        setIsDone(true);
        if (onAnimationComplete) onAnimationComplete(true);
        return;
      }
      
      // Add random number of characters each time for a natural feel
      const charsToAdd = Math.floor(Math.random() * 4) + 2;
      const nextLength = Math.min(displayedText.length + charsToAdd, contentRef.current.length);
      const nextText = contentRef.current.substring(0, nextLength);
      
      setDisplayedText(nextText);
      
      // Continue streaming
      timerRef.current = setTimeout(streamNextChunk, 20);
    };
    
    // Start the streaming process
    timerRef.current = setTimeout(streamNextChunk, 20);
  };

  // Cursor blinking style
  const cursorStyle = {
    display: isDone ? 'none' : 'inline-block',
    width: '2px',
    height: '14px',
    backgroundColor: '#0073bb',
    marginLeft: '1px',
    verticalAlign: 'middle',
    animation: 'blink 1s infinite'
  };

  // Add keyframe animation for cursor
  useEffect(() => {
    if (!document.getElementById('cursor-style')) {
      const style = document.createElement('style');
      style.id = 'cursor-style';
      style.innerHTML = `
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.getElementById('cursor-style')?.remove();
      };
    }
  }, []);

  return (
    <div>
      {displayedText}
      <span style={cursorStyle}></span>
    </div>
  );
};

// Simple component to test the streaming functionality
const StreamingTest = () => {
  const [text, setText] = useState("Hello, how can I assist you?");
  const [isStreaming, setIsStreaming] = useState(false);
  
  useEffect(() => {
    if (isStreaming) {
      let position = 0;
      const fullMessage = "This is a test of the streaming functionality. The text should appear character by character with a blinking cursor at the end. When the text is fully displayed, the cursor should disappear. This provides a better user experience than showing a static message all at once.";
      
      const interval = setInterval(() => {
        position += 3;
        if (position > fullMessage.length) {
          clearInterval(interval);
          setIsStreaming(false);
        } else {
          setText(fullMessage.substring(0, position));
        }
      }, 50);
      
      return () => clearInterval(interval);
    }
  }, [isStreaming]);
  
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '20px', borderRadius: '4px' }}>
        <FormattedAssistantResponse 
          content={text}
          messageId="test-msg"
          onAnimationComplete={(isDone) => console.log("Animation completed:", isDone)}
        />
      </div>
      <button onClick={() => setIsStreaming(!isStreaming)}>
        {isStreaming ? "Stop Streaming" : "Start Demo"}
      </button>
    </div>
  );
};

export default StreamingTest;
