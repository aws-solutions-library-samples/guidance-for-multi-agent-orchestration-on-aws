import * as React from "react";
import Drawer from "@cloudscape-design/components/drawer";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Header from "@cloudscape-design/components/header";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Badge from "@cloudscape-design/components/badge";

interface Message {
  id: string;
  type: string;
  content: React.ReactNode;
  timestamp: string;
}

interface MessagePair {
  user: Message;
  assistant: Message;
  date: string;
  time: string;
}

interface MessageHistoryDrawerProps {
  messagePairs: MessagePair[];
  visible?: boolean;
}

const MessageHistoryDrawer: React.FC<MessageHistoryDrawerProps> = ({ 
  messagePairs,
  visible = false
}) => {
  // Only render the drawer if it's visible
  if (!visible) return null;
  
  return (
    <div className="message-history-drawer" style={{
      position: 'fixed',
      top: '60px',
      right: '0',
      width: '350px',
      height: 'calc(100vh - 60px)',
      zIndex: 1000,
      backgroundColor: 'white',
      boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.1)',
      overflowY: 'auto'
    }}>
      <Drawer header={
        <Header variant="h2" 
          description="Recent conversation history" 
          actions={<Badge color="blue">{messagePairs.length} conversations</Badge>}
        >
          Message History
        </Header>
      }>
        <Box margin={{ bottom: "l" }}>
          <SpaceBetween size="xl">
            {messagePairs.map((pair, index) => (
              <SpaceBetween key={`pair-${index}`} size="xs">
                <Header variant="h3">
                  {pair.date} - {pair.time}
                </Header>
                <ExpandableSection
                  headerText="Conversation"
                  defaultExpanded={index === 0}
                >
                  <KeyValuePairs
                    columns={1}
                    items={[
                      { 
                        label: "You", 
                        value: typeof pair.user.content === "string" 
                          ? pair.user.content 
                          : "Content not available" 
                      },
                      {
                        label: "Assistant",
                        value: typeof pair.assistant.content === "string" 
                          ? pair.assistant.content 
                          : "Content not available"
                      }
                    ]}
                  />
                </ExpandableSection>
              </SpaceBetween>
            ))}
            {messagePairs.length === 0 && (
              <Box color="text-status-inactive" textAlign="center" padding="m">
                No conversation history yet
              </Box>
            )}
          </SpaceBetween>
        </Box>
      </Drawer>
    </div>
  );
};

export default MessageHistoryDrawer;
