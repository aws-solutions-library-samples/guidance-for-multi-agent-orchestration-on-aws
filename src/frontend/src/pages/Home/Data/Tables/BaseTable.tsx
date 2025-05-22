import React, { useState, useEffect } from 'react';
import {
  Table,
  Box,
  SpaceBetween,
  TextFilter,
  Pagination,
  Header,
  Button,
  CollectionPreferences,
} from '@cloudscape-design/components';

interface Column {
  id: string;
  header: string;
  cell: (item: any) => React.ReactNode;
  sortingField?: string;
}

interface BaseTableProps {
  title: string;
  columnDefinitions: Column[];
  items: any[];
  filteringProperties?: {
    propertyKey: string;
    filteringOption: {
      key: string;
      value: string;
      operator: string;
    }
  }[];
}

const BaseTable: React.FC<BaseTableProps> = ({ 
  title, 
  columnDefinitions, 
  items,
  filteringProperties = [] 
}) => {
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [filteringText, setFilteringText] = useState("");
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortingColumn, setSortingColumn] = useState<Column | null>(null);
  const [sortingDescending, setSortingDescending] = useState(false);
  const [filteredItems, setFilteredItems] = useState(items);

  // Update filtered items when the filter text changes
  useEffect(() => {
    let newItems = [...items];

    // Text filtering
    if (filteringText) {
      const lowerCaseFilteringText = filteringText.toLowerCase();
      newItems = newItems.filter(item => {
        return Object.values(item).some(value => 
          value && String(value).toLowerCase().includes(lowerCaseFilteringText)
        );
      });
    }

    // Sorting
    if (sortingColumn && sortingColumn.sortingField) {
      newItems.sort((a, b) => {
        const valA = a[sortingColumn.sortingField!];
        const valB = b[sortingColumn.sortingField!];
        if (valA < valB) return sortingDescending ? 1 : -1;
        if (valA > valB) return sortingDescending ? -1 : 1;
        return 0;
      });
    }

    setFilteredItems(newItems);
    setCurrentPageIndex(1); // Reset to first page on filter change
  }, [filteringText, items, sortingColumn, sortingDescending]);

  // Calculate pagination
  const paginatedItems = filteredItems.slice(
    (currentPageIndex - 1) * pageSize,
    currentPageIndex * pageSize
  );

  return (
    <Table
      columnDefinitions={columnDefinitions}
      items={paginatedItems}
      selectedItems={selectedItems}
      onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
      ariaLabels={{
        selectionGroupLabel: "Selection group",
        allItemsSelectionLabel: ({ selectedItems }) =>
          `${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'} selected`,
        itemSelectionLabel: ({ selectedItems }, item) =>
          `${item.id} is ${selectedItems.indexOf(item) >= 0 ? '' : 'not '}selected`,
      }}
      selectionType="single"
      header={
        <Header
          counter={`(${filteredItems.length})`}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button>Refresh</Button>
            </SpaceBetween>
          }
        >
          {title}
        </Header>
      }
      filter={
        <SpaceBetween direction="vertical" size="xs">
          <TextFilter
            filteringText={filteringText}
            filteringPlaceholder="Find items"
            onChange={({ detail }) => setFilteringText(detail.filteringText)}
          />
          {/* Property filter removed to fix rendering issue */}
        </SpaceBetween>
      }
      pagination={
        <Pagination
          currentPageIndex={currentPageIndex}
          onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
          pagesCount={Math.ceil(filteredItems.length / pageSize)}
        />
      }
      preferences={
        <CollectionPreferences
          title="Preferences"
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          onConfirm={({ detail }) => setPageSize(detail.pageSize || 10)}
          preferences={{
            pageSize,
          }}
          pageSizePreference={{
            title: "Page size",
            options: [
              { value: 10, label: "10 items" },
              { value: 20, label: "20 items" },
              { value: 50, label: "50 items" },
            ],
          }}
        />
      }
      sortingColumn={sortingColumn}
      sortingDescending={sortingDescending}
      onSortingChange={({ detail }) => {
        setSortingColumn(detail.sortingColumn);
        setSortingDescending(detail.isDescending);
      }}
    />
  );
};

export default BaseTable;