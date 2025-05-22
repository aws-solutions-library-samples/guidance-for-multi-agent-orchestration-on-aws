import React, { useState } from "react";
import { Tabs, Container } from "@cloudscape-design/components";
import OrdersTable from "./Tables/OrdersTable";
import InventoryTable from "./Tables/InventoryTable";

const OrderManagementData: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState("orders");

  return (
    <Container>
      <Tabs
        activeTabId={activeTabId}
        onChange={({ detail }) => setActiveTabId(detail.activeTabId)}
        tabs={[
          {
            label: "Orders",
            id: "orders",
            content: <OrdersTable />,
          },
          {
            label: "Inventory",
            id: "inventory",
            content: <InventoryTable />,
          },
        ]}
      />
    </Container>
  );
};

export default OrderManagementData;