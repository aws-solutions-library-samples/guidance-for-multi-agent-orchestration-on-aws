import React, { useState } from "react";
import { Tabs, Container } from "@cloudscape-design/components";
import CustomerPreferencesTable from "./Tables/CustomerPreferencesTable";
import BrowseHistoryTable from "./Tables/BrowseHistoryTable";

const PersonalizationData: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState("customer-preferences");

  return (
    <Container>
      <Tabs
        activeTabId={activeTabId}
        onChange={({ detail }) => setActiveTabId(detail.activeTabId)}
        tabs={[
          {
            label: "Customer Preferences",
            id: "customer-preferences",
            content: <CustomerPreferencesTable />,
          },
          {
            label: "Browse History",
            id: "browse-history",
            content: <BrowseHistoryTable />,
          },
        ]}
      />
    </Container>
  );
};

export default PersonalizationData;