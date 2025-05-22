import React, { useState, useEffect } from 'react';
import { 
  Spinner, 
  Box, 
  TextFilter, 
  Container, 
  Header,
  SpaceBetween 
} from '@cloudscape-design/components';
import { fetchCustomerFeedback } from '../api';

const CustomerFeedbackTable: React.FC = () => {
  const [feedbackData, setFeedbackData] = useState("");
  const [filteredData, setFilteredData] = useState("");
  const [filterText, setFilterText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchCustomerFeedback();
        setFeedbackData(data);
        setFilteredData(data);
      } catch (error) {
        console.error("Error loading customer feedback data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter the content when search text changes
  useEffect(() => {
    if (!filterText) {
      setFilteredData(feedbackData);
      return;
    }

    try {
      // Simple filtering - just show lines that match
      const lines = feedbackData.split('\n');
      const filteredLines = lines.filter(line => 
        line.toLowerCase().includes(filterText.toLowerCase())
      );
      setFilteredData(filteredLines.join('\n'));
    } catch (error) {
      console.error("Error filtering customer feedback data:", error);
      setFilteredData(feedbackData);
    }
  }, [filterText, feedbackData]);

  if (loading) {
    return (
      <Box textAlign="center" padding="l">
        <Spinner size="large" />
        <Box variant="p" padding={{ top: "s" }}>
          Loading customer feedback data...
        </Box>
      </Box>
    );
  }

  return (
    <Container
      header={
        <Header
          variant="h2"
          description="Search through customer feedback comments"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <TextFilter
                filteringText={filterText}
                filteringPlaceholder="Search customer feedback..."
                onChange={({ detail }) => setFilterText(detail.filteringText)}
              />
            </SpaceBetween>
          }
        >
          Customer Feedback
        </Header>
      }
    >
      <Box padding="m">
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-word', 
          fontFamily: 'monospace',
          fontSize: '14px',
          lineHeight: '1.5',
          padding: '10px',
          maxHeight: '600px',
          overflow: 'auto'
        }}>
          {filteredData}
        </pre>
      </Box>
    </Container>
  );
};

export default CustomerFeedbackTable;