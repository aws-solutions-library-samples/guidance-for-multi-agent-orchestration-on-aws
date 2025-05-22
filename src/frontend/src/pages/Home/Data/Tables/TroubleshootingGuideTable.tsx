import React, { useState, useEffect, useContext } from 'react';
import { 
  Spinner, 
  Box, 
  TextFilter, 
  Container, 
  Header,
  SpaceBetween 
} from '@cloudscape-design/components';
import { fetchTroubleshootingData } from '../api';
import { FlashbarContext } from '../../../../common/contexts/Flashbar';

const TroubleshootingGuideTable: React.FC = () => {
  const [troubleshootingData, setTroubleshootingData] = useState<string>("");
  const [filteredData, setFilteredData] = useState<string>("");
  const [filterText, setFilterText] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { addFlashbarItem } = useContext(FlashbarContext);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchTroubleshootingData();
        setTroubleshootingData(data);
        setFilteredData(data);
      } catch (error) {
        console.error("Error loading troubleshooting data:", error);
        addFlashbarItem("error", "Failed to load troubleshooting data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [addFlashbarItem]);

  // Filter the content when search text changes
  useEffect(() => {
    if (!filterText) {
      setFilteredData(troubleshootingData);
      return;
    }

    // Split the text by lines and only include lines that match the filter
    const lines = troubleshootingData.split('\n');
    const matchingSections: string[] = [];
    let currentSection: string[] = [];
    let include = false;

    // Process each line
    lines.forEach((line) => {
      // Check if this is a section separator
      if (line.trim() === '---') {
        if (include && currentSection.length > 0) {
          matchingSections.push(...currentSection, line);
        }
        currentSection = [line];
        include = false;
      } else {
        currentSection.push(line);
        // If any line in this section matches the filter, include the whole section
        if (line.toLowerCase().includes(filterText.toLowerCase())) {
          include = true;
        }
      }
    });

    // Add the last section if it matches
    if (include && currentSection.length > 0) {
      matchingSections.push(...currentSection);
    }

    setFilteredData(matchingSections.join('\n'));
  }, [filterText, troubleshootingData]);

  if (loading) {
    return (
      <Box textAlign="center" padding="l">
        <Spinner size="large" />
        <Box variant="p" padding={{ top: "s" }}>
          Loading troubleshooting data...
        </Box>
      </Box>
    );
  }

  return (
    <Container
      header={
        <Header
          variant="h2"
          description="Search through product troubleshooting guides"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <TextFilter
                filteringText={filterText}
                filteringPlaceholder="Search troubleshooting guides..."
                onChange={({ detail }) => setFilterText(detail.filteringText)}
              />
            </SpaceBetween>
          }
        >
          Troubleshooting Guide
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

export default TroubleshootingGuideTable;