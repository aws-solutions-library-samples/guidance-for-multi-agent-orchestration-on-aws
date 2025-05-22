import React, { useState, useEffect } from "react";
import { FormattedAssistantResponse } from "../utilities/streamingComponent";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Grid from "@cloudscape-design/components/grid";

const StreamingTest = () => {
  const [content, setContent] = useState("Hello, how can I assist you?");
  const [streamingStarted, setStreamingStarted] = useState(false);

  useEffect(() => {
    if (streamingStarted) {
      // Simulate streaming content by periodically adding more text
      let responseText = "";
      const fullResponse = `Thanks for your question about streaming text! I'm going to respond character by character.

This text is being streamed using our FormattedAssistantResponse component which implements a recursive streaming approach. Instead of using a single setTimeout that doesn't get rescheduled, we use a recursive approach where each chunk handler schedules the next chunk.

The advantages of this approach include:
1. More reliable streaming
2. Proper handling of complete/incomplete states
3. Better memory management
4. Built-in cursor with blinking effect

In conclusion, this approach provides a much better user experience with proper character-by-character rendering.`;

      const interval = setInterval(() => {
        if (responseText.length < fullResponse.length) {
          // Add 2-5 characters each time
          const charsToAdd = Math.floor(Math.random() * 3) + 2;
          responseText = fullResponse.substring(0, responseText.length + charsToAdd);
          setContent(responseText);
        } else {
          clearInterval(interval);
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [streamingStarted]);

  return (
    <Container
      header={
        <Header variant="h2">Streaming Text Component Test</Header>
      }
    >
      <SpaceBetween size="l">
        <Grid gridDefinition={[{ colspan: 12 }]}>
          <div style={{padding: "16px", borderRadius: "4px", border: "1px solid #d5dbdb"}}>
            <SpaceBetween size="m">
              <Box>
                <FormattedAssistantResponse 
                  content={content} 
                  onAnimationComplete={(isDone) => {
                    console.log("Animation complete:", isDone);
                  }}
                  messageId="test-message"
                />
              </Box>
              
              <Box>
                <Button 
                  onClick={() => setStreamingStarted(!streamingStarted)}
                  variant="primary"
                >
                  {streamingStarted ? "Stop Streaming" : "Start Streaming Demo"}
                </Button>
              </Box>
            </SpaceBetween>
          </div>
        </Grid>
      </SpaceBetween>
    </Container>
  );
};

export default StreamingTest;
