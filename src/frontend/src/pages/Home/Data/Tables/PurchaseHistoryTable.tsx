import React, { useState, useEffect, useContext } from 'react';
import { Spinner, Box } from '@cloudscape-design/components';
import BaseTable from './BaseTable';
import { fetchPurchaseHistory } from '../api';
import { FlashbarContext } from '../../../../common/contexts/Flashbar';

const PurchaseHistoryTable: React.FC = () => {
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addFlashbarItem } = useContext(FlashbarContext);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchPurchaseHistory();
        // Transform data if needed
        setPurchaseHistory(data);
      } catch (error) {
        console.error("Error loading purchase history data:", error);
        addFlashbarItem("error", "Failed to load purchase history data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [addFlashbarItem]);

  // Define columns based on the expected CSV structure
  const columnDefinitions = [
    {
      id: "customer_id",
      header: "Customer ID",
      cell: item => item.customer_id,
      sortingField: "customer_id"
    },
    {
      id: "product_id",
      header: "Product ID",
      cell: item => item.product_id,
      sortingField: "product_id"
    },
    {
      id: "purchase_date",
      header: "Purchase Date",
      cell: item => item.purchase_date,
      sortingField: "purchase_date"
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: item => item.quantity,
      sortingField: "quantity"
    },
    {
      id: "price",
      header: "Price",
      cell: item => `$${item.price}`,
      sortingField: "price"
    },
    {
      id: "payment_method",
      header: "Payment Method",
      cell: item => item.payment_method,
      sortingField: "payment_method"
    }
  ];

  // Define filtering properties for the property filter
  const filteringProperties = [
    {
      propertyKey: "customer_id",
      filteringOption: {
        key: "customer_id",
        value: "customer_id",
        operator: "=",
      }
    },
    {
      propertyKey: "payment_method",
      filteringOption: {
        key: "payment_method",
        value: "payment_method",
        operator: "=",
      }
    }
  ];

  if (loading) {
    return (
      <Box textAlign="center" padding="l">
        <Spinner size="large" />
        <Box variant="p" padding={{ top: "s" }}>
          Loading purchase history data...
        </Box>
      </Box>
    );
  }

  return (
    <BaseTable
      title="Purchase History"
      columnDefinitions={columnDefinitions}
      items={purchaseHistory}
      filteringProperties={filteringProperties}
    />
  );
};

export default PurchaseHistoryTable;