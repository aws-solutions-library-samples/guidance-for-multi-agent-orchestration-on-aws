import React, { useState, useEffect, useContext } from 'react';
import { Spinner, Box } from '@cloudscape-design/components';
import BaseTable from './BaseTable';
import { fetchProductCatalog } from '../api';
import { FlashbarContext } from '../../../../common/contexts/Flashbar';

const ProductCatalogTable: React.FC = () => {
  const [productCatalog, setProductCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addFlashbarItem } = useContext(FlashbarContext);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchProductCatalog();
        // Transform data if needed
        setProductCatalog(data);
      } catch (error) {
        console.error("Error loading product catalog data:", error);
        addFlashbarItem("error", "Failed to load product catalog data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [addFlashbarItem]);

  // Define columns based on the expected CSV structure
  const columnDefinitions = [
    {
      id: "product_id",
      header: "Product ID",
      cell: item => item.product_id,
      sortingField: "product_id"
    },
    {
      id: "product_name",
      header: "Product Name",
      cell: item => item.product_name,
      sortingField: "product_name"
    },
    {
      id: "category",
      header: "Category",
      cell: item => item.category,
      sortingField: "category"
    },
    {
      id: "price",
      header: "Price",
      cell: item => `$${item.price}`,
      sortingField: "price"
    },
    {
      id: "description",
      header: "Description",
      cell: item => item.description,
      sortingField: "description"
    },
    {
      id: "features",
      header: "Features",
      cell: item => item.features,
      sortingField: "features"
    },
    {
      id: "rating",
      header: "Rating",
      cell: item => item.rating,
      sortingField: "rating"
    }
  ];

  // Define filtering properties for the property filter
  const filteringProperties = [
    {
      propertyKey: "category",
      filteringOption: {
        key: "category",
        value: "category",
        operator: "=",
      }
    },
  ];

  if (loading) {
    return (
      <Box textAlign="center" padding="l">
        <Spinner size="large" />
        <Box variant="p" padding={{ top: "s" }}>
          Loading product catalog data...
        </Box>
      </Box>
    );
  }

  return (
    <BaseTable
      title="Product Catalog"
      columnDefinitions={columnDefinitions}
      items={productCatalog}
      filteringProperties={filteringProperties}
    />
  );
};

export default ProductCatalogTable;