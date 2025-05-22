// Type definitions for Cloudscape components
import '@cloudscape-design/components';

declare module '@cloudscape-design/components' {
  export interface Column {
    id: string;
    header: any;
    cell: any;
    [key: string]: any;
  }

  export interface SortingColumn<T = any> {
    sortingField?: keyof T;
    sortingDirection?: 'ascending' | 'descending';
    [key: string]: any;
  }

  export enum Type {
    success = 'success',
    error = 'error',
    warning = 'warning',
    info = 'info'
  }
}

// This ensures the type augmentation is properly processed
export {};