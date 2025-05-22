import React, { useState } from "react";
import { Tabs, Container } from "@cloudscape-design/components";
import FAQTable from "./Tables/FAQTable";
import TroubleshootingGuideTable from "./Tables/TroubleshootingGuideTable";

const TroubleshootData: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState("faq");

  return (
    <Container>
      <Tabs
        activeTabId={activeTabId}
        onChange={({ detail }) => setActiveTabId(detail.activeTabId)}
        tabs={[
          {
            label: "FAQ",
            id: "faq",
            content: <FAQTable />,
          },
          {
            label: "Troubleshooting Guide",
            id: "troubleshooting-guide",
            content: <TroubleshootingGuideTable />,
          },
        ]}
      />
    </Container>
  );
};

export default TroubleshootData;