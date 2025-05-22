import React, { useState } from "react";
import { Tabs, Container, Header } from "@cloudscape-design/components";
import OrderManagementData from "./OrderManagementData";
import ProductRecommendationData from "./ProductRecommendationData";
import PersonalizationData from "./PersonalizationData";
import TroubleshootData from "./TroubleshootData";

const DataTabs: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState("order-management");

  return (
    <Container>
      <Tabs
        activeTabId={activeTabId}
        onChange={({ detail }) => setActiveTabId(detail.activeTabId)}
        tabs={[
          {
            label: "Order Management",
            id: "order-management",
            content: <OrderManagementData />,
          },
          {
            label: "Product Recommendation",
            id: "product-recommendation",
            content: <ProductRecommendationData />,
          },
          {
            label: "Personalization",
            id: "personalization",
            content: <PersonalizationData />,
          },
          {
            label: "Troubleshoot",
            id: "troubleshoot",
            content: <TroubleshootData />,
          },
        ]}
      />
    </Container>
  );
};

export default DataTabs;