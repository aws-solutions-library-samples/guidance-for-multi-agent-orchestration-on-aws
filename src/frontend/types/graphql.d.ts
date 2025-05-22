// Fix for incompatible GraphQL Location types
import * as graphql from 'graphql';

declare module 'graphql/language/ast' {
  interface Location {
    toJSON(): { start: number; end: number };
  }
}

// This ensures the type augmentation is properly processed
export {};