import React, { useState } from "react";
import { Tabs, Container } from "@cloudscape-design/components";
import ProductCatalogTable from "./Tables/ProductCatalogTable";
import PurchaseHistoryTable from "./Tables/PurchaseHistoryTable";
import CustomerFeedbackTable from "./Tables/CustomerFeedbackTable";

const ProductRecommendationData: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState("product-catalog");

  return (
    <Container>
      <Tabs
        activeTabId={activeTabId}
        onChange={({ detail }) => setActiveTabId(detail.activeTabId)}
        tabs={[
          {
            label: "Product Catalog",
            id: "product-catalog",
            content: <ProductCatalogTable />,
          },
          {
            label: "Purchase History",
            id: "purchase-history",
            content: <PurchaseHistoryTable />,
          },
          {
            label: "Customer Feedback",
            id: "customer-feedback",
            content: <CustomerFeedbackTable />,
          },
        ]}
      />
    </Container>
  );
};

export default ProductRecommendationData;